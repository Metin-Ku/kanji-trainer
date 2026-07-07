const SETTINGS_STORAGE_KEY = "kanji-trainer-app-settings";

export type AppLocale = "en" | "tr";

export type ColorScheme = "light" | "dark";

export interface AppSettings {
  /** UI language */
  locale: AppLocale;
  /** Light or dark appearance */
  colorScheme: ColorScheme;
  /** Dotted links for known vocabulary words inside SRS example sentences */
  srsSentenceWordLinks: boolean;
  /** Convert Latin keyboard input to kana while typing in SRS example deck */
  srsRomajiInput: boolean;
}

const DEFAULTS: AppSettings = {
  locale: "en",
  colorScheme: "light",
  srsSentenceWordLinks: true,
  srsRomajiInput: true,
};

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getAppSettings(), ...patch };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  return next;
}
