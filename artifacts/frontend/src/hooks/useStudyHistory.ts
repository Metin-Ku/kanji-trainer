import { useStudyActivity } from "./useStudyActivity";

export function useStudyHistory() {
  const { activityByDate, isLoading } = useStudyActivity();
  return { activityByDate, isLoading };
}
