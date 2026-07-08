import { useLocation } from "wouter";
import { useTranslation } from "../../i18n/I18nProvider";
import { StudyHeatmap } from "./StudyHeatmap";

type MiniHeatmapStripProps = {
  activityByDate: Record<string, Partial<Record<string, number>>>;
};

export function MiniHeatmapStrip({ activityByDate }: MiniHeatmapStripProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="w-full rounded-sm border border-main-200 dark:border-main-900 bg-app-surface/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider mb-2">
        {t("progress.miniHeatmap.title")}
      </p>
      <StudyHeatmap
        activityByDate={activityByDate}
        range={{ kind: "ytd" }}
        compact
        onTap={() => navigate("/progress")}
      />
    </div>
  );
}
