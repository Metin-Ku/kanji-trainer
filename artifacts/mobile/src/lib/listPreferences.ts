import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SortMode } from "./sortWords";

const PREFIX = "kanji-trainer-list-prefs";

const SORT_MODES = new Set<SortMode>([
  "level-asc",
  "level-desc",
  "date-asc",
  "date-desc",
  "jlpt-asc",
  "jlpt-desc",
  "kanji-cluster",
]);

export type SingleSortListPrefs = {
  query: string;
  sort: SortMode;
  jlptLevels?: string[];
};

export type WordsListPrefs = {
  query: string;
  sorts: SortMode[];
  pageSize?: number;
  jlptLevels?: string[];
};

const JLPT_VALUES = new Set(["", "N5", "N4", "N3", "N2", "N1"]);
const PAGE_SIZE_VALUES = new Set([25, 50, 100, 200]);

function storageKey(scope: string): string {
  return `${PREFIX}-${scope}`;
}

function isSortMode(value: unknown): value is SortMode {
  return typeof value === "string" && SORT_MODES.has(value as SortMode);
}

export async function getSingleSortListPrefs(
  scope: string,
  defaults: SingleSortListPrefs,
): Promise<SingleSortListPrefs> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<SingleSortListPrefs>;
    return {
      query: typeof saved.query === "string" ? saved.query : defaults.query,
      sort: isSortMode(saved.sort) ? saved.sort : defaults.sort,
    };
  } catch {
    return defaults;
  }
}

export async function saveSingleSortListPrefs(
  scope: string,
  prefs: SingleSortListPrefs,
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(scope), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function isJlptFilter(value: unknown): value is string {
  return typeof value === "string" && JLPT_VALUES.has(value);
}

export async function getWordsListPrefs(
  scope: string,
  defaults: WordsListPrefs,
): Promise<WordsListPrefs> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<WordsListPrefs>;
    const sorts = Array.isArray(saved.sorts)
      ? saved.sorts.filter(isSortMode)
      : defaults.sorts;
    const pageSize =
      typeof saved.pageSize === "number" && PAGE_SIZE_VALUES.has(saved.pageSize)
        ? saved.pageSize
        : (defaults.pageSize ?? 50);
    const jlptLevels = Array.isArray(saved.jlptLevels)
      ? saved.jlptLevels.filter(
          (level): level is string =>
            isJlptFilter(level) && level !== "",
        )
      : (defaults.jlptLevels ?? []);
    return {
      query: typeof saved.query === "string" ? saved.query : defaults.query,
      sorts: sorts.length > 0 ? sorts : defaults.sorts,
      pageSize,
      jlptLevels,
    };
  } catch {
    return defaults;
  }
}

export async function saveWordsListPrefs(
  scope: string,
  prefs: WordsListPrefs,
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(scope), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
