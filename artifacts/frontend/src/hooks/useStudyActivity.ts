import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiOrigin";
import {
  DAILY_GOAL_STORAGE_KEY,
  type DailyGoalDeckId,
} from "../lib/dailyGoal";

export type ActivityByDate = Record<
  string,
  Partial<Record<DailyGoalDeckId, number>>
>;

const STUDY_ACTIVITY_QUERY_KEY = ["study-activity"] as const;

function readLegacyActivity(): ActivityByDate {
  try {
    const raw = localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { activityByDate?: ActivityByDate };
    return parsed.activityByDate ?? {};
  } catch {
    return {};
  }
}

function hasActivity(activityByDate: ActivityByDate): boolean {
  return Object.keys(activityByDate).length > 0;
}

function clearLegacyActivity(): void {
  try {
    const raw = localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    delete parsed.activityByDate;
    localStorage.setItem(DAILY_GOAL_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

async function fetchStudyActivity(): Promise<ActivityByDate> {
  const res = await apiFetch("/api/study-activity");
  if (!res.ok) throw new Error("Failed to load study activity");
  const data = (await res.json()) as { activityByDate: ActivityByDate };

  const legacy = readLegacyActivity();
  if (!hasActivity(legacy)) {
    return data.activityByDate;
  }

  const importRes = await apiFetch("/api/study-activity/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityByDate: legacy }),
  });
  if (!importRes.ok) throw new Error("Failed to import study activity");
  clearLegacyActivity();
  const imported = (await importRes.json()) as { activityByDate: ActivityByDate };
  return imported.activityByDate;
}

export function useStudyActivity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: STUDY_ACTIVITY_QUERY_KEY,
    queryFn: fetchStudyActivity,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const increment = useMutation({
    mutationFn: async ({
      deck,
      units = 1,
      date,
    }: {
      deck: DailyGoalDeckId;
      units?: number;
      date: string;
    }) => {
      const res = await apiFetch("/api/study-activity/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck, units, date }),
      });
      if (!res.ok) throw new Error("Failed to record study unit");
      return (await res.json()) as { activityByDate: ActivityByDate };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(STUDY_ACTIVITY_QUERY_KEY, data.activityByDate);
    },
  });

  return {
    activityByDate: query.data ?? {},
    isLoading: query.isLoading,
    increment,
  };
}

export async function recordStudyUnitOnServer(
  deck: DailyGoalDeckId,
  date: string,
  units = 1,
): Promise<ActivityByDate> {
  const res = await apiFetch("/api/study-activity/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck, units, date }),
  });
  if (!res.ok) throw new Error("Failed to record study unit");
  const data = (await res.json()) as { activityByDate: ActivityByDate };
  return data.activityByDate;
}

export { STUDY_ACTIVITY_QUERY_KEY };
