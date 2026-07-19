import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../../scripts/load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvFile(resolve(root, ".env"));

await import("./dist/cron.mjs");
