import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  getMessages,
  type Locale,
  type Messages,
} from "./messages";
import { getAppSettings, saveAppSettings } from "@/settings/appSettings";
import { formatCardDate, formatStudyDate, formatToday, translate } from "./translate";

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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    getAppSettings().then((settings) => {
      setLocaleState(settings.locale ?? DEFAULT_LOCALE);
    });
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void saveAppSettings({ locale: next });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(messages, key, params),
    [messages],
  );

  const value = useMemo(
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
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
