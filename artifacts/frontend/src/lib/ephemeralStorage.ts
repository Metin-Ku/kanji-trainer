const TTL_MS = 60 * 60 * 1000;

interface Stored<T> {
  v: T;
  exp: number;
}

export function readEphemeral<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

export function writeEphemeral<T>(key: string, value: T): void {
  try {
    const entry: Stored<T> = { v: value, exp: Date.now() + TTL_MS };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* ignore quota / private mode */
  }
}
