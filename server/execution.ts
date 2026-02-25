import vm from "vm";
import type { Workflow, WorkflowNode, WorkflowEdge } from "@shared/schema";
import { storage } from "./storage";

// ─── Types ─────────────────────────────────────────────────────────────────

export type NodeStatus = "pending" | "running" | "success" | "error" | "skipped";
export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface NodeProgress {
  nodeId: string;
  status: NodeStatus;
  output?: any;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface ExecutionProgress {
  executionId: number;
  workflowId: number;
  status: ExecutionStatus;
  nodes: NodeProgress[];
  error?: string;
}

export type SSEWriter = (data: string) => void;

// ─── SSE Listener Management ────────────────────────────────────────────────

const sseListeners = new Map<number, Set<SSEWriter>>();

export function registerSSEListener(executionId: number, writer: SSEWriter): void {
  if (!sseListeners.has(executionId)) {
    sseListeners.set(executionId, new Set());
  }
  sseListeners.get(executionId)!.add(writer);
}

export function unregisterSSEListener(executionId: number, writer: SSEWriter): void {
  const listeners = sseListeners.get(executionId);
  if (listeners) {
    listeners.delete(writer);
    if (listeners.size === 0) {
      sseListeners.delete(executionId);
    }
  }
}

function emit(progress: ExecutionProgress): void {
  const listeners = sseListeners.get(progress.executionId);
  if (listeners) {
    const data = `data: ${JSON.stringify(progress)}\n\n`;
    listeners.forEach((writer) => {
      try {
        writer(data);
      } catch (err) {
        console.error(`[executor] Error writing SSE for execution ${progress.executionId}:`, err);
      }
    });
  }
}

// ─── Template Variable Resolution ──────────────────────────────────────────

function resolveTemplateVariables(
  value: any,
  context: Record<string, any>
): any {
  if (typeof value === "string") {
    return value.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
      const parts = path.split(".");
      let current = context;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          return match; // Leave unresolved
        }
      }
      return typeof current === "string" ? current : JSON.stringify(current);
    });
  } else if (Array.isArray(value)) {
    return value.map((v) => resolveTemplateVariables(v, context));
  } else if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = resolveTemplateVariables(value[key], context);
    }
    return result;
  }
  return value;
}

// ─── Node Executors ────────────────────────────────────────────────────────

