export const themeVars = {
  star: "var(--star-color)",
  iconBg: "var(--icon-bg)",
  level: (n: number) => `var(--level-${Math.min(5, Math.max(1, n))})`,
} as const;
