import { existsSync, readFileSync } from "node:fs";

/**
 * Loads KEY=VALUE pairs from a .env file into process.env (local dev only).
 * Does not override variables already set in the environment.
 */
export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return false;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
