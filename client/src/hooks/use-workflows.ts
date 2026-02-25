import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { 
  type Workflow, 
  type CreateWorkflowRequest, 
  type UpdateWorkflowRequest,
  type WorkflowNode,
  type WorkflowEdge
} from "@shared/schema";

// Helper to ensure type safety when transforming API responses
// Since schema defines nodes/edges as jsonb, we cast them on the client
export interface TypedWorkflow extends Omit<Workflow, 'nodes' | 'edges'> {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function useWorkflows() {
  return useQuery({
    queryKey: [api.workflows.list.path],
    queryFn: async () => {
      const res = await fetch(api.workflows.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      return api.workflows.list.responses[200].parse(data) as TypedWorkflow[];
    },
  });
}

export function useWorkflow(id: number) {
  return useQuery({
    queryKey: [api.workflows.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.workflows.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch workflow");
      const data = await res.json();
      return api.workflows.get.responses[200].parse(data) as TypedWorkflow;
    },
    enabled: !isNaN(id),
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWorkflowRequest) => {
      const res = await fetch(api.workflows.create.path, {
        method: api.workflows.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create workflow");
      return api.workflows.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateWorkflowRequest) => {
      const url = buildUrl(api.workflows.update.path, { id });
      const res = await fetch(url, {
        method: api.workflows.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update workflow");
      return api.workflows.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.workflows.get.path, data.id] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.workflows.delete.path, { id });
      const res = await fetch(url, { 
        method: api.workflows.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete workflow");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workflows.list.path] });
    },
  });
}

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: async ({ id, triggerData }: { id: number; triggerData?: any }) => {
      const url = buildUrl(api.workflows.execute.path, { id });
      const res = await fetch(url, {
        method: api.workflows.execute.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerData }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to execute workflow");
      return api.workflows.execute.responses[200].parse(await res.json());
    },
  });
}