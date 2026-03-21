import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { api, buildUrl } from '@shared/routes';
import { type ExecutionDetail } from '@shared/schema';
import { authFetch } from '@/lib/auth-fetch';

export function useExecutions(workflowId?: number) {
    const { userId, isLoaded } = useAuth();
    return useQuery({
        queryKey: [api.executions.list.path, workflowId],
        queryFn: async () => {
            let url = api.executions.list.path;
            if (workflowId) {
                url += `?workflowId=${workflowId}`;
            }
            const res = await authFetch(url, {}, userId);
            if (!res.ok) throw new Error('Failed to fetch executions');
            const data = await res.json();
            return api.executions.list.responses[200].parse(data);
        },
        enabled: isLoaded && !!userId,
    });
}

export function useExecution(id: number) {
    const { userId, isLoaded } = useAuth();
    return useQuery({
        queryKey: [api.executions.get.path, id],
        queryFn: async () => {
            const url = buildUrl(api.executions.get.path, { id });
            const res = await authFetch(url, {}, userId);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch execution');
            const data = await res.json();
            return api.executions.get.responses[200].parse(data);
        },
        enabled: !isNaN(id) && isLoaded && !!userId,
        // Poll for status if running
        refetchInterval: (query) => {
            const data = query.state.data as ExecutionDetail | undefined;
            const status = data?.execution.status;
            return status === 'running' || status === 'pending' ? 1000 : false;
        },
    });
}
