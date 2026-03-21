import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { authFetch } from '@/lib/auth-fetch';

export function useSlackOAuth() {
    const { userId } = useAuth();
    return useMutation({
        mutationFn: async () => {
            if (!userId) throw new Error('Authentication required');
            const res = await authFetch('/api/oauth/slack/auth-url', {}, userId);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to get Slack auth URL');
            }
            const { authUrl } = await res.json();
            window.location.href = authUrl;
        },
    });
}
