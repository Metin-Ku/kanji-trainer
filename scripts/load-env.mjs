import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load KEY=VALUE pairs from repo-root .env into process.env (does not override existing).
 */
export function loadEnv(repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  const envFile = resolve(repoRoot, ".env");
  if (!existsSync(envFile)) return;

  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function poolConfig(databaseUrl) {
  const useSsl =
    databaseUrl.includes("supabase") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("sslmode=verify");

  const connectionString = databaseUrl
    .replace(/([?&])sslmode=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");

  return {
    connectionString,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
