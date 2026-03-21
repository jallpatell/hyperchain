import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { api } from '@shared/routes';
import { authFetch } from '@/lib/auth-fetch';

export function useGmailOAuth() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!userId) throw new Error('Authentication required');
            // Step 1: Get the Gmail auth URL
            const authRes = await authFetch('/api/oauth/gmail/auth-url', {}, userId);
            if (!authRes.ok) {
                const error = await authRes.json();
                throw new Error(error.message || 'Failed to get Gmail auth URL');
            }
            const { authUrl } = await authRes.json();

            // Step 2: Redirect to Gmail OAuth
            window.location.href = authUrl;
        },
    });
}

export function useGmailOAuthCallback() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (code: string) => {
            if (!userId) throw new Error('Authentication required');
            // Exchange code for tokens and create credential
            const res = await authFetch('/api/oauth/gmail/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            }, userId);

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to complete Gmail OAuth');
            }

            return res.json();
        },
        onSuccess: () => {
            // Invalidate credentials list so it refreshes
            queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
        },
    });
}
