import tailwindColors from "tailwindcss/colors";
import { toReactNativeColor } from "./resolveColor";

const EXCLUDED = new Set(["inherit", "current", "transparent", "black", "white"]);

export type PaletteName = Exclude<
  keyof typeof tailwindColors,
  "inherit" | "current" | "transparent" | "black" | "white"
>;

export const SHADES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;
export type Shade = (typeof SHADES)[number];

export type PaletteShades = Record<Shade, string>;

export const PALETTE_NAMES = Object.keys(tailwindColors).filter(
  (name): name is PaletteName => !EXCLUDED.has(name),
);

export const DEFAULT_PALETTE: PaletteName = "orange";

export function getPalette(name: PaletteName): PaletteShades {
  const palette = tailwindColors[name];
  if (typeof palette !== "object" || palette === null) {
    throw new Error(`Unknown palette: ${name}`);
  }
  const raw = palette as Record<string, string>;
  const result = {} as PaletteShades;
  for (const shade of SHADES) {
    result[shade] = toReactNativeColor(raw[shade] ?? "#000000");
  }
  return result;
}

export function isPaletteName(name: string): name is PaletteName {
  return (PALETTE_NAMES as string[]).includes(name);
}
