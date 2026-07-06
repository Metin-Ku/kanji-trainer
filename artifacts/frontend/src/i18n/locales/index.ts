import { en } from "./en";
import { tr } from "./tr";
import type { Messages } from "./messages";

export type { Messages } from "./messages";
export type Locale = "en" | "tr";

export const LOCALES: {
  id: Locale;
  labelKey: "common.english" | "common.turkish";
}[] = [
  { id: "en", labelKey: "common.english" },
  { id: "tr", labelKey: "common.turkish" },
];

export const DEFAULT_LOCALE: Locale = "en";

const catalogs: Record<Locale, Messages> = { en, tr };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs.en;
}

export { en };
