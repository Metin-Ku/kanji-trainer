import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import concurrently from "concurrently";
import { loadEnvFile } from "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, ".env");

if (!loadEnvFile(envFile)) {
  console.error(
    "Missing .env file. Copy .env.example to .env and set DATABASE_URL, then run again.",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const backendPort = process.env.BACKEND_PORT ?? "8080";
const frontendPort = process.env.FRONTEND_PORT ?? "3000";
const basePath = process.env.BASE_PATH ?? "/";

const sharedEnv = {
  ...process.env,
  NODE_ENV: "development",
};

console.log(`Local dev → frontend http://localhost:${frontendPort}  API http://localhost:${backendPort}/api`);

const { result } = concurrently(
  [
    {
      command: "pnpm run dev",
      name: "api",
      cwd: resolve(root, "artifacts/backend"),
      env: { ...sharedEnv, PORT: backendPort },
    },
    {
      command: "pnpm run dev",
      name: "web",
      cwd: resolve(root, "artifacts/frontend"),
      env: {
        ...sharedEnv,
        PORT: frontendPort,
        BASE_PATH: basePath,
        BACKEND_PORT: backendPort,
      },
    },
  ],
  {
    prefix: "{name}",
    killOthersOn: ["failure"],
    cwd: root,
  },
);

await result;
