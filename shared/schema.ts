import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// === TABLE DEFINITIONS ===

export const workflows = pgTable('workflows', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description').default(''),
    isActive: boolean('is_active').default(false),
    nodes: jsonb('nodes').default([]).notNull(), // Stores the visual node configuration
    edges: jsonb('edges').default([]).notNull(), // Stores the visual connection configuration
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const executions = pgTable('executions', {
    id: serial('id').primaryKey(),
    workflowId: integer('workflow_id')
        .references(() => workflows.id)
        .notNull(),
    status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed'
    startedAt: timestamp('started_at').defaultNow(),
    finishedAt: timestamp('finished_at'),
    error: text('error'),
});

export const executionNodes = pgTable('execution_nodes', {
    id: serial('id').primaryKey(),
    executionId: integer('execution_id')
        .references(() => executions.id, { onDelete: 'cascade' })
        .notNull(),
    nodeId: text('node_id').notNull(), // References the workflow node ID
    status: text('status').notNull(), // 'pending', 'running', 'success', 'error', 'skipped'
    output: jsonb('output'), // Node execution output (potentially large JSON)
    error: text('error'),
    startedAt: timestamp('started_at').defaultNow(),
    finishedAt: timestamp('finished_at'),
});

export const credentials = pgTable('credentials', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name'),
    type: text('type').notNull(), // 'openai', 'postgres', 'github', etc.
    data: jsonb('data').notNull(), // Encrypted/stored credential details
    createdAt: timestamp('created_at').defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    name: text('name').notNull(),
    key: text('key').notNull().unique(), // The actual API key (hashed)
    keyPrefix: text('key_prefix').notNull(), // First 8 chars for display (e.g., "hc_12345...")
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const userSettings = pgTable('user_settings', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().unique(), // Clerk user ID
    webhookSecret: text('webhook_secret').notNull(),
    defaultTimeout: integer('default_timeout').default(30), // seconds
    defaultRetryAttempts: integer('default_retry_attempts').default(0),
    defaultRetryDelay: integer('default_retry_delay').default(1000), // milliseconds
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// === RELATIONS ===
export const workflowsRelations = relations(workflows, ({ many }) => ({
    executions: many(executions),
}));

export const executionsRelations = relations(executions, ({ one, many }) => ({
    workflow: one(workflows, {
        fields: [executions.workflowId],
        references: [workflows.id],
    }),
    nodes: many(executionNodes),
}));

export const executionNodesRelations = relations(executionNodes, ({ one }) => ({
    execution: one(executions, {
        fields: [executionNodes.executionId],
        references: [executions.id],
    }),
}));

// === BASE SCHEMAS ===
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExecutionSchema = createInsertSchema(executions).omit({
    id: true,
    startedAt: true,
    finishedAt: true,
});
export const updateExecutionSchema = createInsertSchema(executions)
    .omit({ id: true, workflowId: true, startedAt: true })
    .partial();
export const insertExecutionNodeSchema = createInsertSchema(executionNodes).omit({
    id: true,
    startedAt: true,
    finishedAt: true,
});
export const insertCredentialSchema = createInsertSchema(credentials).omit({ id: true, createdAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, lastUsedAt: true });
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true, createdAt: true, updatedAt: true });

// === EXPLICIT API CONTRACT TYPES ===

// Workflow Types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type CreateWorkflowRequest = Omit<InsertWorkflow, 'userId'>;
export type UpdateWorkflowRequest = Partial<Omit<InsertWorkflow, 'userId'>>;

// Execution Types
export type Execution = typeof executions.$inferSelect;
export type ExecutionWithName = Execution & { name: string };
export type InsertExecution = z.infer<typeof insertExecutionSchema>;

// Execution Node Types
export type ExecutionNode = typeof executionNodes.$inferSelect;
export type InsertExecutionNode = z.infer<typeof insertExecutionNodeSchema>;

// Credential Types
export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

// API Key Types
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// User Settings Types
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Node Types (Frontend/Backend shared structure)
export interface WorkflowNode {
    id: string;
    type: string; // 'webhook', 'http-request', 'code', 'ai-chat', etc.
    position: { x: number; y: number };
    data: Record<string, any>; // Node specific configuration
}

export const supportedNodeTypes = [
    'webhook',
    'http-request',
    'code',
    'ai-chat',
    'database',
    'email',
    'slack',
    'google-drive',
    'google-sheets',
] as const;

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = z.string().trim().optional();

const webhookNodeDataSchema = z.object({
    method: optionalNonEmptyString,
    path: optionalNonEmptyString,
    label: optionalNonEmptyString,
});

const httpRequestNodeDataSchema = z.object({
    url: nonEmptyString,
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional(),
    label: optionalNonEmptyString,
});

const codeNodeDataSchema = z.object({
    code: nonEmptyString,
    label: optionalNonEmptyString,
});

const aiChatNodeDataSchema = z
    .object({
        prompt: z.string().optional(),
        systemPrompt: z.string().optional(),
        model: optionalNonEmptyString,
        label: optionalNonEmptyString,
    })
    .refine((data) => Boolean(data.prompt?.trim() || data.systemPrompt?.trim()), {
        message: 'at least one of prompt or systemPrompt is required',
    });

const databaseNodeDataSchema = z.object({
    connectionString: nonEmptyString,
    query: nonEmptyString,
    label: optionalNonEmptyString,
});

const emailNodeDataSchema = z.object({
    provider: z.enum(['gmail-oauth', 'smtp']).optional(),
    credentialId: z.number().int().positive().optional(),
    to: nonEmptyString,
    subject: nonEmptyString,
    body: nonEmptyString,
    host: optionalNonEmptyString,
    port: z.union([z.string(), z.number()]).optional(),
    user: optionalNonEmptyString,
    pass: optionalNonEmptyString,
    from: optionalNonEmptyString,
    label: optionalNonEmptyString,
});

const slackNodeDataSchema = z.object({
    credentialId: z.number().int().positive(),
    channel: nonEmptyString,
    text: nonEmptyString,
    label: optionalNonEmptyString,
});

const googleDriveNodeDataSchema = z
    .object({
        credentialId: z.number().int().positive(),
        operation: z.enum(['list', 'get', 'upload']).optional(),
        query: optionalNonEmptyString,
        pageSize: z.number().int().positive().max(1000).optional(),
        fileId: optionalNonEmptyString,
        fileName: optionalNonEmptyString,
        content: z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional(),
        mimeType: optionalNonEmptyString,
        folderId: optionalNonEmptyString,
        label: optionalNonEmptyString,
    })
    .superRefine((data, ctx) => {
        if (data.operation === 'get' && !data.fileId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'fileId is required for get operation', path: ['fileId'] });
        }
        if (data.operation === 'upload' && !data.fileName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'fileName is required for upload operation',
                path: ['fileName'],
            });
        }
        if (data.operation === 'upload' && (data.content === undefined || data.content === null || data.content === '')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'content is required for upload operation',
                path: ['content'],
            });
        }
    });

