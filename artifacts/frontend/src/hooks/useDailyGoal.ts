import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  DAILY_GOAL_CHANGED_EVENT,
  computeStreak,
  DAILY_GOAL_DECK_IDS,
  getDailyGoalTargets,
  localDateKey,
  setDeckDailyTarget,
  type DailyGoalDeckId,
  type DailyGoalProgress,
} from "../lib/dailyGoal";
import { useStudyActivity } from "./useStudyActivity";

let cachedTargetsKey = "";
let cachedTargets: ReturnType<typeof getDailyGoalTargets> | null = null;

function subscribe(onStoreChange: () => void): () => void {
  const onChange = () => {
    cachedTargetsKey = "";
    cachedTargets = null;
    onStoreChange();
  };
  window.addEventListener(DAILY_GOAL_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(DAILY_GOAL_CHANGED_EVENT, onChange);
}

function getTargetsSnapshot() {
  const next = getDailyGoalTargets();
  const key = JSON.stringify(next);
  if (cachedTargetsKey === key && cachedTargets) return cachedTargets;
  cachedTargetsKey = key;
  cachedTargets = next;
  return next;
}

function buildProgress(
  activityByDate: Record<string, Partial<Record<DailyGoalDeckId, number>>>,
  today = new Date(),
): DailyGoalProgress {
  const targets = getDailyGoalTargets();
  const dateKey = localDateKey(today);
  const dayActivity = activityByDate[dateKey] ?? {};

  const decks = DAILY_GOAL_DECK_IDS.map((deck) => {
    const count = dayActivity[deck] ?? 0;
    const target = targets[deck];
    const enabled = target > 0;
    const goalMet = enabled && count >= target;
    const remaining = enabled ? Math.max(0, target - count) : 0;
    const progressRatio = enabled && target > 0 ? Math.min(1, count / target) : 0;
    return { deck, count, target, remaining, goalMet, progressRatio, enabled };
  });

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

export function useDailyGoal() {
  const { activityByDate, isLoading } = useStudyActivity();
  const targets = useSyncExternalStore(subscribe, getTargetsSnapshot, getTargetsSnapshot);

  const progress = useMemo(
    () => buildProgress(activityByDate),
    [activityByDate, targets],
  );

  const setDeckTarget = useCallback((deck: DailyGoalDeckId, target: number) => {
    setDeckDailyTarget(deck, target);
  }, []);

  return { ...progress, isLoading, setDeckTarget };
}
