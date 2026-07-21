import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const envFile = resolve(repoRoot, ".env");

function loadDotEnv() {
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

loadDotEnv();

const sourceUrl =
  process.env.DATABASE_URL_SOURCE ?? process.env.DATABASE_URL ?? "";
const targetUrl =
  process.env.DATABASE_URL_TARGET ?? process.env.DATABASE_URL_CV ?? "";

if (!sourceUrl || !targetUrl) {
  console.error(
    "DATABASE_URL (source) and DATABASE_URL_CV (target) are required in .env",
  );
  process.exit(1);
}

if (sourceUrl === targetUrl) {
  console.error("Source and target DATABASE_URL must be different.");
  process.exit(1);
}

const confirmed =
  process.argv.includes("--yes") || process.env.CLONE_CONFIRM === "yes";
if (!confirmed) {
  console.error(
    "Refusing to clone without confirmation. Re-run with: pnpm db:clone -- --yes",
  );
  process.exit(1);
}

function poolConfig(databaseUrl: string): pg.PoolConfig {
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

/** Insert order respects foreign keys. */
const TABLES_COPY_ORDER = [
  "users",
  "words",
  "categories",
  "themes",
  "theme_quiz_questions",
  "word_relations",
  "srs_cards",
  "word_mistakes",
  "theme_words",
  "category_words",
  "study_activity",
  "srs_review_log",
] as const;

const TRUNCATE_SQL = `
TRUNCATE TABLE
  category_words,
  theme_words,
  theme_quiz_questions,
  word_relations,
  srs_review_log,
  srs_cards,
  word_mistakes,
  study_activity,
  words,
  categories,
  themes,
  password_reset_tokens,
  sessions,
  users
RESTART IDENTITY CASCADE;
`;

const SERIAL_TABLES = [
  "users",
  "words",
  "categories",
  "themes",
  "theme_quiz_questions",
  "srs_cards",
  "srs_review_log",
] as const;

async function getColumnTypes(
  pool: pg.Pool,
  table: string,
): Promise<Map<string, string>> {
  const { rows } = await pool.query<{
    column_name: string;
    data_type: string;
    udt_name: string;
  }>(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.column_name, row.data_type === "ARRAY" ? row.udt_name : row.data_type);
  }
  return map;
}

function serializeCell(value: unknown, dataType: string | undefined): unknown {
  if (value == null) return value;
  if (dataType === "json" || dataType === "jsonb") {
    // Inserted via ::jsonb cast from raw JSON text (see copyTable SELECT).
    return value;
  }
  return value;
}

async function copyTable(
  source: pg.Pool,
  target: pg.PoolClient,
  table: string,
  columnTypes: Map<string, string>,
): Promise<number> {
  const columns = [...columnTypes.keys()];
  if (columns.length === 0) return 0;

  const selectList = columns
    .map((c) => {
      const t = columnTypes.get(c);
      if (t === "json" || t === "jsonb") return `"${c}"::text AS "${c}"`;
      return `"${c}"`;
    })
    .join(", ");

  const { rows } = await source.query(
    `SELECT ${selectList} FROM ${table} ORDER BY 1`,
  );
  if (rows.length === 0) return 0;

  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns
    .map((c, i) => {
      const t = columnTypes.get(c);
      if (t === "json" || t === "jsonb") return `$${i + 1}::jsonb`;
      return `$${i + 1}`;
    })
    .join(", ");
  const insertSql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`;

  for (const row of rows) {
    await target.query(
      insertSql,
      columns.map((c) => serializeCell(row[c], columnTypes.get(c))),
    );
  }
  return rows.length;
}

async function fixSequences(client: pg.PoolClient) {
  for (const table of SERIAL_TABLES) {
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${table}), 1)
      );
    `);
  }
}

const source = new pg.Pool(poolConfig(sourceUrl));
const target = new pg.Pool(poolConfig(targetUrl));

try {
  console.log("Cloning database…");
  console.log("  Source: DATABASE_URL (personal)");
  console.log("  Target: DATABASE_URL_CV\n");

  const client = await target.connect();
  try {
    await client.query("BEGIN");
    console.log("Truncating target tables…");
    await client.query(TRUNCATE_SQL);

    for (const table of TABLES_COPY_ORDER) {
      const columnTypes = await getColumnTypes(source, table);
      const count = await copyTable(source, client, table, columnTypes);
      console.log(`  ${table}: ${count} rows`);
    }

    console.log("Resetting sequences…");
    await fixSequences(client);
    await client.query("COMMIT");
    console.log("\nClone completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
} catch (err) {
  console.error("Clone failed:", err);
  process.exit(1);
} finally {
  await source.end();
  await target.end();
}
