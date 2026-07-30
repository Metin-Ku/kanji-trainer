import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import type { Word } from "@/lib/types";
import { RelatedWordsButton, RelatedWordsList } from "@/components/RelatedWordsList";
import { SlideUpModal } from "@/components/SlideUpModal";
import { WordFormModal, type WordFormSaveData } from "@/components/WordFormModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  visible: boolean;
  word: Word | null;
  allWords: Word[];
  onClose: () => void;
  onSave?: (wordId: number, data: WordFormSaveData) => void;
  /** Keeps sheet above a fixed footer (e.g. SRS rating bar). */
  bottomInset?: number;
};

export function SrsWordSlideUp({
  visible,
  word,
  allWords,
  onClose,
  onSave,
  bottomInset = 0,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showRelated, setShowRelated] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (visible) setShowRelated(false);
  }, [visible, word?.id]);

  if (!word) return null;

  return (
    <>
      <SlideUpModal
        visible={visible}
        onClose={onClose}
        maxHeight="58%"
        bottomInset={bottomInset}
        inline={bottomInset > 0}
      >
        <View style={styles.toolbar}>
          {onSave ? (
            <Pressable
              onPress={() => setShowEdit(true)}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
            >
              <Pencil size={14} color={theme.appTextSecondary} />
            </Pressable>
          ) : null}
          {word.meaning && allWords.length > 0 ? (
            <RelatedWordsButton
              active={showRelated}
              onPress={() => setShowRelated((v) => !v)}
            />
          ) : null}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {showRelated && word.meaning ? (
            <RelatedWordsList word={word} allWords={allWords} />
          ) : (
            <View style={styles.details}>
              {word.kanji ? (
                <View style={styles.block}>
                  <Text style={styles.label}>{t("study.detailLabels.word")}</Text>
                  <Text style={styles.kanji}>{word.kanji}</Text>
                </View>
              ) : null}
              {word.pronunciation ? (
                <View style={styles.block}>
                  <Text style={styles.label}>{t("study.detailLabels.pronunciation")}</Text>
                  <Text style={styles.bodyLg}>{word.pronunciation}</Text>
                </View>
              ) : null}
              {word.meaning ? (
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
    toolbar: {
      position: "absolute",
      top: 4,
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
    scroll: { flexGrow: 0 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
    details: { gap: 16, paddingRight: 72 },
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
