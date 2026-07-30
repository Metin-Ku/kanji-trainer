import { apiUrl } from "./apiConfig";
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "./sessionToken";
import type { AuthUser } from "./types";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : res.statusText;
    throw new Error(msg || "Request failed");
  }
  return data as T;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(apiUrl("/api/auth/me"), {
    headers: await authHeaders(),
  });
  if (res.status === 401) {
    await clearSessionToken();
    return null;
  }
  const data = await parseJson<{ user: AuthUser }>(res);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ user: AuthUser; token?: string }>(res);
  if (data.token) await setSessionToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    headers: await authHeaders(),
  });
  await clearSessionToken();
}
