import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load KEY=VALUE pairs from a .env file into process.env (does not override existing).
 * @returns {boolean} true if the file exists and was read
 */
export function loadEnvFile(envFilePath) {
  if (!existsSync(envFilePath)) return false;

  for (const line of readFileSync(envFilePath, "utf8").split(/\r?\n/)) {
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
  return true;
}

/**
 * Load repo-root .env (used by db-push-all and similar scripts).
 */
export function loadEnv(repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  loadEnvFile(resolve(repoRoot, ".env"));
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
