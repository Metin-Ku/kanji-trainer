const SETTINGS_STORAGE_KEY = "kanji-trainer-app-settings";

export interface AppSettings {
  /** Dotted links for known vocabulary words inside SRS example sentences */
  srsSentenceWordLinks: boolean;
  /** Convert Latin keyboard input to kana while typing in SRS example deck */
  srsRomajiInput: boolean;
}

const DEFAULTS: AppSettings = {
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
