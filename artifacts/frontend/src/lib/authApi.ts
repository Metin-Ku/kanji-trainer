import { apiUrl } from "./apiOrigin";
import { isDemoMode } from "./demoMode";
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "./sessionToken";

export type UserRole = "admin" | "moderator" | "user";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
};

function authHeaders(): HeadersInit {
  const token = getSessionToken();
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

/** Passwordless showcase login (CV backend with DEMO_AUTO_LOGIN). */
export async function demoLogin(): Promise<AuthUser | null> {
  if (!isDemoMode()) return null;

  const res = await fetch(apiUrl("/api/auth/demo"), {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  const data = await parseJson<{ user: AuthUser; token?: string }>(res);
  if (data.token) setSessionToken(data.token);
  return data.user;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(apiUrl("/api/auth/me"), {
    credentials: "include",
    headers: authHeaders(),
  });
  if (res.status === 401) {
    clearSessionToken();
    return null;
  }
  const data = await parseJson<{ user: AuthUser }>(res);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ user: AuthUser; token?: string }>(res);
  if (data.token) setSessionToken(data.token);
  return data.user;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/register"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ user: AuthUser; token?: string }>(res);
  if (data.token) setSessionToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
  });
  clearSessionToken();
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/forgot-password"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email }),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/reset-password"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ token, password }),
  });
  await parseJson<{ ok: boolean }>(res);
}

export function membershipYear(createdAt: string): number {
  return new Date(createdAt).getFullYear();
}

export function yearRange(fromYear: number, toYear: number): number[] {
  const years: number[] = [];
  for (let y = toYear; y >= fromYear; y--) years.push(y);
  return years;
}
