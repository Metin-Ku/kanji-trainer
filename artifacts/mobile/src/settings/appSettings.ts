import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_STORAGE_KEY = "kanji-trainer-app-settings";
const THEME_STORAGE_KEY = "kanji-trainer-theme";

export type AppLocale = "en" | "tr";

export type ColorScheme = "light" | "dark";

export interface AppSettings {
  locale: AppLocale;
  colorScheme: ColorScheme;
  srsSentenceWordLinks: boolean;
  srsRomajiInput: boolean;
}

const DEFAULTS: AppSettings = {
  locale: "en",
  colorScheme: "light",
  srsSentenceWordLinks: true,
  srsRomajiInput: true,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveAppSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function getStoredPaletteName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function savePaletteName(name: string): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
}

export { DEFAULTS as APP_SETTINGS_DEFAULTS };
