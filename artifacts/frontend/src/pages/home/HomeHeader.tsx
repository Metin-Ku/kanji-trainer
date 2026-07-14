import { useLocation } from "wouter";
import { Settings, Layers, BarChart2 } from "lucide-react";
import { SearchBar } from "../../components/SearchBar";
import { DailyGoalCard } from "../../components/DailyGoalCard";
import { MiniHeatmapStrip } from "../../components/progress/MiniHeatmapStrip";
import { useTranslation } from "../../i18n/I18nProvider";
import type { ActivityByDate } from "../../hooks/useStudyActivity";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  isSearching: boolean;
  activityByDate: ActivityByDate;
  activityLoading: boolean;
}

export function HomeHeader({
  query,
  onQueryChange,
  isSearching,
  activityByDate,
  activityLoading,
}: Props) {
  const { t, formatToday } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="bg-app-surface border-b border-app-border px-5 pt-4 pb-5 shrink-0">
      <div className="flex items-center justify-between gap-3 mb-0.5">
        <p className="text-[11px] font-semibold text-main-500 dark:text-main-600 uppercase tracking-widest">
          {t("home.appSubtitle")}
        </p>
        <div className="flex items-center gap-0.5 -mr-2 -mt-1">
          <button
            onClick={() => navigate("/srs")}
            className="p-2 rounded-xl text-app-text-muted hover:text-main-500 dark:hover:text-main-600 hover:bg-app-accent transition-colors"
            aria-label={t("a11y.srs")}
          >
            <Layers size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate("/progress")}
            className="p-2 rounded-xl text-app-text-muted hover:text-main-500 dark:hover:text-main-600 hover:bg-app-accent transition-colors"
            aria-label={t("a11y.progress")}
          >
            <BarChart2 size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-xl text-app-text-muted hover:text-main-500 dark:hover:text-main-600 hover:bg-app-accent transition-colors"
            aria-label={t("a11y.settings")}
          >
            <Settings size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
      <h1 className="text-xl font-bold text-app-text mb-3">{formatToday()}</h1>
      <SearchBar
        value={query}
        onChange={onQueryChange}
        placeholder={t("home.searchPlaceholder")}
      />
      {!isSearching && (
        <>
          <DailyGoalCard />
          <div className="mt-3">
            <MiniHeatmapStrip
              isMainPage={true}
              activityByDate={activityByDate}
              isActivityLoading={activityLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
