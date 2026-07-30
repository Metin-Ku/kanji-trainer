import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import {
  type DailyGoalDeckId,
} from "@/lib/dailyGoal";

export type ActivityByDate = Record<
  string,
  Partial<Record<DailyGoalDeckId, number>>
>;

const STUDY_ACTIVITY_QUERY_KEY = ["study-activity"] as const;

async function fetchStudyActivity(): Promise<ActivityByDate> {
  const res = await apiFetch("/api/study-activity");
  if (!res.ok) throw new Error("Failed to load study activity");
  const data = (await res.json()) as { activityByDate: ActivityByDate };
  return data.activityByDate;
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

export { STUDY_ACTIVITY_QUERY_KEY };
