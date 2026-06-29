import {
  DEFAULT_PALETTE,
  getPalette,
  PALETTE_NAMES,
  SHADES,
  type PaletteName,
  type PaletteShades,
} from "./palettes";

export const THEME_STORAGE_KEY = "kanji-trainer-theme";

const LEVEL_SHADES = ["200", "300", "400", "500", "600"] as const;

// function setDerivedColors(root: HTMLElement, palette: PaletteShades) {
//   LEVEL_SHADES.forEach((shade, i) => {
//     root.style.setProperty(`--level-${i + 1}`, palette[shade]);
//   });

//   // root.style.setProperty("--star-color", palette["500"]);
//   root.style.setProperty("--star-color", "oklch(87.85% 0.1905 95.0235)");
//   root.style.setProperty(
//     "--icon-bg",
//     `linear-gradient(135deg, color-mix(in oklch, ${palette["400"]} 13%, transparent), color-mix(in oklch, ${palette["600"]} 8%, transparent))`,
//   );
//   root.style.setProperty("--primary", palette["500"]);
//   root.style.setProperty("--ring", palette["500"]);
// }

function setDerivedColors(root: HTMLElement, palette: PaletteShades) {
  const styles = getComputedStyle(root);
  const main600 = styles.getPropertyValue("--main-600").trim();

  const match = main600.match(
    /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/
  );

  if (!match) {
    console.warn("Invalid --main-600:", main600);
    return;
  }

  const l = parseFloat(match[1]);
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);

  // Her seviye arasında yaklaşık eşit görsel fark
  const levels = [
    { lOffset: 24, cScale: 0.80 },
    { lOffset: 18, cScale: 0.88 },
    { lOffset: 12, cScale: 0.98 },
    { lOffset: 6,  cScale: 1.10 },
    { lOffset: 0,  cScale: 1.24 },
  ];

  levels.forEach(({ lOffset, cScale }, i) => {
    const newL = Math.min(100, l + lOffset);
    const newC = Math.max(0, c * cScale);

    root.style.setProperty(
      `--level-${i + 1}`,
      `oklch(${newL.toFixed(2)}% ${newC.toFixed(4)} ${h})`
    );
  });

  root.style.setProperty("--star-color", "oklch(87.85% 0.1905 95.0235)");

  root.style.setProperty(
    "--icon-bg",
    `linear-gradient(
      135deg,
      color-mix(in oklch, ${palette["400"]} 13%, transparent),
      color-mix(in oklch, ${palette["600"]} 8%, transparent)
    )`
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
