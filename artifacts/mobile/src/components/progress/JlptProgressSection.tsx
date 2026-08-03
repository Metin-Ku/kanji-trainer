import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { getJlptCompletion, type LevelMode } from "@/lib/progressStats";
import type { Word } from "@/lib/types";
import { useTheme } from "@/theme/ThemeProvider";

const MODES: LevelMode[] = ["word", "pron", "meaning"];

type Props = {
  words: Word[];
};

export function JlptProgressSection({ words }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [mode, setMode] = useState<LevelMode>("word");

  const bands = useMemo(() => getJlptCompletion(words, mode), [words, mode]);

  const modeLabel = (m: LevelMode) => {
    if (m === "word") return t("progress.levelMode.word");
    if (m === "pron") return t("progress.levelMode.pron");
    return t("progress.levelMode.meaning");
  };

  const jlptLabel = (jlpt: string) =>
    jlpt === "untagged" ? t("progress.jlpt.untagged") : jlpt;

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

      <View style={styles.bands}>
        {bands.map((band) => (
          <View key={band.jlpt}>
            <View style={styles.bandHead}>
              <Text style={styles.bandTitle}>{jlptLabel(band.jlpt)}</Text>
              <Text style={styles.bandMeta}>
                {band.total === 0
                  ? t("progress.jlpt.noWords")
                  : t("progress.jlpt.count", {
                      learned: band.learned,
                      total: band.total,
                      percent: Math.round(band.ratio * 100),
                    })}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${band.ratio * 100}%`,
                    minWidth: band.learned > 0 ? 4 : 0,
                  },
                ]}
              />
            </View>
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
    bands: {
      gap: 12,
    },
    bandHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
      gap: 8,
    },
    bandTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.appText,
    },
    bandMeta: {
      fontSize: 12,
      color: theme.appTextSecondary,
    },
    barTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.appMuted,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: theme.main500,
    },
  });
}
