import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAppSettings,
  saveAppSettings,
  type AppSettings,
} from "../settings/appSettings";
import {
  DEFAULT_LOCALE,
  getMessages,
  type Locale,
  type Messages,
} from "./locales";
import {
  formatCardDate,
  formatStudyDate,
  formatToday,
  interpolate,
  translate,
} from "./translate";

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  formatToday: () => string;
  formatCardDate: (iso: string) => string;
  formatStudyDate: (iso: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveLocale(settings: AppSettings): Locale {
  return settings.locale ?? DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveLocale(getAppSettings()),
  );

  const messages = useMemo(() => getMessages(locale), [locale]);

  const setLocale = useCallback((next: Locale) => {
    saveAppSettings({ locale: next });
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(messages, key, params),
    [messages],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      t,
      setLocale,
      formatToday: () => formatToday(messages),
      formatCardDate: (iso: string) => formatCardDate(messages, iso),
      formatStudyDate: (iso: string) => formatStudyDate(messages, iso),
    }),
    [locale, messages, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

/** For non-React code paths (e.g. store titles). */
export function tStatic(
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = resolveLocale(getAppSettings()),
): string {
  return translate(getMessages(locale), key, params);
}

export { interpolate };
