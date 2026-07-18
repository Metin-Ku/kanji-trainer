import type { SortMode } from "../components/WordListPanel";
import type { SrsSortMode } from "../types/srs";
import { readEphemeral, writeEphemeral } from "./ephemeralStorage";

const PREFIX = "kanji-trainer-list-prefs";

const WORD_SORT_MODES = new Set<SortMode>([
  "level-asc",
  "level-desc",
  "date-asc",
  "date-desc",
  "jlpt-asc",
  "jlpt-desc",
  "kanji-cluster",
]);

const SRS_SORT_MODES = new Set<SrsSortMode>(["due-asc", "date-asc", "date-desc"]);

const JLPT_VALUES = new Set(["", "N5", "N4", "N3", "N2", "N1"]);

const PAGE_SIZE_VALUES = new Set([25, 50, 100, 200]);

export type WordsListPrefs = {
  query: string;
  sorts: SortMode[];
  pageSize?: number;
  jlptLevels?: string[];
};

export type SingleSortListPrefs = {
  query: string;
  sort: SortMode;
};

export type SrsListPrefs = {
  jlptMin: string;
  jlptMax: string;
  sort: SrsSortMode;
};

function storageKey(scope: string): string {
  return `${PREFIX}-${scope}`;
}

function isSortMode(value: unknown): value is SortMode {
  return typeof value === "string" && WORD_SORT_MODES.has(value as SortMode);
}

function isSrsSortMode(value: unknown): value is SrsSortMode {
  return typeof value === "string" && SRS_SORT_MODES.has(value as SrsSortMode);
}

function isJlptFilter(value: unknown): value is string {
  return typeof value === "string" && JLPT_VALUES.has(value);
}

export function getWordsListPrefs(
  scope: string,
  defaults: WordsListPrefs,
): WordsListPrefs {
  const saved = readEphemeral<Partial<WordsListPrefs>>(storageKey(scope));
  if (!saved) return defaults;

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
          typeof level === "string" && JLPT_VALUES.has(level) && level !== "",
      )
    : (defaults.jlptLevels ?? []);

  return {
    query: typeof saved.query === "string" ? saved.query : defaults.query,
    sorts: sorts.length > 0 ? sorts : defaults.sorts,
    pageSize,
    jlptLevels,
  };
}

export function saveWordsListPrefs(scope: string, prefs: WordsListPrefs): void {
  writeEphemeral(storageKey(scope), prefs);
}

export function getSingleSortListPrefs(
  scope: string,
  defaults: SingleSortListPrefs,
): SingleSortListPrefs {
  const saved = readEphemeral<Partial<SingleSortListPrefs>>(storageKey(scope));
  if (!saved) return defaults;

  return {
    query: typeof saved.query === "string" ? saved.query : defaults.query,
    sort: isSortMode(saved.sort) ? saved.sort : defaults.sort,
  };
}

export function saveSingleSortListPrefs(
  scope: string,
  prefs: SingleSortListPrefs,
): void {
  writeEphemeral(storageKey(scope), prefs);
}

export function getSrsListPrefs(
  scope: string,
  defaults: SrsListPrefs,
): SrsListPrefs {
  const saved = readEphemeral<Partial<SrsListPrefs>>(storageKey(scope));
  if (!saved) return defaults;

  return {
    jlptMin: isJlptFilter(saved.jlptMin) ? saved.jlptMin : defaults.jlptMin,
    jlptMax: isJlptFilter(saved.jlptMax) ? saved.jlptMax : defaults.jlptMax,
    sort: isSrsSortMode(saved.sort) ? saved.sort : defaults.sort,
  };
}

export function saveSrsListPrefs(scope: string, prefs: SrsListPrefs): void {
  writeEphemeral(storageKey(scope), prefs);
}
