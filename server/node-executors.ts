/**
 * Node execution handlers - each node type has its own execution logic
 * Production-grade implementations with proper error handling
 */

import vm from 'vm';
import type { WorkflowNode } from '@shared/schema';
import { decrypt } from './crypto';
import { storage } from './storage';
import {
    refreshGmailToken,
    refreshGoogleServiceToken,
    sendGmailWithOAuth,
    listDriveFiles,
    uploadDriveFile,
    getDriveFile,
    readSheetValues,
    appendSheetValues,
    updateSheetValues,
    sendSlackMessage,
} from './oauth';

export type NodeExecutionContext = Record<string, any>;
export interface RuntimeExecutionOptions {
    timeoutSeconds?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
    userId?: string;
}

const DEFAULT_TIMEOUT_SECONDS = 30;

function getRuntimeOptions(options?: RuntimeExecutionOptions) {
    return {
        timeoutSeconds: options?.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
        retryAttempts: options?.retryAttempts ?? 0,
        retryDelayMs: options?.retryDelayMs ?? 1000,
    };
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return msg.includes('429') || msg.includes('timed out') || msg.includes('timeout') || msg.includes('network');
}

async function runWithRetries<T>(
    operation: () => Promise<T>,
    options: RuntimeExecutionOptions | undefined,
    nodeType: string,
): Promise<T> {
    const { retryAttempts, retryDelayMs } = getRuntimeOptions(options);
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retryAttempts) {
        try {
            return await operation();
        } catch (err) {
            lastError = err;
            const canRetry = attempt < retryAttempts && isRetryableError(err);
            if (!canRetry) break;
            const backoff = retryDelayMs * Math.pow(2, attempt);
            console.warn(`[${nodeType}] Attempt ${attempt + 1} failed, retrying in ${backoff}ms`);
            await sleep(backoff);
            attempt += 1;
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`[${nodeType}] Operation failed`);
}

async function fetchWithPolicy(
    url: string,
    init: RequestInit,
    options: RuntimeExecutionOptions | undefined,
    nodeType: string,
): Promise<Response> {
    return await runWithRetries(async () => {
        const { timeoutSeconds } = getRuntimeOptions(options);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
            });
            if (!response.ok && [429, 500, 502, 503, 504].includes(response.status)) {
                throw new Error(`[${nodeType}] Retryable HTTP status: ${response.status}`);
            }
            return response;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new Error(`[${nodeType}] Request timed out after ${timeoutSeconds}s`);
            }
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    }, options, nodeType);
}

/**
 * Resolve template variables in node data
 * Supports: {{node-id.field}} or {{node-id.nested.field}}
 */
