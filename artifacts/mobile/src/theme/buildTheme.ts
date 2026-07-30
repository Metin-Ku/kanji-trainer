import type { ColorScheme } from "@/settings/appSettings";
import {
  DEFAULT_PALETTE,
  getPalette,
  type PaletteName,
  type PaletteShades,
  type Shade,
} from "./palettes";

const LEVEL_SHADES: Shade[] = ["300", "400", "500", "600", "700"];

const LIGHT = {
  appBg: "#f9fafb",
  appSurface: "#ffffff",
  appMuted: "#f3f4f6",
  appBorder: "#f3f4f6",
  appBorderStrong: "#e5e7eb",
  appText: "#111827",
  appTextSecondary: "#6b7280",
  appTextMuted: "#9ca3af",
  inputBg: "#f9fafb",
  danger: "#f87171",
  white: "#ffffff",
  levelInactive: "#e5e7eb",
};

const DARK = {
  appBg: "#0f1117",
  appSurface: "#181b24",
  appMuted: "#1f2430",
  appBorder: "#252a36",
  appBorderStrong: "#323845",
  appText: "#f3f4f6",
  appTextSecondary: "#9ca3af",
  appTextMuted: "#8b949e",
  inputBg: "#252a36",
  danger: "#f87171",
  white: "#ffffff",
  levelInactive: "#323845",
};

export type AppTheme = {
  colorScheme: ColorScheme;
  paletteName: PaletteName;
  main50: string;
  main100: string;
  main200: string;
  main300: string;
  main400: string;
  main500: string;
  main600: string;
  main700: string;
  main800: string;
  main900: string;
  main950: string;
  appBg: string;
  appSurface: string;
  appMuted: string;
  appBorder: string;
  appBorderStrong: string;
  appText: string;
  appTextSecondary: string;
  appTextMuted: string;
  appAccent: string;
  inputBg: string;
  danger: string;
  white: string;
  starColor: string;
  levelColor: (bar: number, currentLevel: number) => string;
};

function buildLevelColor(palette: PaletteShades, inactive: string) {
  return (bar: number, currentLevel: number) => {
    if (bar > currentLevel) return inactive;
    return palette[LEVEL_SHADES[bar - 1]!];
  };
}

function buildAppAccent(
  palette: PaletteShades,
  colorScheme: ColorScheme,
): string {
  if (colorScheme === "dark") {
    return withAlpha(palette["500"], 0.16);
  }
  return palette["50"];
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildTheme(
  paletteName: PaletteName = DEFAULT_PALETTE,
  colorScheme: ColorScheme = "light",
): AppTheme {
  const palette = getPalette(paletteName);
  const base = colorScheme === "dark" ? DARK : LIGHT;
  const appAccent = buildAppAccent(palette, colorScheme);

  return {
    colorScheme,
    paletteName,
    main50: palette["50"],
    main100: palette["100"],
    main200: palette["200"],
    main300: palette["300"],
    main400: palette["400"],
    main500: palette["500"],
    main600: palette["600"],
    main700: palette["700"],
    main800: palette["800"],
    main900: palette["900"],
    main950: palette["950"],
    ...base,
    appAccent,
    starColor: "#facc15",
    levelColor: buildLevelColor(palette, base.levelInactive),
  };
}

export const defaultTheme = buildTheme();
