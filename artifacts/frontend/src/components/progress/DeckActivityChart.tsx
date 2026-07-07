import { useMemo } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import { srsDeckLabel } from "../../i18n/srsDeckLabels";
import { DAILY_GOAL_DECK_IDS } from "../../lib/dailyGoal";
import {
  getDailyTotals,
  SRS_DECK_CHART_COLORS,
} from "../../lib/progressStats";
import type { DailyGoalDeckId } from "../../lib/dailyGoal";

type DeckActivityChartProps = {
  activityByDate: Record<string, Partial<Record<DailyGoalDeckId, number>>>;
  days?: number;
};

export function DeckActivityChart({
  activityByDate,
  days = 84,
}: DeckActivityChartProps) {
  const { t } = useTranslation();
  const daily = useMemo(
    () => getDailyTotals(activityByDate, days),
    [activityByDate, days],
  );

  const maxTotal = useMemo(
    () => Math.max(1, ...daily.map((d) => d.total)),
    [daily],
  );

  // Show ~12 weekly buckets as grouped bars for readability on mobile
  const weeks = useMemo(() => {
    const buckets: {
      label: string;
      byDeck: Record<DailyGoalDeckId, number>;
      total: number;
    }[] = [];
    for (let i = 0; i < daily.length; i += 7) {
      const slice = daily.slice(i, i + 7);
      const byDeck = {} as Record<DailyGoalDeckId, number>;
      for (const deck of DAILY_GOAL_DECK_IDS) {
        byDeck[deck] = slice.reduce((s, d) => s + d.byDeck[deck], 0);
      }
      const total = slice.reduce((s, d) => s + d.total, 0);
      const start = slice[0]?.date ?? "";
      buckets.push({ label: start.slice(5), byDeck, total });
    }
    return buckets;
  }, [daily]);

  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        {DAILY_GOAL_DECK_IDS.map((deck) => (
          <div key={deck} className="flex items-center gap-1.5 text-xs text-app-text-secondary">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: SRS_DECK_CHART_COLORS[deck] }}
            />
            {srsDeckLabel(t, deck).title}
          </div>
        ))}
      </div>

      <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
        {weeks.map((week) => (
          <div
            key={week.label}
            className="flex flex-col justify-end items-center gap-1 shrink-0"
            style={{ width: 28 }}
            title={t("progress.deckChart.weekTotal", { count: week.total })}
          >
            <div
              className="w-full flex flex-col-reverse rounded-sm overflow-hidden bg-app-muted"
              style={{
                height: `${Math.max(week.total > 0 ? 4 : 0, (week.total / maxWeek) * 100)}%`,
                minHeight: week.total > 0 ? 4 : 0,
              }}
            >
              {DAILY_GOAL_DECK_IDS.map((deck) => {
                const n = week.byDeck[deck];
                if (n <= 0) return null;
                return (
                  <div
                    key={deck}
                    style={{
                      height: `${(n / week.total) * 100}%`,
                      background: SRS_DECK_CHART_COLORS[deck],
                      minHeight: n > 0 ? 2 : 0,
                    }}
                  />
                );
              })}
            </div>
            <span className="text-[9px] text-app-text-muted tabular-nums">{week.label}</span>
          </div>
        ))}
      </div>

      {maxTotal <= 1 && weeks.every((w) => w.total === 0) && (
        <p className="text-xs text-app-text-muted text-center mt-2">
          {t("progress.deckChart.empty")}
        </p>
      )}
    </div>
  );
}
