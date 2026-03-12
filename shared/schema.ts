import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// === TABLE DEFINITIONS ===

export const workflows = pgTable('workflows', {
    id: serial('id').primaryKey(),
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
    name: text('name'),
    type: text('type').notNull(), // 'openai', 'postgres', 'github', etc.
    data: jsonb('data').notNull(), // Encrypted/stored credential details
    createdAt: timestamp('created_at').defaultNow(),
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

// === EXPLICIT API CONTRACT TYPES ===

// Workflow Types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type CreateWorkflowRequest = InsertWorkflow;
export type UpdateWorkflowRequest = Partial<InsertWorkflow>;

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

// Node Types (Frontend/Backend shared structure)
export interface WorkflowNode {
    id: string;
    type: string; // 'webhook', 'http-request', 'code', 'ai-chat', etc.
    position: { x: number; y: number };
    data: Record<string, any>; // Node specific configuration
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
