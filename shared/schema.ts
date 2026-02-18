
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  isActive: boolean("is_active").default(false),
  nodes: jsonb("nodes").default([]).notNull(), // Stores the visual node configuration
  edges: jsonb("edges").default([]).notNull(), // Stores the visual connection configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const executions = pgTable("executions", {
  id: serial("id").primaryKey(),  
  workflowId: integer("workflow_id").references(() => workflows.id).notNull(),
  status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed'
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  data: jsonb("data"), // Stores execution results/context
  error: text("error"),
});

export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  name: text("name"),
  type: text("type").notNull(), // 'openai', 'postgres', 'github', etc.
  data: jsonb("data").notNull(), // Encrypted/stored credential details
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const workflowsRelations = relations(workflows, ({ many }) => ({
  executions: many(executions),
}));

export const executionsRelations = relations(executions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExecutionSchema = createInsertSchema(executions).omit({ id: true, startedAt: true, finishedAt: true });
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

export * from "./models/chat";
