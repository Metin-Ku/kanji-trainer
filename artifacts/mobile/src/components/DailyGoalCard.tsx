import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown, Flame } from "lucide-react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { useDailyGoal } from "@/hooks/useDailyGoal";
import { srsDeckLabel } from "@/i18n/srsDeckLabels";
import { useTheme } from "@/theme/ThemeProvider";
import type { DeckDailyProgress } from "@/lib/dailyGoal";
import { ColorScheme } from "@/settings/appSettings";

type Props = {
  variant?: "card" | "banner";
};

function deckLabel(
  t: (key: string) => string,
  deck: DeckDailyProgress["deck"],
): string {
  return srsDeckLabel(t, deck).title;
}

function ProgressBar({
  ratio,
  goalMet,
  theme,
}: {
  ratio: number;
  goalMet: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.appSurface, overflow: "hidden" }}>
      <View
        style={{
          height: "100%",
          width: `${Math.round(ratio * 100)}%`,
          backgroundColor: goalMet ? theme.main500 : theme.main400,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

export function DailyGoalCard({ variant = "card" }: Props) {
  const { t } = useTranslation();
  const { theme, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(theme, colorScheme), [theme, colorScheme]);
  const { count, target, remaining, goalMet, streak, progressRatio, decks } =
    useDailyGoal();
  const [expanded, setExpanded] = useState(false);

  const progressLabel = t("dailyGoal.progress", { count, target });
  const statusLabel = goalMet
    ? t("dailyGoal.complete")
    : t("dailyGoal.remaining", { count: remaining });
  const enabledDecks = decks.filter((d) => d.enabled);

  return (
    <View style={[styles.shell, variant === "banner" && styles.shellBanner]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.kicker}>{t("dailyGoal.title")}</Text>
              {goalMet ? <Check size={14} color={theme.main500} strokeWidth={2.5} /> : null}
            </View>
            <Text style={[styles.progress, variant === "banner" && styles.progressBanner]}>
              {progressLabel}
            </Text>
            <Text style={styles.status}>{statusLabel}</Text>
          </View>
          <View style={styles.topRight}>
            {streak > 0 ? (
              <View style={styles.streakBadge}>
                <Flame size={variant === "banner" ? 14 : 16} color={theme.main500} />
                <Text style={styles.streakNum}>{streak}</Text>
              </View>
            ) : variant !== "banner" ? (
              <Text style={styles.streakNone}>{t("dailyGoal.streakNone")}</Text>
            ) : null}
            <ChevronDown
              size={18}
              color={theme.appTextMuted}
              style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
            />
          </View>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar ratio={progressRatio} goalMet={goalMet} theme={theme} />
        </View>
        {variant === "banner" && streak > 0 ? (
          <Text style={styles.streakLabel}>{t("dailyGoal.streak", { days: streak })}</Text>
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          <Text style={styles.detailsTitle}>{t("dailyGoal.byDeck")}</Text>
          {enabledDecks.length === 0 ? (
            <Text style={styles.detailsEmpty}>{t("dailyGoal.noDeckTargets")}</Text>
          ) : (
            enabledDecks.map((deck) => (
              <View key={deck.deck} style={styles.deckRow}>
                <View style={styles.deckHead}>
                  <View style={styles.deckLabelRow}>
                    <Text style={styles.deckName}>{deckLabel(t, deck.deck)}</Text>
                    {deck.goalMet ? (
                      <Check size={12} color={theme.main500} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <Text style={styles.deckCount}>
                    {t("dailyGoal.progress", { count: deck.count, target: deck.target })}
                  </Text>
                </View>
                <ProgressBar ratio={deck.progressRatio} goalMet={deck.goalMet} theme={theme} />
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"], colorScheme: ColorScheme) {
  const isDark = colorScheme === "dark";
  return StyleSheet.create({
    shell: {
      marginTop: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? theme.main900 : theme.main200,
      backgroundColor: theme.appAccent,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    shellBanner: { marginTop: 0 },
    topRow: { flexDirection: "row", gap: 12 },
    topLeft: { flex: 1, minWidth: 0 },
    topRight: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    kicker: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.appTextSecondary,
    },
    progress: { fontSize: 18, fontWeight: "700", color: theme.appText },
    progressBanner: { fontSize: 14 },
    status: { fontSize: 12, color: theme.appTextSecondary, marginTop: 2 },
    streakBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: theme.appBorder,
      backgroundColor: theme.appSurface,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    streakNum: { fontSize: 13, fontWeight: "700", color: theme.main600 ?? theme.main500 },
    streakNone: {
      fontSize: 11,
      color: theme.appTextMuted,
      maxWidth: 96,
      textAlign: "right",
    },
    barWrap: { marginTop: 10 },
    streakLabel: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "600",
      color: theme.main600 ?? theme.main500,
    },
    details: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.appBorder,
      marginTop: 12,
      paddingTop: 12,
      gap: 12,
    },
    detailsTitle: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.appTextMuted,
    },
    detailsEmpty: { fontSize: 12, color: theme.appTextMuted },
    deckRow: { gap: 6 },
    deckHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    deckLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
    deckName: { fontSize: 13, fontWeight: "600", color: theme.appText },
    deckCount: { fontSize: 12, fontWeight: "600", color: theme.appTextSecondary },
  });
}