export function resolveTemplateVariables(value: any, context: NodeExecutionContext): any {
    if (typeof value === 'string') {
        return value.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
            const trimmed = String(path || '').trim();
            const [nodeId, ...fieldParts] = trimmed.split('.');
            let current = context[nodeId];

            for (const part of fieldParts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    return match; // Leave unresolved
                }
            }

            return typeof current === 'string' ? current : JSON.stringify(current);
        });
    } else if (Array.isArray(value)) {
        return value.map((v) => resolveTemplateVariables(v, context));
    } else if (value && typeof value === 'object') {
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
export async function executeWebhook(node: WorkflowNode, context: NodeExecutionContext): Promise<any> {
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
    context: NodeExecutionContext,
    options?: RuntimeExecutionOptions,
): Promise<any> {
    const resolvedData = resolveTemplateVariables(node.data, context);
    const url = resolvedData.url;

    if (!url) {
        throw new Error(`[http-request] Missing required field: url`);
    }

    const method = resolvedData.method || 'GET';
    const headers = resolvedData.headers || {};
    const body = resolvedData.body;

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (!['GET', 'HEAD'].includes(method) && body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetchWithPolicy(url, fetchOptions, options, 'http-request');
    const contentType = response.headers.get('Content-Type') || '';
    let responseBody: any;

    if (contentType.includes('application/json')) {
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
export async function executeCode(node: WorkflowNode, context: NodeExecutionContext): Promise<any> {
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
            format: (str: string, ...args: any[]) => str.replace(/{}/g, () => JSON.stringify(args.shift())),
        },

        // Console for logging
        console: {
            log: (...args: any[]) => console.log(`[${node.id}]`, ...args),
            error: (...args: any[]) => console.error(`[${node.id}]`, ...args),
            warn: (...args: any[]) => console.warn(`[${node.id}]`, ...args),
        },

        // Global functions available in browser
        fetch: globalThis.fetch as any,
        JSON: JSON,
        Math: Math,
        Date: Date,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,

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
                    reject(new Error('Code execution timeout'));
                }
            }, 35000);
        });

        return sandbox.$result;
    } catch (err) {
        throw new Error(`[code] Execution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Execute an AI chat node (Claude)
 */
export async function executeAiChat(
    node: WorkflowNode,
    context: NodeExecutionContext,
    options?: RuntimeExecutionOptions,
): Promise<any> {
    const resolvedData = resolveTemplateVariables(node.data, context);
    const prompt = resolvedData.prompt;
    const systemPrompt = resolvedData.systemPrompt;

    if (!prompt && !systemPrompt) {
        throw new Error(`[ai-chat] Missing required fields: at least one of prompt or systemPrompt`);
    }

    const model = resolvedData.model || 'claude-haiku-4-5-20251001';
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
                role: 'user' as const,
                content: prompt || '',
            },
        ],
    };

    const response = await fetchWithPolicy(
        'https://api.anthropic.com/v1/messages',
        {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        },
        options,
        'ai-chat',
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[ai-chat] API error ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as any;

    return {
        text: result.content[0]?.text || '',
        model: result.model,
        usage: result.usage,
    };
}

/**
 * Execute a database node
 */
export async function executeDatabase(node: WorkflowNode, context: NodeExecutionContext): Promise<any> {
    const resolvedData = resolveTemplateVariables(node.data, context);
    const connectionString = resolvedData.connectionString;
    const query = resolvedData.query;

    if (!connectionString) {
        throw new Error(`[database] Missing required field: connectionString`);
    }
    if (!query) {
        throw new Error(`[database] Missing required field: query`);
    }

    const { Client } = await import('pg');
    const client = new Client({ connectionString });

    try {
        await client.connect();
        const result = await client.query(query);
        const rows = result.rows;
        const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const emails = Array.isArray(rows)
            ? rows
                  .map((r: any) => (r && typeof r === 'object' ? r.email : undefined))
                  .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
                  .join(',')
            : '';
        const text = JSON.stringify(rows, null, 2);
        return {
            rows,
            rowCount: result.rowCount,
            fields: result.fields.map((f: any) => f.name),
            first,
            emails,
            text,
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
    context: NodeExecutionContext,
    options?: RuntimeExecutionOptions,
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
        if (!options?.userId) {
            throw new Error('[email] Missing execution user context');
        }
        const credential = await storage.getCredential(credentialId, options.userId);
        if (!credential) {
            throw new Error(`[email] Credential not found: ${credentialId}`);
        }

        const decrypted = decrypt(credential.data as string);

        if (credential.type === 'gmail-oauth') {
            try {
                let tokens = decrypted.tokens;

                // Refresh token if expired
                if (tokens.expiresAt < Date.now()) {
                    tokens = await refreshGmailToken(tokens.refreshToken, decrypted.clientId, decrypted.clientSecret);

                    // Update stored tokens (optional - can cache in memory)
                    await storage.updateCredential(credentialId, {
                        data: JSON.stringify({ ...decrypted, tokens }),
                    });
                }

                const result = await sendGmailWithOAuth(to, subject, body, tokens.accessToken, decrypted.email);

                return {
                    messageId: result.messageId,
                    sent: true,
                    provider: 'gmail-oauth',
                };
            } catch (err) {
                throw new Error(`[email] Gmail OAuth send failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }

    // Fallback to SMTP
    let nodemailer: any;
    try {
        // @ts-ignore - nodemailer is optional dependency
        nodemailer = await import('nodemailer');
    } catch {
        throw new Error(`[email] nodemailer not installed and no OAuth credential provided`);
    }

    const smtpHost = resolvedData.host || process.env.SMTP_HOST;
    const smtpPort = parseInt(resolvedData.port || process.env.SMTP_PORT || '587', 10);
    const smtpUser = resolvedData.user || process.env.SMTP_USER;
    const smtpPass = resolvedData.pass || process.env.SMTP_PASS;
    const smtpFrom = resolvedData.from || process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
        throw new Error(`[email] Missing SMTP configuration (host, user, pass) and no OAuth credential`);
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
        provider: 'smtp',
    };
}

/**
 * Helper: resolve and refresh a Google credential (Drive or Sheets)
 */
async function resolveGoogleCredentialForUser(
    credentialId: number,
    userId: string,
): Promise<{ accessToken: string; clientId: string; clientSecret: string }> {
    const credential = await storage.getCredential(credentialId, userId);
    if (!credential) throw new Error(`Credential not found: ${credentialId}`);
    const decrypted = decrypt(credential.data as string);
    let tokens = decrypted.tokens;
    if (tokens.expiresAt < Date.now()) {
        tokens = await refreshGoogleServiceToken(tokens.refreshToken, decrypted.clientId, decrypted.clientSecret);
        await storage.updateCredential(credentialId, {
            data: JSON.stringify({ ...decrypted, tokens }),
        });
    }
    return { accessToken: tokens.accessToken, clientId: decrypted.clientId, clientSecret: decrypted.clientSecret };
}

/**
 * Execute a Slack node — send a message to a channel
 */
