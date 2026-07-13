import { apiUrl } from "./apiOrigin";

export type UserRole = "admin" | "moderator" | "user";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
};

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
  const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
  if (res.status === 401) return null;
  const data = await parseJson<{ user: AuthUser }>(res);
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ user: AuthUser }>(res);
  return data.user;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/register"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ user: AuthUser }>(res);
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/forgot-password"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/reset-password"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
