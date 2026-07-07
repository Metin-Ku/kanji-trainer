import {
  DAILY_GOAL_DECK_IDS,
  localDateKey,
  type DailyGoalDeckId,
} from "./dailyGoal";
import type { Word } from "../types";
import type { SrsDeckType } from "../types/srs";

export type LevelMode = "word" | "pron" | "meaning";

export type DailyActivity = {
  date: string;
  total: number;
  byDeck: Record<DailyGoalDeckId, number>;
};

export type HeatmapCell = {
  date: string;
  count: number;
  /** 0 = empty, 1-4 = intensity bucket */
  level: number;
};

export type LevelBucket = {
  key: string;
  label: string;
  count: number;
};

export type JlptBand = {
  jlpt: string;
  learned: number;
  total: number;
  ratio: number;
};

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"] as const;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function totalForDay(
  activity: Record<string, Partial<Record<DailyGoalDeckId, number>>>,
  dateKey: string,
): number {
  const day = activity[dateKey] ?? {};
  return DAILY_GOAL_DECK_IDS.reduce((sum, deck) => sum + (day[deck] ?? 0), 0);
}

export function getDailyTotals(
  activityByDate: Record<string, Partial<Record<DailyGoalDeckId, number>>>,
  days: number,
  endDate = new Date(),
): DailyActivity[] {
  const out: DailyActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    const dateKey = localDateKey(date);
    const day = activityByDate[dateKey] ?? {};
    const byDeck = {} as Record<DailyGoalDeckId, number>;
    for (const deck of DAILY_GOAL_DECK_IDS) {
      byDeck[deck] = day[deck] ?? 0;
    }
    out.push({
      date: dateKey,
      total: DAILY_GOAL_DECK_IDS.reduce((s, d) => s + byDeck[d], 0),
      byDeck,
    });
  }
  return out;
}

export function heatmapIntensity(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function getHeatmapCells(
  activityByDate: Record<string, Partial<Record<DailyGoalDeckId, number>>>,
  weeks = 26,
  endDate = new Date(),
): HeatmapCell[] {
  const totalDays = weeks * 7;
  const start = addDays(endDate, -(totalDays - 1));

  // Align to Sunday (GitHub-style columns)
  const startDow = start.getDay();
  const gridStart = addDays(start, -startDow);
  const gridDays = weeks * 7;

  const raw: HeatmapCell[] = [];
  for (let i = 0; i < gridDays; i++) {
    const date = addDays(gridStart, i);
    const dateKey = localDateKey(date);
    const count = totalForDay(activityByDate, dateKey);
    raw.push({ date: dateKey, count, level: 0 });
  }

  const endMs = endDate.getTime();
  const startMs = start.getTime();

  const inRange = raw.filter((c) => {
    const t = parseDateKey(c.date).getTime();
    return t >= startMs && t <= endMs;
  });
  const maxCount = Math.max(1, ...inRange.map((c) => c.count));

  return raw.map((c) => ({
    ...c,
    level: heatmapIntensity(c.count, maxCount),
  }));
}

export function getLevelDistribution(
  words: Word[],
  mode: LevelMode,
): LevelBucket[] {
  const counts: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    star: 0,
  };

  for (const w of words) {
    let level: number;
    let starred: boolean;
    if (mode === "pron") {
      level = w.pronLevel;
      starred = w.pronStarred;
    } else if (mode === "meaning") {
      level = w.meaningLevel;
      starred = w.meaningStarred;
    } else {
      level = w.level;
      starred = w.starred;
    }
    if (starred) counts.star!++;
    else counts[String(Math.min(5, Math.max(1, level)))]!++;
  }

  return [
    { key: "1", label: "1", count: counts["1"]! },
    { key: "2", label: "2", count: counts["2"]! },
    { key: "3", label: "3", count: counts["3"]! },
    { key: "4", label: "4", count: counts["4"]! },
    { key: "5", label: "5", count: counts["5"]! },
    { key: "star", label: "★", count: counts.star! },
  ];
}

function isLearnedWord(w: Word, mode: LevelMode): boolean {
  if (mode === "pron") return w.pronStarred || w.pronLevel >= 5;
  if (mode === "meaning") return w.meaningStarred || w.meaningLevel >= 5;
  return w.starred || w.level >= 5;
}

export function getJlptCompletion(words: Word[], mode: LevelMode): JlptBand[] {
  const bands: JlptBand[] = JLPT_ORDER.map((jlpt) => {
    const inBand = words.filter((w) => w.jlptLevel === jlpt);
    const learned = inBand.filter((w) => isLearnedWord(w, mode)).length;
    const total = inBand.length;
    return {
      jlpt,
      learned,
      total,
      ratio: total > 0 ? learned / total : 0,
    };
  });

  const untagged = words.filter((w) => !w.jlptLevel);
  if (untagged.length > 0) {
    const learned = untagged.filter((w) => isLearnedWord(w, mode)).length;
    bands.push({
      jlpt: "untagged",
      learned,
      total: untagged.length,
      ratio: learned / untagged.length,
    });
  }

  return bands;
}

export const SRS_DECK_CHART_COLORS: Record<SrsDeckType, string> = {
  word: "var(--main-500)",
  pronunciation: "var(--main-400)",
  meaning: "var(--main-300)",
  example: "var(--main-200)",
};

export const HEATMAP_LEVEL_CLASSES = [
  "bg-gray-100",
  "bg-main-100",
  "bg-main-200",
  "bg-main-400",
  "bg-main-600",
] as const;
