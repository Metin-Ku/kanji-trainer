import { getSessionToken } from "./sessionToken";

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

/** Fetch with session cookie + bearer token (mobile cross-origin). */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getSessionToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return fetch(apiUrl(path), { credentials: "include", ...init, headers });
}
