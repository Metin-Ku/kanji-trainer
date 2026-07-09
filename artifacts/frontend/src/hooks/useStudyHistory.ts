import { useStudyActivity } from "./useStudyActivity";

export function useStudyHistory() {
  const { activityByDate } = useStudyActivity();
  return activityByDate;
}
