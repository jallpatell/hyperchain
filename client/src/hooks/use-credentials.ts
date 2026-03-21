import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { api, buildUrl } from '@shared/routes';
import { type InsertCredential } from '@shared/schema';
import { authFetch } from '@/lib/auth-fetch';

export function useCredentials() {
    const { userId, isLoaded } = useAuth();
    return useQuery({
        queryKey: [api.credentials.list.path],
        queryFn: async () => {
            const res = await authFetch(api.credentials.list.path, {}, userId);
            if (!res.ok) throw new Error('Failed to fetch credentials');
            const data = await res.json();
            return api.credentials.list.responses[200].parse(data);
        },
        enabled: isLoaded && !!userId,
    });
}

export function useCreateCredential() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: InsertCredential) => {
            if (!userId) throw new Error('Authentication required');
            const res = await authFetch(api.credentials.create.path, {
                method: api.credentials.create.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }, userId);
            if (!res.ok) throw new Error('Failed to create credential');
            return api.credentials.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
        },
    });
}

export function useDeleteCredential() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            if (!userId) throw new Error('Authentication required');
            const url = buildUrl(api.credentials.delete.path, { id });
            const res = await authFetch(url, {
                method: api.credentials.delete.method,
            }, userId);
            if (!res.ok) throw new Error('Failed to delete credential');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
        },
    });
}
