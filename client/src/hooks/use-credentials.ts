import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCredential } from "@shared/schema";

export function useCredentials() {
  return useQuery({
    queryKey: [api.credentials.list.path],
    queryFn: async () => {
      const res = await fetch(api.credentials.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch credentials");
      const data = await res.json();
      return api.credentials.list.responses[200].parse(data);
    },
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCredential) => {
      const res = await fetch(api.credentials.create.path, {
        method: api.credentials.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create credential");
      return api.credentials.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.credentials.delete.path, { id });
      const res = await fetch(url, { 
        method: api.credentials.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete credential");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
    },
  });
}
