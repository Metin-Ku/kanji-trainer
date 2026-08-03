import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DAILY_GOAL_DECK_IDS } from "@/lib/dailyGoal";
import {
  presetToDateRange,
  type StudiedWordsDateRange,
  type StudiedWordsPreset,
} from "@/lib/studiedWordsDate";
import { useStudiedWords } from "@/hooks/useStudiedWords";
import { srsDeckLabel } from "@/i18n/srsDeckLabels";
import { useTranslation } from "@/i18n/I18nProvider";
import { CompactWordList } from "@/components/CompactWordList";
import { DatePickerField } from "@/components/DatePickerField";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTheme } from "@/theme/ThemeProvider";
import type { SrsDeckType } from "@/types/srs";

const PRESETS: StudiedWordsPreset[] = [
  "today",
  "yesterday",
  "twoDaysAgo",
  "lastWeek",
];

function PresetChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: active ? theme.main500 : theme.appMuted,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? theme.white : theme.appTextSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DeckStudiedList({
  deck,
  range,
}: {
  deck: SrsDeckType;
  range: StudiedWordsDateRange;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: words = [], isLoading } = useStudiedWords(deck, range);
  const { title } = srsDeckLabel(t, deck);

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.appText }}>
          {title}
        </Text>
        {!isLoading ? (
          <Text style={{ fontSize: 12, color: theme.appTextMuted }}>
            {t("common.wordCount", { count: words.length })}
          </Text>
        ) : null}
      </View>
      {isLoading ? (
        <View
          style={{
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.appBorder,
            borderRadius: 8,
            paddingVertical: 32,
            alignItems: "center",
          }}
        >
          <LoadingSpinner size={22} color={theme.main500} />
        </View>
      ) : (
        <CompactWordList
          words={words}
          emptyMessage={t("progress.studiedWords.empty")}
        />
      )}
    </View>
  );
}

export function StudiedWordsSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [preset, setPreset] = useState<StudiedWordsPreset | null>("today");
  const [range, setRange] = useState<StudiedWordsDateRange>(() =>
    presetToDateRange("today"),
  );

  function applyPreset(next: StudiedWordsPreset) {
    setPreset(next);
    setRange(presetToDateRange(next));
  }

  function updateFrom(value: string) {
    setPreset(null);
    setRange((prev) => ({ ...prev, from: value || undefined }));
  }

  function updateTo(value: string) {
    setPreset(null);
    setRange((prev) => ({ ...prev, to: value || undefined }));
  }

  function presetActive(p: StudiedWordsPreset) {
    if (preset !== p) return false;
    const expected = presetToDateRange(p);
    return range.from === expected.from && range.to === expected.to;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("progress.sections.studiedWords")}</Text>

      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <PresetChip
            key={p}
            label={t(`progress.studiedWords.presets.${p}`)}
            active={presetActive(p)}
            onPress={() => applyPreset(p)}
          />
        ))}
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{t("progress.studiedWords.startDate")}</Text>
          <DatePickerField
            value={range.from ?? presetToDateRange("today").from!}
            onChange={updateFrom}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{t("progress.studiedWords.endDate")}</Text>
          <DatePickerField
            value={range.to ?? presetToDateRange("today").to!}
            onChange={updateTo}
          />
        </View>
      </View>

      <View style={styles.decks}>
        {DAILY_GOAL_DECK_IDS.map((deck) => (
          <DeckStudiedList key={deck} deck={deck} range={range} />
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    section: {
      backgroundColor: theme.appSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.appBorder,
      borderRadius: 16,
      padding: 16,
      overflow: "hidden",
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.appTextMuted,
      marginBottom: 12,
    },
    presets: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },
    dateRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    dateField: {
      flex: 1,
      gap: 4,
    },
    dateLabel: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: theme.appTextMuted,
    },
    decks: {
      gap: 20,
    },
  });
}