const googleSheetsNodeDataSchema = z
    .object({
        credentialId: z.number().int().positive(),
        operation: z.enum(['read', 'append', 'update']).optional(),
        spreadsheetId: nonEmptyString,
        range: optionalNonEmptyString,
        values: z.union([z.string(), z.array(z.array(z.any()))]).optional(),
        label: optionalNonEmptyString,
    })
    .superRefine((data, ctx) => {
        if ((data.operation === 'append' || data.operation === 'update') && !data.values) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'values is required for append/update operation',
                path: ['values'],
            });
        }
    });

export const workflowNodeSchema = z.discriminatedUnion('type', [
    z.object({
        id: nonEmptyString,
        type: z.literal('webhook'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: webhookNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('http-request'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: httpRequestNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('code'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: codeNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('ai-chat'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: aiChatNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('database'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: databaseNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('email'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: emailNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('slack'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: slackNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('google-drive'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: googleDriveNodeDataSchema,
    }),
    z.object({
        id: nonEmptyString,
        type: z.literal('google-sheets'),
        position: z.object({ x: z.number(), y: z.number() }),
        data: googleSheetsNodeDataSchema,
    }),
]);

export const workflowNodesSchema = z.array(workflowNodeSchema);

export function validateWorkflowNode(node: WorkflowNode): { ok: true } | { ok: false; message: string } {
    const parsed = workflowNodeSchema.safeParse(node);
    if (parsed.success) {
        return { ok: true };
    }
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message || 'Invalid node configuration' };
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface NodeProgress {
    nodeId: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
    output?: any;
    error?: string;
    startedAt?: string;
    finishedAt?: string;
}

export interface ExecutionProgress {
    executionId: number;
    workflowId: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    nodes: NodeProgress[];
    error?: string;
}

// API Response Types for production-grade queries
export interface ExecutionListItem {
    id: number;
    workflowId: number;
    status: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    error: string | null;
    name?: string; // From workflow join
}

export interface ExecutionDetail {
    execution: Execution;
    nodes: ExecutionNode[];
}

export * from './models/chat';
