import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "@/i18n/I18nProvider";
import { srsDeckLabel } from "@/i18n/srsDeckLabels";
import { DAILY_GOAL_DECK_IDS } from "@/lib/dailyGoal";
import {
  getDailyTotals,
  getSrsDeckChartColors,
} from "@/lib/progressStats";
import type { DailyGoalDeckId } from "@/lib/dailyGoal";
import type { ActivityByDate } from "@/hooks/useStudyActivity";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  activityByDate: ActivityByDate;
  days?: number;
};

export function DeckActivityChart({ activityByDate, days = 84 }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const deckColors = useMemo(() => getSrsDeckChartColors(theme), [theme]);

  const daily = useMemo(
    () => getDailyTotals(activityByDate, days),
    [activityByDate, days],
  );

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
  const isEmpty = weeks.every((w) => w.total === 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        {DAILY_GOAL_DECK_IDS.map((deck) => (
          <View key={deck} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: deckColors[deck] }]}
            />
            <Text style={styles.legendText}>{srsDeckLabel(t, deck).title}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartRow}
      >
        {weeks.map((week) => (
          <View key={week.label} style={styles.barCol}>
            <View
              style={[
                styles.barTrack,
                {
                  height: `${Math.max(
                    week.total > 0 ? 4 : 0,
                    (week.total / maxWeek) * 100,
                  )}%`,
                  minHeight: week.total > 0 ? 4 : 0,
                },
              ]}
            >
              {DAILY_GOAL_DECK_IDS.map((deck) => {
                const n = week.byDeck[deck];
                if (n <= 0) return null;
                return (
                  <View
                    key={deck}
                    style={{
                      height: `${(n / week.total) * 100}%`,
                      backgroundColor: deckColors[deck],
                      minHeight: n > 0 ? 2 : 0,
                    }}
                  />
                );
              })}
            </View>
            <Text style={styles.barLabel}>{week.label}</Text>
          </View>
        ))}
      </ScrollView>

      {isEmpty ? (
        <Text style={styles.empty}>{t("progress.deckChart.empty")}</Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    wrap: {
      width: "100%",
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    legendText: {
      fontSize: 12,
      color: theme.appTextSecondary,
    },
    chartRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 128,
      gap: 4,
      paddingBottom: 4,
    },
    barCol: {
      width: 28,
      height: "100%",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    barTrack: {
      width: "100%",
      flexDirection: "column-reverse",
      overflow: "hidden",
      borderRadius: 2,
      backgroundColor: theme.appMuted,
    },
    barLabel: {
      fontSize: 9,
      color: theme.appTextMuted,
    },
    empty: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 12,
      color: theme.appTextMuted,
    },
  });
}
