import path from "node:path";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";
import { artifactDir, getEsbuildOptions } from "./esbuild-config.mjs";

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });
  await esbuild(getEsbuildOptions());
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
