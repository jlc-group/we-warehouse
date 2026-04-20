/**
 * Centralized API URL resolution.
 *
 * Returns the correct backend base URL depending on where the browser is running:
 *  - localhost / 127.0.0.1             → http://localhost:3005      (direct to PM2 backend)
 *  - warehouse.wejlc.com (Cloudflare)  → https://warehouse-api.wejlc.com
 *  - other hostnames                   → relative "" (assumes reverse proxy routes /api → backend)
 *
 * `VITE_BACKEND_URL` always wins if set.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Map tunnel frontend hostname → backend hostname
const TUNNEL_MAP: Record<string, string> = {
    'warehouse.wejlc.com': 'https://warehouse-api.wejlc.com',
    'we-warehouse.pages.dev': 'https://warehouse-api.wejlc.com',
};

/**
 * Returns backend root (no trailing slash) — e.g. "http://localhost:3005"
 * Use for endpoints under /api/... (except /api/local/... use getLocalDbUrl())
 */
export function getBackendRoot(): string {
    // Explicit env override (strip any trailing /api/local or /api)
    const envUrl = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
    if (envUrl) {
        return envUrl.replace(/\/api\/local\/?$/, '').replace(/\/api\/?$/, '');
    }
    if (typeof window === 'undefined') return 'http://localhost:3005';

    const host = window.location.hostname;
    if (LOCAL_HOSTS.has(host)) return 'http://localhost:3005';
    if (TUNNEL_MAP[host]) return TUNNEL_MAP[host];

    // Fallback: relative (assumes a reverse proxy is mapping /api → backend)
    return '';
}

/**
 * Returns local DB API URL — e.g. "http://localhost:3005/api/local"
 * Use for localDb client.
 */
export function getLocalDbUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
    if (envUrl) return envUrl;

    const root = getBackendRoot();
    return `${root}/api/local`;
}
