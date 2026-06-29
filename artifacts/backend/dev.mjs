import { spawn } from "node:child_process";
import path from "node:path";
import * as esbuild from "esbuild";
import { rm } from "node:fs/promises";
import { artifactDir, getEsbuildOptions } from "./esbuild-config.mjs";

let server;

function startServer() {
  server?.kill();
  server = spawn(
    process.execPath,
    ["--enable-source-maps", path.resolve(artifactDir, "dist/index.mjs")],
    { stdio: "inherit", env: process.env },
  );
  server.on("exit", (code, signal) => {
    if (signal !== "SIGTERM" && signal !== "SIGKILL" && code !== 0 && code !== null) {
      process.exit(code ?? 1);
    }
  });
}

function stopServer() {
  if (server) {
    server.kill("SIGTERM");
    server = undefined;
  }
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopServer();
  process.exit(0);
});

const distDir = path.resolve(artifactDir, "dist");
await rm(distDir, { recursive: true, force: true });

const options = getEsbuildOptions();

const ctx = await esbuild.context({
  ...options,
  plugins: [
    ...options.plugins,
    {
      name: "restart-server",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0) return;
          startServer();
        });
      },
    },
  ],
});

await ctx.watch();
console.log("[backend] watching for changes…");
