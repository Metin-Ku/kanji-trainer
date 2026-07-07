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
    <button
      type="button"
      onClick={() => navigate("/progress")}
      className="w-full text-left rounded-sm border border-main-100 bg-white/60 px-3 py-2.5 active:bg-main-50/80 transition-colors"
    >
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {t("progress.miniHeatmap.title")}
      </p>
      <StudyHeatmap activityByDate={activityByDate} weeks={7} compact />
    </button>
  );
}
