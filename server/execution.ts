import type { Workflow, WorkflowNode, WorkflowEdge } from "@shared/schema";
import { storage } from "./storage";
import { executeNode } from "./node-executors";


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

    // Initialize context for data flow between nodes
    let context: Record<string, any> = {};

    // Seed trigger data if provided
    if (triggerData !== undefined) {
      startNodes.forEach((node) => {
        if (node.type === "webhook") {
          context[node.id] = triggerData;
        }
      });
    }

    // BFS traversal for proper dependency resolution
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
        // Execute node with context containing outputs from previous nodes
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
        workflowId: 0,
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
