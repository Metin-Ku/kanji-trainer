import { localDateKey } from "./dailyGoal";

export type StudiedWordsPreset =
  | "today"
  | "yesterday"
  | "twoDaysAgo"
  | "lastWeek";

export type StudiedWordsDateRange = {
  from?: string;
  to?: string;
};

export function addDaysToDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function presetToDateRange(
  preset: StudiedWordsPreset,
  today = localDateKey(),
): StudiedWordsDateRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDaysToDateKey(today, -1);
      return { from: day, to: day };
    }
    case "twoDaysAgo": {
      const day = addDaysToDateKey(today, -2);
      return { from: day, to: day };
    }
    case "lastWeek":
      return { from: addDaysToDateKey(today, -6), to: today };
  }
}

export function isRangeValid(range: StudiedWordsDateRange): boolean {
  return !!(range.from || range.to);
}

export function normalizeRange(
  range: StudiedWordsDateRange,
): StudiedWordsDateRange {
  const from = range.from || undefined;
  const to = range.to || undefined;
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}
