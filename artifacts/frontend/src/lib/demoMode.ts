/** CV / portfolio build — auto guest session, no login screen. */
export function isDemoMode(): boolean {
  const v = import.meta.env.VITE_DEMO_MODE?.trim().toLowerCase();
  return v === "true" || v === "1";
}
