import { useMemo } from "react";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { useTranslation } from "../../i18n/I18nProvider";
import { srsDeckLabel } from "../../i18n/srsDeckLabels";
import { DAILY_GOAL_DECK_IDS } from "../../lib/dailyGoal";
import { getDailyTotals, SRS_DECK_CHART_COLORS } from "../../lib/progressStats";
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
    <div className="w-full max-w-full min-w-0">
      <div className="mb-4 flex flex-wrap gap-3">
        {DAILY_GOAL_DECK_IDS.map((deck) => (
          <div
            key={deck}
            className="text-app-text-secondary flex items-center gap-1.5 text-xs"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: SRS_DECK_CHART_COLORS[deck] }}
            />
            {srsDeckLabel(t, deck).title}
          </div>
        ))}
      </div>

      <HorizontalScroll
        scrollDeps={[weeks.length, days]}
        isTouchable={true}
        className="pb-1"
      >
        <div className="flex h-32 w-max min-w-full items-end gap-1">
          {weeks.map((week) => (
            <div
              key={week.label}
              className="flex shrink-0 flex-col items-center justify-end gap-1"
              style={{ width: 28 }}
              title={t("progress.deckChart.weekTotal", { count: week.total })}
            >
              <div
                className="bg-app-muted flex w-full flex-col-reverse overflow-hidden rounded-sm"
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
              <span className="text-app-text-muted text-[9px] tabular-nums">
                {week.label}
              </span>
            </div>
          ))}
        </div>
      </HorizontalScroll>

      {maxTotal <= 1 && weeks.every((w) => w.total === 0) && (
        <p className="text-app-text-muted mt-2 text-center text-xs">
          {t("progress.deckChart.empty")}
        </p>
      )}
    </div>
  );
}
