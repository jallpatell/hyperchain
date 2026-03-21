import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { api, buildUrl } from '@shared/routes';
import {
    type Workflow,
    type CreateWorkflowRequest,
    type UpdateWorkflowRequest,
    type WorkflowNode,
    type WorkflowEdge,
} from '@shared/schema';
import { authFetch } from '@/lib/auth-fetch';

// Helper to ensure type safety when transforming API responses
// Since schema defines nodes/edges as jsonb, we cast them on the client
export interface TypedWorkflow extends Omit<Workflow, 'nodes' | 'edges'> {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export function useWorkflows() {
    const { userId, isLoaded } = useAuth();
    return useQuery({
        queryKey: [api.workflows.list.path],
        queryFn: async () => {
            const res = await authFetch(api.workflows.list.path, {}, userId);
            if (!res.ok) throw new Error('Failed to fetch workflows');
            const data = await res.json();
            return api.workflows.list.responses[200].parse(data) as TypedWorkflow[];
        },
        enabled: isLoaded && !!userId,
    });
}

export function useWorkflow(id: number) {
    const { userId, isLoaded } = useAuth();
    return useQuery({
        queryKey: [api.workflows.get.path, id],
        queryFn: async () => {
            const url = buildUrl(api.workflows.get.path, { id });
            const res = await authFetch(url, {}, userId);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch workflow');
            const data = await res.json();
            return api.workflows.get.responses[200].parse(data) as TypedWorkflow;
        },
        enabled: !isNaN(id) && isLoaded && !!userId,
    });
}

export function useCreateWorkflow() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateWorkflowRequest) => {
            if (!userId) throw new Error('Authentication required');
            const res = await authFetch(api.workflows.create.path, {
                method: api.workflows.create.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }, userId);
            if (!res.ok) throw new Error('Failed to create workflow');
            return api.workflows.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
        },
    });
}

export function useUpdateWorkflow() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: number } & UpdateWorkflowRequest) => {
            if (!userId) throw new Error('Authentication required');
            const url = buildUrl(api.workflows.update.path, { id });
            const res = await authFetch(url, {
                method: api.workflows.update.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            }, userId);
            if (!res.ok) throw new Error('Failed to update workflow');
            return api.workflows.update.responses[200].parse(await res.json());
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.workflows.get.path, data.id] });
        },
    });
}

export function useDeleteWorkflow() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            if (!userId) throw new Error('Authentication required');
            const url = buildUrl(api.workflows.delete.path, { id });
            const res = await authFetch(url, {
                method: api.workflows.delete.method,
            }, userId);
            if (!res.ok) throw new Error('Failed to delete workflow');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
        },
    });
}

export function useExecuteWorkflow() {
    const { userId } = useAuth();
    return useMutation({
        mutationFn: async ({ id, triggerData }: { id: number; triggerData?: any }) => {
            if (!userId) throw new Error('Authentication required');
            const url = buildUrl(api.workflows.execute.path, { id });
            const res = await authFetch(url, {
                method: api.workflows.execute.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggerData }),
            }, userId);
            if (!res.ok) throw new Error('Failed to execute workflow');
            return api.workflows.execute.responses[200].parse(await res.json());
        },
    });
}
