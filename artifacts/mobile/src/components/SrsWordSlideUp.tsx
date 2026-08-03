import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import type { Word } from "@/lib/types";
import { useCategories } from "@/hooks/useCategories";
import { CategoryChip } from "@/components/CategoryChip";
import { CategoryWordsList } from "@/components/CategoryWordsList";
import { RelatedWordsButton, RelatedWordsList } from "@/components/RelatedWordsList";
import { SlideUpModal } from "@/components/SlideUpModal";
import { WordFormModal, type WordFormSaveData } from "@/components/WordFormModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import type { SrsDeckType } from "@/types/srs";

type Props = {
  visible: boolean;
  word: Word | null;
  allWords: Word[];
  onClose: () => void;
  onSave?: (wordId: number, data: WordFormSaveData) => void;
  /** Keeps sheet above a fixed footer (e.g. SRS rating bar). */
  bottomInset?: number;
  /** Hides the field currently being tested in this deck. */
  deck?: SrsDeckType;
};

export function SrsWordSlideUp({
  visible,
  word,
  allWords,
  onClose,
  onSave,
  bottomInset = 0,
  deck,
}: Props) {
  const { t, formatStudyDate } = useTranslation();
  const { theme } = useTheme();
  const { data: categories = [] } = useCategories();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showRelated, setShowRelated] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setShowRelated(false);
      setActiveCategoryId(null);
    }
  }, [visible, word?.id]);

  if (!word) return null;

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

  const showKanji = deck !== "word" && !!word.kanji;
  const showPronunciation = deck !== "pronunciation" && !!word.pronunciation;
  const showMeaning = deck !== "meaning" && deck !== "drawing" && !!word.meaning;

  const showRelatedPanel = showRelated && word.meaning && !activeCategory;

  return (
    <>
      <SlideUpModal
        visible={visible}
        onClose={onClose}
        maxHeight="55%"
        expanded
        bottomInset={bottomInset}
        inline={bottomInset > 0}
      >
        <View style={styles.content}>
          <View style={styles.toolbar}>
            {onSave ? (
              <Pressable
                onPress={() => setShowEdit(true)}
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
              >
                <Pencil size={14} color={theme.appTextSecondary} />
              </Pressable>
            ) : null}
            {word.meaning && allWords.length > 0 && !activeCategory ? (
              <RelatedWordsButton
                active={showRelated}
                onPress={() => setShowRelated((v) => !v)}
              />
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="never"
            showsVerticalScrollIndicator={false}
          >
            {word.date || word.jlptLevel ? (
              <View style={styles.metaRow}>
                {word.date ? (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{formatStudyDate(word.date)}</Text>
                  </View>
                ) : null}
                {word.jlptLevel ? (
                  <View style={styles.metaChip}>
                    <Text style={[styles.metaChipText, styles.metaChipJlpt]}>
                      {word.jlptLevel}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {wordCategories.length > 0 ? (
              <View style={styles.chipsRow}>
                {wordCategories.map((cat) => (
                  <CategoryChip
                    key={cat.id}
                    label={cat.name}
                    iconSvg={cat.iconSvg}
                    active={activeCategoryId === cat.id}
                    onPress={() => {
                      setShowRelated(false);
                      setActiveCategoryId((prev) =>
                        prev === cat.id ? null : cat.id,
                      );
                    }}
                  />
                ))}
              </View>
            ) : null}

            {activeCategory ? (
              <CategoryWordsList category={activeCategory} words={categoryWords} />
            ) : showRelatedPanel ? (
              <RelatedWordsList word={word} allWords={allWords} />
            ) : (
              <View style={styles.details}>
                {showKanji ? (
                  <View style={styles.block}>
                    <Text style={styles.label}>{t("study.detailLabels.word")}</Text>
                    <Text style={styles.kanji}>{word.kanji}</Text>
                  </View>
                ) : null}
                {showPronunciation ? (
                  <View style={styles.block}>
                    <Text style={styles.label}>{t("study.detailLabels.pronunciation")}</Text>
                    <Text style={styles.bodyLg}>{word.pronunciation}</Text>
                  </View>
                ) : null}
                {showMeaning ? (
                  <View style={styles.block}>
                    <Text style={styles.label}>{t("study.detailLabels.meaning")}</Text>
                    <Text style={styles.body}>{word.meaning}</Text>
                  </View>
                ) : null}
                {word.description ? (
                  <View style={[styles.block, styles.descBlock]}>
                    <Text style={styles.label}>{t("study.detailLabels.description")}</Text>
                    <Text style={styles.desc}>{word.description}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </SlideUpModal>

      {onSave ? (
        <WordFormModal
          visible={showEdit}
          initial={word}
          allWords={allWords}
          onClose={() => setShowEdit(false)}
          onSave={(data) => {
            onSave(word.id, data);
            setShowEdit(false);
          }}
        />
      ) : null}
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    content: {
      flex: 1,
      minHeight: 0,
    },
    toolbar: {
      position: "absolute",
      top: 0,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      zIndex: 2,
    },
    iconBtn: {
      width: 40,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.appMuted,
    },
    scroll: {
      flex: 1,
      minHeight: 0,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 28,
      paddingRight: 72,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    metaChip: {
      backgroundColor: theme.appMuted,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    metaChipText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.appTextSecondary,
    },
    metaChipJlpt: {
      fontWeight: "700",
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },
    details: { gap: 16 },
    block: { gap: 4 },
    descBlock: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.appBorder,
      paddingTop: 12,
    },
    label: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.appTextMuted,
    },
    kanji: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.appText,
    },
    bodyLg: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.appText,
    },
    body: {
      fontSize: 16,
      color: theme.appText,
      lineHeight: 22,
    },
    desc: {
      fontSize: 14,
      color: theme.appTextSecondary,
      lineHeight: 21,
    },
  });
}
