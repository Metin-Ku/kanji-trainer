import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadEnv } from "./load-env.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
loadEnv(repoRoot);

const targets = [
  { label: "personal (DATABASE_URL)", url: process.env.DATABASE_URL },
  { label: "CV (DATABASE_URL_CV)", url: process.env.DATABASE_URL_CV },
].filter((t) => t.url);

if (targets.length === 0) {
  console.error(
    "Set DATABASE_URL and/or DATABASE_URL_CV in .env before running db:push-all.",
  );
  process.exit(1);
}

for (const { label, url } of targets) {
  console.log(`\n=== drizzle push → ${label} ===\n`);
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/db", "run", "push"],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: url },
      stdio: "inherit",
      shell: true,
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll drizzle push runs completed.");
