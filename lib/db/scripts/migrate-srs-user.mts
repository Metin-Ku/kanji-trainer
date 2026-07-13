import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const envFile = resolve(repoRoot, ".env");

if (!process.env.DATABASE_URL && existsSync(envFile)) {
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
    if (key === "DATABASE_URL") {
      process.env.DATABASE_URL = value;
      break;
    }
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required (.env or environment).");
  process.exit(1);
}

const sqlPath = resolve(scriptDir, "../migrations/003_srs_cards_user_id.sql");
const sql = readFileSync(sqlPath, "utf8");

const useSsl =
  databaseUrl.includes("supabase") ||
  databaseUrl.includes("sslmode=require") ||
  databaseUrl.includes("sslmode=verify");

const connectionString = databaseUrl
  .replace(/([?&])sslmode=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");

const pool = new pg.Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

try {
  console.log("Running srs_cards user_id migration…");
  await pool.query(sql);
  const { rows } = await pool.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM srs_cards WHERE user_id = 1",
  );
  console.log("Done. srs_cards for user 1:", rows[0]?.count);
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
