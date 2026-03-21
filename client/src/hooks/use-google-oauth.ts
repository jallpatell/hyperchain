import { useMutation } from '@tanstack/react-query';

export function useGoogleOAuth(service: 'drive' | 'sheets') {
    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/oauth/google/${service}/auth-url`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || `Failed to get Google ${service} auth URL`);
            }
            const { authUrl } = await res.json();
            window.location.href = authUrl;
        },
    });
}