export async function executeSlack(node: WorkflowNode, context: NodeExecutionContext): Promise<any> {
    const resolvedData = resolveTemplateVariables(node.data, context);
    const credentialId = resolvedData.credentialId;
    const channel = resolvedData.channel;
    const text = resolvedData.text;

    if (!credentialId) throw new Error('[slack] Missing required field: credentialId');
    if (!channel) throw new Error('[slack] Missing required field: channel');
    if (!text) throw new Error('[slack] Missing required field: text');

    const userId = context['$runtime']?.userId;
    if (!userId) throw new Error('[slack] Missing execution user context');
    const credential = await storage.getCredential(Number(credentialId), userId);
    if (!credential) throw new Error(`[slack] Credential not found: ${credentialId}`);
    const decrypted = decrypt(credential.data as string);

    const result = await sendSlackMessage(decrypted.accessToken, channel, text);
    return { ts: result.ts, channel: result.channel, sent: true };
}

/**
 * Execute a Google Drive node — list, get, or upload files
 */
export async function executeGoogleDrive(node: WorkflowNode, context: NodeExecutionContext): Promise<any> {
    const resolvedData = resolveTemplateVariables(node.data, context);
    const credentialId = resolvedData.credentialId;
    const operation = resolvedData.operation || 'list';

    if (!credentialId) throw new Error('[google-drive] Missing required field: credentialId');

    const userId = context['$runtime']?.userId;
    if (!userId) throw new Error('[google-drive] Missing execution user context');
    const { accessToken } = await resolveGoogleCredentialForUser(Number(credentialId), userId);

    switch (operation) {
        case 'list': {
            const result = await listDriveFiles(accessToken, resolvedData.query, resolvedData.pageSize);
            return { files: result.files, count: result.files.length };
        }
        case 'get': {
            if (!resolvedData.fileId) throw new Error('[google-drive] Missing required field: fileId for get operation');
            return await getDriveFile(accessToken, resolvedData.fileId);
        }
        case 'upload': {
            if (!resolvedData.fileName) throw new Error('[google-drive] Missing required field: fileName for upload operation');
            if (!resolvedData.content) throw new Error('[google-drive] Missing required field: content for upload operation');
            return await uploadDriveFile(
                accessToken,
                resolvedData.fileName,
                resolvedData.content,
                resolvedData.mimeType || 'text/plain',
                resolvedData.folderId,
            );
        }
        default:
            throw new Error(`[google-drive] Unknown operation: ${operation}`);
    }
}

/**
 * Execute a Google Sheets node — read, append, or update rows
 */
export async function executeGoogleSheets(node: WorkflowNode, context: NodeExecutionContext): Promise<any> {
    const resolvedData = resolveTemplateVariables(node.data, context);
    const credentialId = resolvedData.credentialId;
    const operation = resolvedData.operation || 'read';
    const spreadsheetId = resolvedData.spreadsheetId;
    const range = resolvedData.range || 'Sheet1';

    if (!credentialId) throw new Error('[google-sheets] Missing required field: credentialId');
    if (!spreadsheetId) throw new Error('[google-sheets] Missing required field: spreadsheetId');

    const userId = context['$runtime']?.userId;
    if (!userId) throw new Error('[google-sheets] Missing execution user context');
    const { accessToken } = await resolveGoogleCredentialForUser(Number(credentialId), userId);

    switch (operation) {
        case 'read': {
            const result = await readSheetValues(accessToken, spreadsheetId, range);
            const [headers, ...rows] = result.values;
            const objects = headers
                ? rows.map((row) => Object.fromEntries(headers.map((h: string, i: number) => [h, row[i] ?? ''])))
                : [];
            return { values: result.values, rows: objects, rowCount: rows.length };
        }
        case 'append': {
            let values: any[][];
            if (typeof resolvedData.values === 'string') {
                try { values = JSON.parse(resolvedData.values); } catch { values = [[resolvedData.values]]; }
            } else {
                values = resolvedData.values || [[]];
            }
            return await appendSheetValues(accessToken, spreadsheetId, range, values);
        }
        case 'update': {
            let values: any[][];
            if (typeof resolvedData.values === 'string') {
                try { values = JSON.parse(resolvedData.values); } catch { values = [[resolvedData.values]]; }
            } else {
                values = resolvedData.values || [[]];
            }
            return await updateSheetValues(accessToken, spreadsheetId, range, values);
        }
        default:
            throw new Error(`[google-sheets] Unknown operation: ${operation}`);
    }
}

/**
 * Generic node executor that dispatches to type-specific handlers
 */
export async function executeNode(
    node: WorkflowNode,
    context: NodeExecutionContext,
    options?: RuntimeExecutionOptions,
): Promise<any> {
    const nodeType = node.type;

    switch (nodeType) {
        case 'webhook':
            return await executeWebhook(node, context);

        case 'http-request':
            return await executeHttpRequest(node, context, options);

        case 'code':
            return await executeCode(node, context);

        case 'ai-chat':
            return await executeAiChat(node, context, options);

        case 'database':
            return await executeDatabase(node, context);

        case 'email':
            return await executeEmail(node, context, options);

        case 'slack':
            return await executeSlack(node, context);

        case 'google-drive':
            return await executeGoogleDrive(node, context);

        case 'google-sheets':
            return await executeGoogleSheets(node, context);

        default:
            console.warn(`[executor] Unknown node type: ${nodeType}`);
            return { ...node.data, executed: true, nodeType };
    }
}
