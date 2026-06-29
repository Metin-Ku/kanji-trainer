import {
  DEFAULT_PALETTE,
  getPalette,
  PALETTE_NAMES,
  SHADES,
  type PaletteName,
  type PaletteShades,
} from "./palettes";

export const THEME_STORAGE_KEY = "kanji-trainer-theme";

const LEVEL_SHADES = ["300", "400", "500", "600", "700"] as const;

function setDerivedColors(root: HTMLElement, palette: PaletteShades) {
  LEVEL_SHADES.forEach((shade, i) => {
    root.style.setProperty(`--level-${i + 1}`, palette[shade]);
  });

  root.style.setProperty("--star-color", palette["300"]);
  root.style.setProperty(
    "--icon-bg",
    `linear-gradient(135deg, color-mix(in oklch, ${palette["400"]} 13%, transparent), color-mix(in oklch, ${palette["600"]} 8%, transparent))`,
  );
  root.style.setProperty("--primary", palette["500"]);
  root.style.setProperty("--ring", palette["500"]);
}

export function applyTheme(name: PaletteName) {
  const palette = getPalette(name);
  const root = document.documentElement;

  for (const shade of SHADES) {
    root.style.setProperty(`--main-${shade}`, palette[shade]);
  }

  setDerivedColors(root, palette);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {
    // ignore storage errors
  }
}

export function getStoredPalette(): PaletteName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (PALETTE_NAMES as string[]).includes(stored)) {
      return stored as PaletteName;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_PALETTE;
}

export function initTheme() {
  applyTheme(getStoredPalette());
}
