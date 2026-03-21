export async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
    userId?: string | null,
): Promise<Response> {
    const headers = new Headers(init.headers || {});
    if (userId) {
        headers.set('x-user-id', userId);
    }

    return fetch(input, {
        ...init,
        headers,
        credentials: 'include',
    });
}