async function executeNode(
  node: WorkflowNode,
  context: Record<string, any>
): Promise<any> {
  const nodeType = node.type;

  switch (nodeType) {
    case "webhook": {
      // Return trigger data if already seeded, otherwise return mock
      if (context[node.id]) {
        return context[node.id];
      }
      return {
        received: true,
        timestamp: new Date().toISOString(),
        body: {},
        headers: {},
        query: {},
      };
    }

    case "http-request": {
      const resolvedData = resolveTemplateVariables(node.data, context);
      const url = resolvedData.url;

      if (!url) {
        throw new Error(`[http-request] Missing required field: url`);
      }

      const method = resolvedData.method || "GET";
      const headers = resolvedData.headers || {};
      const body = resolvedData.body;

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (!["GET", "HEAD"].includes(method) && body) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get("Content-Type") || "";
      let responseBody: any;

      if (contentType.includes("application/json")) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers),
        body: responseBody,
        ok: response.ok,
      };
    }

    case "code": {
      const resolvedData = resolveTemplateVariables(node.data, context);
      const code = resolvedData.code;

      if (!code) {
        throw new Error(`[code] Missing required field: code`);
      }

      const items = Object.entries(context).map(([nodeId, json]) => ({
        nodeId,
        json,
      }));

      const sandbox = {
        items,
        $node: node.data,
        $env: process.env,
        console: {
          log: (...args: any[]) =>
            console.log(`[${node.id}]`, ...args),
          error: (...args: any[]) =>
            console.error(`[${node.id}]`, ...args),
        },
        result: undefined as any,
      };

      const context_ = vm.createContext(sandbox);
      const wrappedCode = `(async function() {\n${code}\n})().then(r => result = r)`;

      try {
        const script = new vm.Script(wrappedCode);
        script.runInContext(context_, { timeout: 10000 });

        // Wait a short tick for async resolution
        await new Promise((resolve) => setTimeout(resolve, 50));

        return { result: sandbox.result };
      } catch (err) {
        throw new Error(
          `[code] Execution error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    case "ai-chat": {
      const resolvedData = resolveTemplateVariables(node.data, context);
      const prompt = resolvedData.prompt;
      const systemPrompt = resolvedData.systemPrompt;

      if (!prompt && !systemPrompt) {
        throw new Error(
          `[ai-chat] Missing required fields: at least one of prompt or systemPrompt`
        );
      }

      const model = resolvedData.model || "claude-haiku-4-5-20251001";
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error(`[ai-chat] Missing ANTHROPIC_API_KEY environment variable`);
      }

      const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";

      const payload = {
        model,
        max_tokens: 2048,
        ...(systemPrompt && { system: systemPrompt }),
        messages: [
          {
            role: "user" as const,
            content: prompt || "",
          },
        ],
      };

      const response = await fetch(`${baseURL}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `[ai-chat] API error ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();

      return {
        text: result.content[0]?.text || "",
        model: result.model,
        usage: result.usage,
      };
    }

    case "database": {
      const resolvedData = resolveTemplateVariables(node.data, context);
      const connectionString = resolvedData.connectionString;
      const query = resolvedData.query;

      if (!connectionString) {
        throw new Error(`[database] Missing required field: connectionString`);
      }
      if (!query) {
        throw new Error(`[database] Missing required field: query`);
      }

      const { Client } = await import("pg");
      const client = new Client({ connectionString });

      try {
        await client.connect();
        const result = await client.query(query);
        return {
          rows: result.rows,
          rowCount: result.rowCount,
          fields: result.fields.map((f: any) => f.name),
        };
      } finally {
        await client.end();
      }
    }

    case "email": {
      const resolvedData = resolveTemplateVariables(node.data, context);
      const to = resolvedData.to;
      const subject = resolvedData.subject;
      const body = resolvedData.body;

      if (!to) {
        throw new Error(`[email] Missing required field: to`);
      }
      if (!subject) {
        throw new Error(`[email] Missing required field: subject`);
      }
      if (!body) {
        throw new Error(`[email] Missing required field: body`);
      }

      let nodemailer: any;
      try {
        // @ts-ignore - nodemailer is optional dependency
        nodemailer = await import("nodemailer");
      } catch (err) {
        throw new Error(
          `[email] nodemailer module not installed. Please install it to use email nodes.`
        );
      }

      const smtpHost = resolvedData.host || process.env.SMTP_HOST;
      const smtpPort =
        parseInt(resolvedData.port || process.env.SMTP_PORT || "587", 10);
      const smtpUser = resolvedData.user || process.env.SMTP_USER;
      const smtpPass = resolvedData.pass || process.env.SMTP_PASS;
      const smtpFrom = resolvedData.from || process.env.SMTP_FROM || smtpUser;

      if (!smtpHost || !smtpUser || !smtpPass) {
        throw new Error(
          `[email] Missing SMTP configuration (host, user, pass)`
        );
      }

      const transporter = (nodemailer as any).default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: body,
      });

      return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    }

    default: {
      console.warn(`[executor] Unknown node type: ${nodeType}`);
      return { ...node.data, executed: true };
    }
  }
}

// ─── Input Validation ──────────────────────────────────────────────────

function validateNodeInputs(node: WorkflowNode): string | null {
  const data = node.data || {};

  switch (node.type) {
    case "http-request":
      if (!data.url) return `[${node.id}] Missing required field: url`;
      break;
    case "code":
      if (!data.code) return `[${node.id}] Missing required field: code`;
      break;
    case "ai-chat":
      if (!data.prompt && !data.systemPrompt) {
        return `[${node.id}] Missing required field: at least one of prompt or systemPrompt`;
      }
      break;
    case "database":
      if (!data.connectionString) return `[${node.id}] Missing required field: connectionString`;
      if (!data.query) return `[${node.id}] Missing required field: query`;
      break;
    case "email":
      if (!data.to) return `[${node.id}] Missing required field: to`;
      if (!data.subject) return `[${node.id}] Missing required field: subject`;
      if (!data.body) return `[${node.id}] Missing required field: body`;
      break;
  }
  return null;
}

// ─── Graph Utilities ──────────────────────────────────────────────────────

function buildGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): {
  adj: Record<string, string[]>;
  nodeMap: Record<string, WorkflowNode>;
  inDegree: Record<string, number>;
} {
  const adj: Record<string, string[]> = {};
  const nodeMap: Record<string, WorkflowNode> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach((node) => {
    adj[node.id] = [];
    nodeMap[node.id] = node;
    inDegree[node.id] = 0;
  });

  edges.forEach((edge) => {
    adj[edge.source]?.push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  return { adj, nodeMap, inDegree };
}

function getParents(edges: WorkflowEdge[], targetId: string): string[] {
  return edges.filter((e) => e.target === targetId).map((e) => e.source);
}

// ─── Main Execution Engine ─────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: Workflow,
  executionId: number,
  triggerData?: any
): Promise<void> {
  console.log(`[executor] Starting execution ${executionId} for workflow ${workflow.id}`);

  try {
    const nodes = (workflow.nodes || []) as WorkflowNode[];
    const edges = (workflow.edges || []) as WorkflowEdge[];

    // ─── Validate all node inputs before execution ──────
    for (const node of nodes) {
      const validationError = validateNodeInputs(node);
      if (validationError) {
        const errorMsg = `Validation error: ${validationError}`;
        console.error(`[executor] ${errorMsg}`);
        await storage.updateExecution(executionId, {
          status: "failed",
          error: errorMsg,
        });

        const progress: ExecutionProgress = {
          executionId,
          workflowId: workflow.id,
          status: "failed",
          nodes: nodes.map((n) => ({
            nodeId: n.id,
            status: "pending" as NodeStatus,
          })),
          error: errorMsg,
        };
        emit(progress);
        return;
      }
    }

    const { adj, nodeMap, inDegree } = buildGraph(nodes, edges);

    // Find start nodes (in-degree === 0)
    const startNodes = nodes.filter((n) => inDegree[n.id] === 0);

    // Initialize node progress
    const nodeProgress: Record<string, NodeProgress> = {};
    nodes.forEach((node) => {
      nodeProgress[node.id] = {
        nodeId: node.id,
        status: "pending",
      };
    });

    // Helper to broadcast progress
    const broadcastProgress = (
      status: ExecutionStatus,
      error?: string
    ): void => {
      const progress: ExecutionProgress = {
        executionId,
        workflowId: workflow.id,
        status,
        nodes: Object.values(nodeProgress),
        ...(error && { error }),
      };
      emit(progress);
    };

    // Mark all downstream nodes as skipped recursively
    const markDownstreamSkipped = (nodeId: string): void => {
      const neighbors = adj[nodeId] || [];
      neighbors.forEach((neighborId) => {
        if (nodeProgress[neighborId].status === "pending") {
          nodeProgress[neighborId] = {
            nodeId: neighborId,
            status: "skipped",
          };
          markDownstreamSkipped(neighborId);
        }
      });
    };

    // Update execution status
    await storage.updateExecution(executionId, { status: "running" });
    broadcastProgress("running");

    // Initialize context
    let context: Record<string, any> = {};

    // Seed trigger data if provided
    if (triggerData !== undefined) {
      startNodes.forEach((node) => {
        if (node.type === "webhook") {
          context[node.id] = triggerData;
        }
      });
    }

    // BFS traversal
    const queue: WorkflowNode[] = [...startNodes];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNode = queue.shift()!;

      // Skip if already visited
      if (visited.has(currentNode.id)) {
        continue;
      }

      // Mark as running
      nodeProgress[currentNode.id] = {
        nodeId: currentNode.id,
        status: "running",
        startedAt: new Date().toISOString(),
      };
      broadcastProgress("running");

      try {
        // Execute node
        const output = await executeNode(currentNode, context);
        context[currentNode.id] = output;

        // Mark as success
        nodeProgress[currentNode.id] = {
          nodeId: currentNode.id,
          status: "success",
          output,
          startedAt: nodeProgress[currentNode.id].startedAt,
          finishedAt: new Date().toISOString(),
        };
      } catch (err) {
        // Mark as error
        const errorMessage =
          err instanceof Error ? err.message : String(err);
        nodeProgress[currentNode.id] = {
          nodeId: currentNode.id,
          status: "error",
          error: errorMessage,
          startedAt: nodeProgress[currentNode.id].startedAt,
          finishedAt: new Date().toISOString(),
        };

        // Mark all downstream nodes as skipped
        markDownstreamSkipped(currentNode.id);

        // Update execution and broadcast failure
        broadcastProgress("failed", errorMessage);
        await storage.updateExecution(executionId, {
          status: "failed",
          error: errorMessage,
          data: context,
        });

        console.error(
          `[executor] Execution ${executionId} failed at node ${currentNode.id}:`,
          errorMessage
        );
        return;
      }

      broadcastProgress("running");
      visited.add(currentNode.id);

      // Enqueue neighbors if all their parents are visited
      const neighbors = adj[currentNode.id] || [];
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          const neighborNode = nodeMap[neighborId];
          const parentIds = getParents(edges, neighborId);
          const allParentsVisited = parentIds.every((p) => visited.has(p));

          if (allParentsVisited) {
            queue.push(neighborNode);
          }
        }
      });
    }

    // Mark execution as completed
    broadcastProgress("completed");
    await storage.updateExecution(executionId, {
      status: "completed",
      data: context,
    });

    console.log(`[executor] Execution ${executionId} completed ✓`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[executor] Unexpected error in execution ${executionId}:`, err);

    try {
      await storage.updateExecution(executionId, {
        status: "failed",
        error: `Unexpected error: ${errorMessage}`,
      });

      const progress: ExecutionProgress = {
        executionId,
        workflowId: 0, // Unknown workflow in unexpected error
        status: "failed",
        nodes: [],
        error: errorMessage,
      };
      emit(progress);
    } catch (storageErr) {
      console.error(
        `[executor] Failed to update execution ${executionId} in storage:`,
        storageErr
      );
    }
  }
}
