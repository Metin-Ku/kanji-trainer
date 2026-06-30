import fs from "node:fs";
import path from "node:path";
import type { Connect } from "vite";
import type { Plugin } from "vite";

const KUROMOJI_DICT_DIR = path.resolve(
  import.meta.dirname,
  "node_modules/kuromoji/dict",
);

function kuromojiDictMiddleware(base: string): Connect.NextHandleFunction {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const prefix = `${normalizedBase}/kuromoji/dict`.replace(/\/+/g, "/");

  return (req, res, next) => {
    const rawUrl = req.url?.split("?")[0];
    if (!rawUrl) return next();

    const urlPath = decodeURIComponent(rawUrl);
    if (!urlPath.startsWith(prefix)) return next();

    const rel = urlPath.slice(prefix.length).replace(/^\//, "");
    if (!rel || rel.includes("..")) return next();

    const filePath = path.resolve(KUROMOJI_DICT_DIR, rel);
    if (!filePath.startsWith(KUROMOJI_DICT_DIR)) return next();

    fs.readFile(filePath, (err, data) => {
      if (err) {
        next();
        return;
      }
      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.statusCode = 200;
      res.end(data);
    });
  };
}

/** Serve kuromoji dict in dev/preview (viteStaticCopy only runs on build). */
export function kuromojiDictPlugin(base: string): Plugin {
  return {
    name: "kuromoji-dict",
    configureServer(server) {
      server.middlewares.use(kuromojiDictMiddleware(base));
    },
    configurePreviewServer(server) {
      server.middlewares.use(kuromojiDictMiddleware(base));
    },
  };
}
