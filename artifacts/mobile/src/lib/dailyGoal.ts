import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SrsDeckType } from "@/types/srs";

export const DAILY_GOAL_STORAGE_KEY = "kanji-trainer-daily-goal";
export const DAILY_GOAL_CHANGED_EVENT = "daily-goal-changed";

export type DailyGoalDeckId = SrsDeckType;

export const DAILY_GOAL_DECK_IDS: DailyGoalDeckId[] = [
  "word",
  "pronunciation",
  "meaning",
  "example",
  "drawing",
];

export const DEFAULT_DECK_TARGET = 5;
export const MIN_DAILY_TARGET = 0;
export const MAX_DAILY_TARGET = 100;
export const DAILY_TARGET_PRESETS = [5, 10, 15, 20, 30] as const;

export interface DailyGoalData {
  targets: Record<DailyGoalDeckId, number>;
}

export interface DeckDailyProgress {
  deck: DailyGoalDeckId;
  count: number;
  target: number;
  remaining: number;
  goalMet: boolean;
  progressRatio: number;
  enabled: boolean;
}

export interface DailyGoalProgress {
  dateKey: string;
  count: number;
  target: number;
  remaining: number;
  goalMet: boolean;
  streak: number;
  progressRatio: number;
  decks: DeckDailyProgress[];
}

const DEFAULT_TARGETS: Record<DailyGoalDeckId, number> = {
  word: 10,
  pronunciation: 5,
  meaning: 5,
  example: 5,
  drawing: 5,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeDailyGoal(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function notifyDailyGoalChanged(): void {
  listeners.forEach((fn) => fn());
}

function emptyTargets(): Record<DailyGoalDeckId, number> {
  return { ...DEFAULT_TARGETS };
}

function clampTarget(target: number): number {
  return Math.min(MAX_DAILY_TARGET, Math.max(MIN_DAILY_TARGET, Math.round(target)));
}

export function localDateKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

export function intervalCountsAsDailyLearn(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || trimmed === "<1m") return false;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(m|h|d|mo|yr)$/);
  if (!match) return false;
  const value = parseFloat(match[1]!);
  const unit = match[2]!;
  switch (unit) {
    case "m":
      return false;
    case "h":
      return value >= 24;
    case "d":
    case "mo":
    case "yr":
      return true;
    default:
      return false;
  }
}

function normalizeTargets(
  raw: Partial<Record<DailyGoalDeckId, number>> | undefined,
  legacyTarget?: number,
): Record<DailyGoalDeckId, number> {
  const targets = emptyTargets();
  if (legacyTarget != null) targets.word = clampTarget(legacyTarget);
  if (raw && typeof raw === "object") {
    for (const deck of DAILY_GOAL_DECK_IDS) {
      if (typeof raw[deck] === "number") targets[deck] = clampTarget(raw[deck]!);
    }
  }
  return targets;
}

function normalizeTargetsData(
  raw: Partial<DailyGoalData> & { target?: number } | null | undefined,
): DailyGoalData {
  if (!raw || typeof raw !== "object") return { targets: emptyTargets() };
  return { targets: normalizeTargets(raw.targets, raw.target) };
}

export async function getDailyGoalDataAsync(): Promise<DailyGoalData> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_GOAL_STORAGE_KEY);
    if (!raw) return getCachedDailyGoalData();
    return normalizeTargetsData(JSON.parse(raw));
  } catch {
    return getCachedDailyGoalData();
  }
}

export function getDailyGoalTargets(): Record<DailyGoalDeckId, number> {
  return { ...DEFAULT_TARGETS };
}

let cachedData: DailyGoalData = { targets: { ...DEFAULT_TARGETS } };

export async function loadDailyGoalData(): Promise<DailyGoalData> {
  const loaded = await getDailyGoalDataAsync();
  const prevKey = JSON.stringify(cachedData.targets);
  cachedData = loaded;
  if (JSON.stringify(loaded.targets) !== prevKey) {
    notifyDailyGoalChanged();
  }
  return cachedData;
}

export function getCachedDailyGoalData(): DailyGoalData {
  return cachedData;
}

async function persistDailyGoal(data: DailyGoalData): Promise<void> {
  cachedData = data;
  await AsyncStorage.setItem(DAILY_GOAL_STORAGE_KEY, JSON.stringify(data));
  notifyDailyGoalChanged();
}

export async function setDeckDailyTarget(
  deck: DailyGoalDeckId,
  target: number,
): Promise<DailyGoalData> {
  const data = getCachedDailyGoalData();
  const next = {
    ...data,
    targets: { ...data.targets, [deck]: clampTarget(target) },
  };
  await persistDailyGoal(next);
  return next;
}

function deckProgress(
  deck: DailyGoalDeckId,
  count: number,
  target: number,
): DeckDailyProgress {
  const enabled = target > 0;
  const goalMet = enabled && count >= target;
  const remaining = enabled ? Math.max(0, target - count) : 0;
  const progressRatio = enabled && target > 0 ? Math.min(1, count / target) : 0;
  return { deck, count, target, remaining, goalMet, progressRatio, enabled };
}

export function computeStreak(
  activityByDate: Record<string, Partial<Record<DailyGoalDeckId, number>>>,
  targets: Record<DailyGoalDeckId, number>,
  today = new Date(),
): number {
  const totalTarget = DAILY_GOAL_DECK_IDS.reduce(
    (sum, deck) => sum + (targets[deck] > 0 ? targets[deck] : 0),
    0,
  );
  if (totalTarget <= 0) return 0;

  const totalForDate = (dateKey: string) =>
    DAILY_GOAL_DECK_IDS.reduce(
      (sum, deck) => sum + (activityByDate[dateKey]?.[deck] ?? 0),
      0,
    );

  const todayKey = localDateKey(today);
  const cursor = new Date(today);
  if (totalForDate(todayKey) < totalTarget) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const key = localDateKey(cursor);
    if (totalForDate(key) >= totalTarget) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function buildDailyGoalProgress(
  activityByDate: Record<string, Partial<Record<DailyGoalDeckId, number>>>,
  targets: Record<DailyGoalDeckId, number>,
  today = new Date(),
): DailyGoalProgress {
  const dateKey = localDateKey(today);
  const dayActivity = activityByDate[dateKey] ?? {};
  const decks = DAILY_GOAL_DECK_IDS.map((deck) =>
    deckProgress(deck, dayActivity[deck] ?? 0, targets[deck]),
  );
  const enabledDecks = decks.filter((d) => d.enabled);
  const count = decks.reduce((sum, d) => sum + d.count, 0);
  const target = enabledDecks.reduce((sum, d) => sum + d.target, 0);
  const goalMet = target > 0 && count >= target;
  const remaining = Math.max(0, target - count);
  const progressRatio = target > 0 ? Math.min(1, count / target) : 0;
  const streak = computeStreak(activityByDate, targets, today);
  return {
    dateKey,
    count,
    target,
    remaining,
    goalMet,
    streak,
    progressRatio,
    decks,
  };
}
