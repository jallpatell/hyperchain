import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useGmailOAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Step 1: Get the Gmail auth URL
      const authRes = await fetch("/api/oauth/gmail/auth-url");
      if (!authRes.ok) {
        const error = await authRes.json();
        throw new Error(error.message || "Failed to get Gmail auth URL");
      }
      const { authUrl } = await authRes.json();

      // Step 2: Redirect to Gmail OAuth
      window.location.href = authUrl;
    },
  });
}

export function useGmailOAuthCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      // Exchange code for tokens and create credential
      const res = await fetch("/api/oauth/gmail/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to complete Gmail OAuth");
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate credentials list so it refreshes
      queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
    },
  });
}
