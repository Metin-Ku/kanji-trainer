import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  buildDailyGoalProgress,
  getCachedDailyGoalData,
  loadDailyGoalData,
  setDeckDailyTarget,
  subscribeDailyGoal,
  type DailyGoalDeckId,
  type DailyGoalProgress,
} from "@/lib/dailyGoal";
import { useStudyActivity } from "./useStudyActivity";

let cachedTargetsKey = "";
let cachedTargets: ReturnType<typeof getCachedDailyGoalData>["targets"] | null =
  null;

function subscribe(onStoreChange: () => void): () => void {
  return subscribeDailyGoal(() => {
    cachedTargetsKey = "";
    cachedTargets = null;
    onStoreChange();
  });
}

function getTargetsSnapshot() {
  const next = getCachedDailyGoalData().targets;
  const key = JSON.stringify(next);
  if (cachedTargetsKey === key && cachedTargets) return cachedTargets;
  cachedTargetsKey = key;
  cachedTargets = next;
  return next;
}

export function useDailyGoal() {
  const { activityByDate, isLoading: activityLoading } = useStudyActivity();

  useEffect(() => {
    void loadDailyGoalData();
  }, []);

  const targets = useSyncExternalStore(
    subscribe,
    getTargetsSnapshot,
    getTargetsSnapshot,
  );

  const progress: DailyGoalProgress = useMemo(
    () => buildDailyGoalProgress(activityByDate, targets),
    [activityByDate, targets],
  );

  const setDeckTarget = useCallback(
    async (deck: DailyGoalDeckId, target: number) => {
      await setDeckDailyTarget(deck, target);
    },
    [],
  );

  return {
    ...progress,
    isLoading: activityLoading,
    setDeckTarget,
  };
}
