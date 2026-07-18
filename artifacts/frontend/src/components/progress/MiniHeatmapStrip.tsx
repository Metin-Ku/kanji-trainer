import { useLocation } from "wouter";
import { useTranslation } from "../../i18n/I18nProvider";
import { StudyHeatmap } from "./StudyHeatmap";

type MiniHeatmapStripProps = {
  isMainPage: boolean;
  activityByDate: Record<string, Partial<Record<string, number>>>;
  isActivityLoading?: boolean;
};

export function MiniHeatmapStrip({
  activityByDate,
  isActivityLoading,
}: MiniHeatmapStripProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="border-main-200 dark:border-main-900 bg-app-surface/60 w-full rounded-sm border px-3 py-2.5">
      <p className="text-app-text-secondary mb-2 text-[10px] font-semibold tracking-wider uppercase">
        {t("progress.miniHeatmap.title")}
      </p>
      <StudyHeatmap
        isMainPage={true}
        years={[]}
        heatmapYear={0}
        currentYear={0}
        setHeatmapYear={() => {}}
        activityByDate={activityByDate}
        isActivityLoading={isActivityLoading}
        range={{ kind: "ytd" }}
        compact
        onTap={() => navigate("/progress")}
      />
    </div>
  );
}
