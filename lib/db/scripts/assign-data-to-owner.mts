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

const ownerId = Number(process.env.OWNER_USER_ID ?? "1");
if (!Number.isFinite(ownerId) || ownerId <= 0) {
  console.error("OWNER_USER_ID must be a positive integer.");
  process.exit(1);
}

const sqlPath = resolve(scriptDir, "../migrations/002_assign_data_to_owner.sql");
let sql = readFileSync(sqlPath, "utf8");
sql = sql.replace(
  /owner_id integer := 1;/,
  `owner_id integer := ${ownerId};`,
);

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
  const { rows } = await pool.query<{ email: string }>(
    "SELECT email FROM users WHERE id = $1",
    [ownerId],
  );
  if (rows.length === 0) {
    console.error(`User id ${ownerId} not found.`);
    process.exit(1);
  }

  console.log(
    `Assigning all legacy data to user ${ownerId} (${rows[0]!.email})…`,
  );
  await pool.query(sql);

  const counts = await pool.query<{
    words: string;
    themes: string;
    categories: string;
    study_activity: string;
  }>(`
    SELECT
      (SELECT count(*)::text FROM words WHERE user_id = $1) AS words,
      (SELECT count(*)::text FROM themes WHERE user_id = $1) AS themes,
      (SELECT count(*)::text FROM categories WHERE user_id = $1) AS categories,
      (SELECT count(*)::text FROM study_activity WHERE user_id = $1) AS study_activity
  `, [ownerId]);

  console.log("Done.", counts.rows[0]);
} catch (err) {
  console.error("Assign owner failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
