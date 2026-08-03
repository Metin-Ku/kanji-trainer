import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { getLevelDistribution, type LevelMode } from "@/lib/progressStats";
import type { Word } from "@/lib/types";
import { useTheme } from "@/theme/ThemeProvider";

const MODES: LevelMode[] = ["word", "pron", "meaning"];

type Props = {
  words: Word[];
};

function barColor(
  key: string,
  theme: ReturnType<typeof useTheme>["theme"],
): string {
  if (key === "star") return theme.starColor;
  const n = Number(key);
  if (n >= 1 && n <= 5) return theme.levelColor(n, n);
  return theme.appBorderStrong;
}

export function LevelDistributionChart({ words }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [mode, setMode] = useState<LevelMode>("word");

  const buckets = useMemo(
    () => getLevelDistribution(words, mode),
    [words, mode],
  );
  const max = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.count)),
    [buckets],
  );

  const modeLabel = (m: LevelMode) => {
    if (m === "word") return t("progress.levelMode.word");
    if (m === "pron") return t("progress.levelMode.pron");
    return t("progress.levelMode.meaning");
  };

  return (
    <View>
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.modeChip, mode === m && styles.modeChipActive]}
          >
            <Text
              style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}
            >
              {modeLabel(m)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rows}>
        {buckets.map((b) => (
          <View key={b.key} style={styles.row}>
            <Text style={styles.rowLabel}>{b.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(b.count / max) * 100}%`,
                    backgroundColor: barColor(b.key, theme),
                    minWidth: b.count > 0 ? 4 : 0,
                  },
                ]}
              />
            </View>
            <Text style={styles.rowCount}>{b.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    modeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    modeChip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.appMuted,
    },
    modeChipActive: {
      backgroundColor: theme.main700,
    },
    modeChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.appTextSecondary,
    },
    modeChipTextActive: {
      color: theme.white,
    },
    rows: {
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowLabel: {
      width: 24,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: theme.appTextSecondary,
    },
    barTrack: {
      flex: 1,
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.appMuted,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 999,
    },
    rowCount: {
      width: 32,
      textAlign: "right",
      fontSize: 12,
      color: theme.appTextSecondary,
    },
  });
}
