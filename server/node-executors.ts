/**
 * Node execution handlers - each node type has its own execution logic
 * Production-grade implementations with proper error handling
 */

import vm from "vm";
import type { WorkflowNode } from "@shared/schema";
import { decrypt } from "./crypto";
import { storage } from "./storage";
import { refreshGmailToken, sendGmailWithOAuth } from "./oauth";

export type NodeExecutionContext = Record<string, any>;

/**
 * Resolve template variables in node data
 * Supports: {{node-id.field}} or {{node-id.nested.field}}
 */
export function resolveTemplateVariables(
  value: any,
  context: NodeExecutionContext
): any {
  if (typeof value === "string") {
    return value.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
      const [nodeId, ...fieldParts] = path.split(".");
      let current = context[nodeId];

      for (const part of fieldParts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          return match; // Leave unresolved
        }
      }

      return typeof current === "string"
        ? current
        : JSON.stringify(current);
    });
  } else if (Array.isArray(value)) {
    return value.map((v) =>
      resolveTemplateVariables(v, context)
    );
  } else if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = resolveTemplateVariables(value[key], context);
    }
    return result;
  }
  return value;
}

/**
 * Execute a webhook node - returns trigger data if available
 */
export async function executeWebhook(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
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

/**
 * Execute an HTTP request node with proper error handling
 */
export async function executeHttpRequest(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
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

/**
 * Execute a code/JavaScript node with proper async handling
 */
export async function executeCode(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
  const resolvedData = resolveTemplateVariables(node.data, context);
  const code = resolvedData.code;

  if (!code) {
    throw new Error(`[code] Missing required field: code`);
  }

  // Create a safe sandbox with access to context and utilities
  const sandbox = {
    // Context data from previous nodes
    $inputs: context,

    // Utilities
    $utils: {
      sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
      format: (str: string, ...args: any[]) =>
        str.replace(/{}/g, () => JSON.stringify(args.shift())),
    },

    // Console for logging
    console: {
      log: (...args: any[]) =>
        console.log(`[${node.id}]`, ...args),
      error: (...args: any[]) =>
        console.error(`[${node.id}]`, ...args),
      warn: (...args: any[]) =>
        console.warn(`[${node.id}]`, ...args),
    },

    // Result placeholder
    $result: undefined as any,
  };

  const vmContext = vm.createContext(sandbox, {
    name: `node-${node.id}`,
  });

  // Wrap code in async IIFE to support await
  const wrappedCode = `
(async function() {
  try {
    ${code}
  } catch (err) {
    throw new Error("Code execution error: " + (err?.message || String(err)));
  }
})().then(r => $result = r)
`;

  try {
    const script = new vm.Script(wrappedCode, {
      filename: `node-${node.id}.js`,
    });

    script.runInContext(vmContext, {
      timeout: 30000, // 30 second timeout
      displayErrors: true,
    });

    // Wait for async code to complete
    await new Promise<void>((resolve, reject) => {
      let resolved = false;

      const checkResult = setInterval(() => {
        if (sandbox.$result !== undefined || resolved) {
          clearInterval(checkResult);
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      }, 10);

      // Failsafe timeout
      setTimeout(() => {
        clearInterval(checkResult);
        if (!resolved) {
          resolved = true;
          reject(new Error("Code execution timeout"));
        }
      }, 35000);
    });

    return sandbox.$result;
  } catch (err) {
    throw new Error(
      `[code] Execution failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Execute an AI chat node (Claude)
 */
export async function executeAiChat(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
    throw new Error(`[ai-chat] API error ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as any;

  return {
    text: result.content[0]?.text || "",
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Execute a database node
 */
export async function executeDatabase(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
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

/**
 * Execute an email node with OAuth or SMTP
 */
export async function executeEmail(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
  const resolvedData = resolveTemplateVariables(node.data, context);
  const to = resolvedData.to;
  const subject = resolvedData.subject;
  const body = resolvedData.body;
  const credentialId = resolvedData.credentialId; // Reference to stored credential

  if (!to) {
    throw new Error(`[email] Missing required field: to`);
  }
  if (!subject) {
    throw new Error(`[email] Missing required field: subject`);
  }
  if (!body) {
    throw new Error(`[email] Missing required field: body`);
  }

  // Try OAuth first if credentialId is provided
  if (credentialId) {
    const credential = await storage.getCredential(credentialId);
    if (!credential) {
      throw new Error(`[email] Credential not found: ${credentialId}`);
    }

    const decrypted = decrypt(credential.data as string);

    if (credential.type === "gmail-oauth") {
      try {
        let tokens = decrypted.tokens;

        // Refresh token if expired
        if (tokens.expiresAt < Date.now()) {
          tokens = await refreshGmailToken(
            tokens.refreshToken,
            decrypted.clientId,
            decrypted.clientSecret
          );

          // Update stored tokens (optional - can cache in memory)
          await storage.updateCredential(credentialId, {
            data: JSON.stringify({ ...decrypted, tokens }),
          });
        }

        const result = await sendGmailWithOAuth(
          to,
          subject,
          body,
          tokens.accessToken,
          decrypted.email
        );

        return {
          messageId: result.messageId,
          sent: true,
          provider: "gmail-oauth",
        };
      } catch (err) {
        throw new Error(
          `[email] Gmail OAuth send failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // Fallback to SMTP
  let nodemailer: any;
  try {
    // @ts-ignore - nodemailer is optional dependency
    nodemailer = await import("nodemailer");
  } catch {
    throw new Error(
      `[email] nodemailer not installed and no OAuth credential provided`
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
      `[email] Missing SMTP configuration (host, user, pass) and no OAuth credential`
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
    sent: true,
    provider: "smtp",
  };
}

/**
 * Generic node executor that dispatches to type-specific handlers
 */
export async function executeNode(
  node: WorkflowNode,
  context: NodeExecutionContext
): Promise<any> {
  const nodeType = node.type;

  switch (nodeType) {
    case "webhook":
      return await executeWebhook(node, context);

    case "http-request":
      return await executeHttpRequest(node, context);

    case "code":
      return await executeCode(node, context);

    case "ai-chat":
      return await executeAiChat(node, context);

    case "database":
      return await executeDatabase(node, context);

    case "email":
      return await executeEmail(node, context);

    default:
      console.warn(`[executor] Unknown node type: ${nodeType}`);
      return { ...node.data, executed: true, nodeType };
  }
}
