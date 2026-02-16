import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Execution } from "@shared/schema";

export function useExecutions(workflowId?: number) {
  return useQuery({
    queryKey: [api.executions.list.path, workflowId],
    queryFn: async () => {
      let url = api.executions.list.path;
      if (workflowId) {
        url += `?workflowId=${workflowId}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch executions");
      const data = await res.json();
      return api.executions.list.responses[200].parse(data);
    },
  });
}

export function useExecution(id: number) {
  return useQuery({
    queryKey: [api.executions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.executions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch execution");
      const data = await res.json();
      return api.executions.get.responses[200].parse(data);
    },
    enabled: !isNaN(id),
    // Poll for status if running
    refetchInterval: (query) => {
      const data = query.state.data as Execution | undefined;
      return data?.status === 'running' || data?.status === 'pending' ? 1000 : false;
    }
  });
}
