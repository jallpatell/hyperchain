import { useMutation } from '@tanstack/react-query';

export function useSlackOAuth() {
    return useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/oauth/slack/auth-url');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to get Slack auth URL');
            }
            const { authUrl } = await res.json();
            window.location.href = authUrl;
        },
    });
}
