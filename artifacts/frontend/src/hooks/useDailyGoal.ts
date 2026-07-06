import { useCallback, useSyncExternalStore } from "react";
import {
  DAILY_GOAL_CHANGED_EVENT,
  getDailyGoalProgress,
  setDeckDailyTarget,
  type DailyGoalDeckId,
  type DailyGoalProgress,
} from "../lib/dailyGoal";

function subscribe(onStoreChange: () => void): () => void {
  const onChange = () => {
    cachedSnapshot = null;
    cachedSnapshotKey = "";
    onStoreChange();
  };
  window.addEventListener(DAILY_GOAL_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(DAILY_GOAL_CHANGED_EVENT, onChange);
}

let cachedSnapshot: DailyGoalProgress | null = null;
let cachedSnapshotKey = "";

function progressCacheKey(p: DailyGoalProgress): string {
  const deckPart = p.decks
    .map((d) => `${d.deck}:${d.count}:${d.target}:${d.goalMet}`)
    .join("|");
  return `${p.dateKey}:${p.count}:${p.target}:${p.streak}:${p.goalMet}:${deckPart}`;
}

function getSnapshot(): DailyGoalProgress {
  const next = getDailyGoalProgress();
  const key = progressCacheKey(next);
  if (cachedSnapshot && cachedSnapshotKey === key) {
    return cachedSnapshot;
  }
  cachedSnapshot = next;
  cachedSnapshotKey = key;
  return next;
}

export function useDailyGoal() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setDeckTarget = useCallback((deck: DailyGoalDeckId, target: number) => {
    setDeckDailyTarget(deck, target);
  }, []);

  return { ...progress, setDeckTarget };
}
