import { apiUrl } from "./apiConfig";
import { getSessionToken } from "./sessionToken";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getSessionToken();
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return fetch(apiUrl(path), { credentials: "include", ...init, headers });
}
