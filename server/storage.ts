
import { db } from "./db";
import {
  workflows,
  executions,
  credentials,
  type InsertWorkflow,
  type InsertExecution,
  type InsertCredential,
  type Workflow,
  type Execution,
  type Credential
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: number): Promise<Workflow | undefined>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: number, updates: Partial<InsertWorkflow>): Promise<Workflow>;
  deleteWorkflow(id: number): Promise<void>;

  // Executions
  getExecutions(workflowId?: number): Promise<Execution[]>;
  getExecution(id: number): Promise<Execution | undefined>;
  createExecution(execution: InsertExecution): Promise<Execution>;
  updateExecution(id: number, updates: Partial<InsertExecution>): Promise<Execution>;

  // Credentials
  getCredentials(): Promise<Credential[]>;
  createCredential(credential: InsertCredential): Promise<Credential>;
  deleteCredential(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    return await db.select().from(workflows).orderBy(desc(workflows.updatedAt));
  }

  async getWorkflow(id: number): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow;
  }

  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const [workflow] = await db.insert(workflows).values(insertWorkflow).returning();
    return workflow;
  }

  async updateWorkflow(id: number, updates: Partial<InsertWorkflow>): Promise<Workflow> {
    const [updated] = await db.update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflow(id: number): Promise<void> {
    await db.delete(workflows).where(eq(workflows.id, id));
  }

  // Executions
  async getExecutions(workflowId?: number): Promise<Execution[]> {
    if (workflowId) {
      return await db.select()
        .from(executions)
        .where(eq(executions.workflowId, workflowId))
        .orderBy(desc(executions.startedAt));
    }
    return await db.select().from(executions).orderBy(desc(executions.startedAt));
  }

  async getExecution(id: number): Promise<Execution | undefined> {
    const [execution] = await db.select().from(executions).where(eq(executions.id, id));
    return execution;
  }

  async createExecution(insertExecution: InsertExecution): Promise<Execution> {
    const [execution] = await db.insert(executions).values(insertExecution).returning();
    return execution;
  }

  async updateExecution(id: number, updates: Partial<InsertExecution>): Promise<Execution> {
    const [updated] = await db.update(executions)
      .set(updates)
      .where(eq(executions.id, id))
      .returning();
    return updated;
  }

  // Credentials
  async getCredentials(): Promise<Credential[]> {
    return await db.select().from(credentials).orderBy(desc(credentials.createdAt));
  }

  async createCredential(insertCredential: InsertCredential): Promise<Credential> {
    const [credential] = await db.insert(credentials).values(insertCredential).returning();
    return credential;
  }

  async deleteCredential(id: number): Promise<void> {
    await db.delete(credentials).where(eq(credentials.id, id));
  }
}

export const storage = new DatabaseStorage();
