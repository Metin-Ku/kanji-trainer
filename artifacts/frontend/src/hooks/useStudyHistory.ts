import { useSyncExternalStore } from "react";
import {
  DAILY_GOAL_CHANGED_EVENT,
  getDailyGoalData,
  type DailyGoalData,
} from "../lib/dailyGoal";

function subscribe(onStoreChange: () => void): () => void {
  const onChange = () => {
    cachedKey = "";
    cachedSnapshot = null;
    onStoreChange();
  };
  window.addEventListener(DAILY_GOAL_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(DAILY_GOAL_CHANGED_EVENT, onChange);
}

let cachedKey = "";
let cachedSnapshot: DailyGoalData | null = null;

function getSnapshot(): DailyGoalData {
  const next = getDailyGoalData();
  const key = JSON.stringify(next.activityByDate);
  if (cachedKey === key && cachedSnapshot) return cachedSnapshot;
  cachedKey = key;
  cachedSnapshot = next;
  return next;
}

export function useStudyHistory() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return data.activityByDate;
}
