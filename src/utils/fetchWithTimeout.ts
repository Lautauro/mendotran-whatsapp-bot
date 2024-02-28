export function fetchWithTimeout(url: string, options?: RequestInit | null, timeout: number = 5000): Promise<Response> {
    const signal = AbortSignal.timeout(timeout);
    return fetch(url, { ...options, signal: signal });
}
