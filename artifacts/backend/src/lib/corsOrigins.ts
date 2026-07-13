/** Comma-separated list in FRONTEND_ORIGINS, or single FRONTEND_ORIGIN. */
export function getAllowedFrontendOrigins(): string[] {
  const raw =
    process.env.FRONTEND_ORIGINS ??
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:3000";

  const origins = raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  return origins.length > 0 ? origins : ["http://localhost:3000"];
}

export function isAllowedFrontendOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return getAllowedFrontendOrigins().includes(origin.replace(/\/+$/, ""));
}

/** Primary frontend URL (password-reset links). */
export function primaryFrontendOrigin(): string {
  return getAllowedFrontendOrigins()[0]!;
}
