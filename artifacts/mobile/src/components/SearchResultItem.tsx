import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import type { Word } from "@/lib/types";
import { useCategories } from "@/hooks/useCategories";
import { useTheme } from "@/theme/ThemeProvider";
import { CategoryChip } from "./CategoryChip";
import { CategoryWordsList } from "./CategoryWordsList";
import { LevelPills } from "./LevelPills";
import { RelatedWordsButton, RelatedWordsList } from "./RelatedWordsList";

type Props = {
  word: Word;
  allWords: Word[];
  isOpen: boolean;
  isRelatedOpen: boolean;
  onToggle: () => void;
  onToggleRelated: () => void;
  onEdit: (word: Word) => void;
  onDelete: (id: number) => void;
};

export function SearchResultItem({
  word,
  allWords,
  isOpen,
  isRelatedOpen,
  onToggle,
  onToggleRelated,
  onEdit,
  onDelete,
}: Props) {
  const { theme } = useTheme();
  const { data: categories = [] } = useCategories();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) setActiveCategoryId(null);
  }, [isOpen]);

  const hasDetail = !!(
    word.pronunciation ||
    word.meaning ||
    word.description ||
    (word.categoryIds?.length ?? 0) > 0
  );

  const wordCategories = (word.categoryIds ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const activeCategory =
    activeCategoryId != null
      ? categories.find((c) => c.id === activeCategoryId)
      : undefined;

  const categoryWords = activeCategory
    ? allWords.filter(
        (w) =>
          w.id !== word.id && (w.categoryIds ?? []).includes(activeCategory.id),
      )
    : [];

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => hasDetail && onToggle()}
        style={({ pressed }) => [styles.row, pressed && hasDetail && styles.rowPressed]}
      >
        <View style={styles.body}>
          <Text style={styles.kanji}>{word.kanji || "—"}</Text>
          {word.pronunciation ? (
            <Text style={styles.sub}>{word.pronunciation}</Text>
          ) : null}
          {word.meaning ? (
            <Text
              style={[styles.sub, !isOpen && styles.truncate]}
              numberOfLines={isOpen ? undefined : 1}
            >
              {word.meaning}
            </Text>
          ) : null}
        </View>

        <View style={styles.toolsRow}>
          {word.jlptLevel ? (
            <View style={styles.jlptBadge}>
              <Text style={styles.jlptText}>{word.jlptLevel}</Text>
            </View>
          ) : null}
          <LevelPills word={word} />
          <View style={styles.actions}>
            <Pressable
              onPress={() => onEdit(word)}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            >
              <Pencil size={13} color={theme.appTextSecondary} strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={() => onDelete(word.id)}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            >
              <Trash2 size={13} color={theme.danger} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.detail}>
          {wordCategories.length > 0 ? (
            <View style={styles.chipsRow}>
              {wordCategories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={cat.name}
                  iconSvg={cat.iconSvg}
                  active={activeCategoryId === cat.id}
                  onPress={() => {
                    setActiveCategoryId((prev) =>
                      prev === cat.id ? null : cat.id,
                    );
                  }}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.detailActions}>
            {word.meaning && !activeCategory ? (
              <RelatedWordsButton
                active={isRelatedOpen}
                onPress={onToggleRelated}
              />
            ) : (
              <View />
            )}
          </View>

          {activeCategory ? (
            <CategoryWordsList category={activeCategory} words={categoryWords} />
          ) : isRelatedOpen && word.meaning ? (
            <RelatedWordsList word={word} allWords={allWords} />
          ) : word.description ? (
            <Text style={styles.description}>{word.description}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    wrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
      backgroundColor: theme.appSurface,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    rowPressed: {
      backgroundColor: theme.appMuted,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    kanji: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.appText,
    },
    sub: {
      marginTop: 2,
      fontSize: 12,
      color: theme.appTextSecondary,
    },
    truncate: {},
    toolsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 4,
      flexShrink: 0,
    },
    jlptBadge: {
      backgroundColor: theme.appMuted,
      borderRadius: 999,
      paddingHorizontal: 8,
      minHeight: 26,
      justifyContent: "center",
      alignItems: "center",
    },
    jlptText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.appTextSecondary,
    },
    actions: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 4,
    },
    actionBtn: {
      backgroundColor: theme.appMuted,
      borderRadius: 6,
      paddingHorizontal: 6,
      minHeight: 26,
      justifyContent: "center",
      alignItems: "center",
    },
    detail: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.appBorder,
      paddingTop: 10,
      gap: 8,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    detailActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    description: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.appTextSecondary,
    },
  });
}
