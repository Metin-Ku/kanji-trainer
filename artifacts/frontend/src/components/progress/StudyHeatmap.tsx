import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  getHeatmapCells,
  HEATMAP_LEVEL_CLASSES,
  type HeatmapCell,
} from "../../lib/progressStats";

type StudyHeatmapProps = {
  activityByDate: Record<string, Partial<Record<string, number>>>;
  weeks?: number;
  compact?: boolean;
};

function formatTooltipDate(dateKey: string, dateLocale: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function chunkWeeks(cells: HeatmapCell[], weeks: number): HeatmapCell[][] {
  const cols: HeatmapCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    cols.push(cells.slice(w * 7, w * 7 + 7));
  }
  return cols;
}

export function StudyHeatmap({
  activityByDate,
  weeks = 26,
  compact = false,
}: StudyHeatmapProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  const [tip, setTip] = useState<{ date: string; count: number } | null>(null);

  const cells = useMemo(
    () => getHeatmapCells(activityByDate, weeks),
    [activityByDate, weeks],
  );
  const columns = useMemo(() => chunkWeeks(cells, weeks), [cells, weeks]);

  const cellSize = compact ? "w-2.5 h-2.5" : "w-3 h-3";
  const gap = compact ? "gap-0.5" : "gap-1";

  return (
    <div>
      {tip && (
        <p className={`text-xs text-gray-500 mb-2 ${compact ? "text-[10px]" : ""}`}>
          {t("progress.heatmap.tooltip", {
            date: formatTooltipDate(tip.date, dateLocale),
            count: tip.count,
          })}
        </p>
      )}
      <div className={`flex ${gap} overflow-x-auto pb-1`}>
        {columns.map((col, wi) => (
          <div key={wi} className={`flex flex-col ${gap}`}>
            {col.map((cell) => (
              <div
                key={cell.date}
                role="img"
                aria-label={t("progress.heatmap.tooltip", {
                  date: formatTooltipDate(cell.date, dateLocale),
                  count: cell.count,
                })}
                className={`${cellSize} rounded-sm ${HEATMAP_LEVEL_CLASSES[cell.level]} shrink-0`}
                onMouseEnter={() => setTip({ date: cell.date, count: cell.count })}
                onMouseLeave={() => setTip(null)}
                onClick={() => setTip({ date: cell.date, count: cell.count })}
              />
            ))}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
          <span>{t("progress.heatmap.less")}</span>
          {HEATMAP_LEVEL_CLASSES.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>{t("progress.heatmap.more")}</span>
        </div>
      )}
    </div>
  );
}
