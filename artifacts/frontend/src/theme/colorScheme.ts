import { getAppSettings, saveAppSettings, type ColorScheme } from "../settings/appSettings";

export type { ColorScheme };

export function applyColorScheme(scheme: ColorScheme, instant = true) {
  const root = document.documentElement;
  if (instant) root.classList.add("theme-switching");
  root.classList.toggle("dark", scheme === "dark");
  root.style.colorScheme = scheme;
  if (instant) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
      });
    });
  }
}

export function getStoredColorScheme(): ColorScheme {
  return getAppSettings().colorScheme;
}

export function setColorScheme(scheme: ColorScheme) {
  applyColorScheme(scheme);
  saveAppSettings({ colorScheme: scheme });
}

export function initColorScheme() {
  applyColorScheme(getStoredColorScheme(), false);
}
