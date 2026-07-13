/** Render backend origin without trailing slash. Empty → relative `/api` (Vite dev proxy). */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN?.trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

/** Resolve an API path, optionally prefixed with `VITE_API_ORIGIN`. */
export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  if (!origin) return path;
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

/** Fetch with session cookies (httpOnly `kt_session`). */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), { credentials: "include", ...init });
}
