import { db } from './db';
import {
    workflows,
    executions,
    executionNodes,
    credentials,
    apiKeys,
    userSettings,
    type InsertWorkflow,
    type InsertExecution,
    type InsertExecutionNode,
    type InsertCredential,
    type InsertApiKey,
    type InsertUserSettings,
    type Workflow,
    type Execution,
    type ExecutionNode,
    type Credential,
    type ApiKey,
    type UserSettings,
    type ExecutionListItem,
    type ExecutionDetail,
    updateExecutionSchema,
} from '@shared/schema';
import { exec } from 'child_process';
import { eq, desc, getTableColumns, lt, and } from 'drizzle-orm';
import { z } from 'zod';

type UpdateExecution = z.infer<typeof updateExecutionSchema>;

export interface IStorage {
    // Workflows
    getWorkflows(): Promise<Workflow[]>;
    getWorkflow(id: number): Promise<Workflow | undefined>;
    createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
    updateWorkflow(id: number, updates: Partial<InsertWorkflow>): Promise<Workflow>;
    deleteWorkflow(id: number): Promise<void>;

    // Executions - Production grade with column projection
    getExecutions(workflowId?: number, cursor?: number, limit?: number): Promise<ExecutionListItem[]>;
    getExecution(id: number): Promise<Execution | undefined>;
    getExecutionDetail(id: number): Promise<ExecutionDetail | undefined>;
    createExecution(execution: InsertExecution): Promise<Execution>;
    updateExecution(id: number, updates: UpdateExecution): Promise<Execution>;

    // Execution Nodes
    getExecutionNodes(executionId: number): Promise<ExecutionNode[]>;
    createExecutionNode(node: InsertExecutionNode): Promise<ExecutionNode>;
    updateExecutionNode(id: number, updates: Partial<InsertExecutionNode>): Promise<ExecutionNode>;

    // Credentials
    getCredentials(): Promise<Credential[]>;
    getCredential(id: number): Promise<Credential | undefined>;
    createCredential(credential: InsertCredential): Promise<Credential>;
    updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential>;
    deleteCredential(id: number): Promise<void>;

    // API Keys
    getApiKeys(userId: string): Promise<ApiKey[]>;
    getApiKey(id: number): Promise<ApiKey | undefined>;
    getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
    createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
    updateApiKeyLastUsed(id: number): Promise<void>;
    deleteApiKey(id: number): Promise<void>;

    // User Settings
    getUserSettings(userId: string): Promise<UserSettings | undefined>;
    createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
    updateUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings>;
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
        const [updated] = await db
            .update(workflows)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(workflows.id, id))
            .returning();
        return updated;
    }

    async deleteWorkflow(id: number): Promise<void> {
        await db.delete(executions).where(eq(executions.workflowId, id));
        await db.delete(workflows).where(eq(workflows.id, id));
    }

    // Executions - Production grade with column projection
    async getExecutions(workflowId?: number, cursor?: number, limit: number = 50): Promise<ExecutionListItem[]> {
        // Build conditions using and operator
        const conditions = [];
        
        if (workflowId) {
            conditions.push(eq(executions.workflowId, workflowId));
        }
        
        if (cursor) {
            conditions.push(lt(executions.id, cursor));
        }

        // Execute query with column projection to avoid loading large data
        const query = db
            .select({
                id: executions.id,
                workflowId: executions.workflowId,
                status: executions.status,
                startedAt: executions.startedAt,
                finishedAt: executions.finishedAt,
                error: executions.error,
                name: workflows.name,
            })
            .from(executions)
            .leftJoin(workflows, eq(executions.workflowId, workflows.id))
            .orderBy(desc(executions.id))
            .limit(Math.min(limit, 100)); // Safety limit

        // Apply conditions if any
        const finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;
        
        const results = await finalQuery;
        
        // Convert null name to undefined for type compatibility
        return results.map(result => ({
            ...result,
            name: result.name || undefined
        }));
    }

    async getExecution(id: number): Promise<Execution | undefined> {
        const [execution] = await db.select().from(executions).where(eq(executions.id, id));
        return execution;
    }

    async createExecution(insertExecution: InsertExecution): Promise<Execution> {
        const [execution] = await db.insert(executions).values(insertExecution).returning();
        return execution;
    }

    async updateExecution(id: number, updates: UpdateExecution): Promise<Execution> {
        const [updated] = await db.update(executions).set(updates).where(eq(executions.id, id)).returning();
        return updated;
    }

    // Execution Detail API - loads execution and nodes separately
    async getExecutionDetail(id: number): Promise<ExecutionDetail | undefined> {
        const execution = await this.getExecution(id);
        if (!execution) return undefined;

        const nodes = await this.getExecutionNodes(id);
        
        return {
            execution,
            nodes
        };
    }

    // Execution Nodes
    async getExecutionNodes(executionId: number): Promise<ExecutionNode[]> {
        return await db
            .select()
            .from(executionNodes)
            .where(eq(executionNodes.executionId, executionId))
            .orderBy(executionNodes.startedAt);
    }

    async createExecutionNode(node: InsertExecutionNode): Promise<ExecutionNode> {
        const [created] = await db.insert(executionNodes).values(node).returning();
        return created;
    }

    async updateExecutionNode(id: number, updates: Partial<Omit<InsertExecutionNode, 'id' | 'startedAt' | 'finishedAt'>> & { finishedAt?: Date }): Promise<ExecutionNode> {
        const [updated] = await db
            .update(executionNodes)
            .set(updates)
            .where(eq(executionNodes.id, id))
            .returning();
        return updated;
    }

    // Credentials
    async getCredentials(): Promise<Credential[]> {
        return await db.select().from(credentials).orderBy(desc(credentials.createdAt));
    }

    async getCredential(id: number): Promise<Credential | undefined> {
        const [credential] = await db.select().from(credentials).where(eq(credentials.id, id));
        return credential;
    }

    async createCredential(insertCredential: InsertCredential): Promise<Credential> {
        const [credential] = await db.insert(credentials).values(insertCredential).returning();
        return credential;
    }

    async updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential> {
        const [updated] = await db.update(credentials).set(updates).where(eq(credentials.id, id)).returning();
        return updated;
    }

    async deleteCredential(id: number): Promise<void> {
        await db.delete(credentials).where(eq(credentials.id, id));
    }

    // API Keys
    async getApiKeys(userId: string): Promise<ApiKey[]> {
        return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
    }

    async getApiKey(id: number): Promise<ApiKey | undefined> {
        const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
        return apiKey;
    }

    async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
        const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
        return apiKey;
    }

    async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
        const [apiKey] = await db.insert(apiKeys).values(insertApiKey).returning();
        return apiKey;
    }

    async updateApiKeyLastUsed(id: number): Promise<void> {
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
    }

    async deleteApiKey(id: number): Promise<void> {
        await db.delete(apiKeys).where(eq(apiKeys.id, id));
    }

    // User Settings
    async getUserSettings(userId: string): Promise<UserSettings | undefined> {
        const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
        return settings;
    }

    async createUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
        const [settings] = await db.insert(userSettings).values(insertSettings).returning();
        return settings;
    }

    async updateUserSettings(userId: string, updates: Partial<InsertUserSettings>): Promise<UserSettings> {
        const [updated] = await db
            .update(userSettings)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(userSettings.userId, userId))
            .returning();
        return updated;
    }
}

export const storage = new DatabaseStorage();
