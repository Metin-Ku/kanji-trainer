import dns from "node:dns";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/** pg v8 treats sslmode=require in the URL as verify-full, which breaks Supabase. */
function resolvePoolConfig(rawUrl: string): pg.PoolConfig {
  const useSsl =
    rawUrl.includes("supabase") ||
    rawUrl.includes("sslmode=require") ||
    rawUrl.includes("sslmode=verify");

  const connectionString = rawUrl
    .replace(/([?&])sslmode=[^&]*/g, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");

  return {
    connectionString,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    // Render has no IPv6 route; prefer IPv4 (Supabase direct host is IPv6-only).
    lookup: (hostname, _opts, cb) => {
      dns.lookup(hostname, { family: 4 }, cb);
    },
  };
}

export const pool = new Pool(resolvePoolConfig(process.env.DATABASE_URL));
export const db = drizzle(pool, { schema });

export * from "./schema";
