import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Word } from "@/lib/types";
import { getRelatedWords } from "@/lib/relatedWords";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  word: Word;
  allWords: Word[];
};

export function RelatedWordsList({ word, allWords }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());

  const manualIds = word.relatedWordIds ?? [];
  const manualWords = allWords.filter((w) => manualIds.includes(w.id));
  const autoWords = getRelatedWords(word, allWords).filter(
    (w) => !manualIds.includes(w.id),
  );
  const allRelated = [...manualWords, ...autoWords];
  const manualSet = new Set(manualIds);

  if (allRelated.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{t("common.relatedWordsNotFound")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.box} nestedScrollEnabled>
      {allRelated.map((w) => {
        const isOpen = openIds.has(w.id);
        const isManual = manualSet.has(w.id);
        return (
          <View key={w.id} style={styles.row}>
            <Pressable
              onPress={() => {
                setOpenIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(w.id)) next.delete(w.id);
                  else next.add(w.id);
                  return next;
                });
              }}
              style={({ pressed }) => [styles.rowHead, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.rowBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.kanji}>{w.kanji}</Text>
                  {isManual ? (
                    <Text style={styles.manualBadge}>
                      {t("common.manualLinkBadge")}
                    </Text>
                  ) : null}
                </View>
                {w.pronunciation ? (
                  <Text style={styles.sub}>{w.pronunciation}</Text>
                ) : null}
                {w.meaning ? (
                  <Text style={styles.sub} numberOfLines={isOpen ? undefined : 1}>
                    {w.meaning}
                  </Text>
                ) : null}
              </View>
              {w.jlptLevel ? (
                <Text style={styles.jlpt}>{w.jlptLevel}</Text>
              ) : null}
            </Pressable>
            {isOpen ? (
              <View style={styles.detail}>
                <Text style={styles.detailText}>
                  {w.description || t("common.noDescription")}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

export function RelatedWordsButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createButtonStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        active && styles.btnActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.text, active && styles.textActive]}>
        {t("common.relatedWordsButton")}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    box: {
      maxHeight: 240,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.appBorder,
      borderRadius: 10,
      backgroundColor: theme.appSurface,
    },
    emptyBox: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.appBorder,
      borderRadius: 10,
      padding: 12,
      backgroundColor: theme.appSurface,
    },
    emptyText: {
      fontSize: 12,
      color: theme.appTextMuted,
      textAlign: "center",
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
    },
    rowHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rowBody: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    kanji: { fontSize: 13, fontWeight: "700", color: theme.appText },
    manualBadge: {
      fontSize: 9,
      fontWeight: "700",
      color: theme.main500,
      backgroundColor: theme.appAccent,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    sub: { fontSize: 11, color: theme.appTextMuted, marginTop: 2 },
    jlpt: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.appTextSecondary,
      backgroundColor: theme.appMuted,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    detail: {
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    detailText: {
      fontSize: 12,
      lineHeight: 18,
      color: theme.appTextSecondary,
    },
  });
}

function createButtonStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    btn: {
      backgroundColor: theme.appAccent,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    btnActive: {
      backgroundColor: theme.danger,
    },
    text: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.main500,
    },
    textActive: {
      color: "#fff",
    },
  });
}
