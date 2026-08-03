import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Circle, CircleCheck, Upload, X } from "lucide-react-native";
import { SlideUpModal } from "@/components/SlideUpModal";
import { useCategories } from "@/hooks/useCategories";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { matchCategoryNames } from "@/lib/categoryMatch";
import { parseTableHtml, type BulkWordInput } from "@/lib/parseBulkHtml";
import { linkSrsExamples } from "@/lib/wordLinking";
import type { Word } from "@/lib/types";

type ImportResult = {
  total: number;
  added: number;
  updated: number;
  updatedWords: string[];
};

type PreviewEntry = BulkWordInput & { id: string };

type Props = {
  visible: boolean;
  allWords: Word[];
  onClose: () => void;
  onImport: (words: BulkWordInput[]) => Promise<ImportResult>;
};

function previewId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isExistingKanji(kanji: string, allWords: Word[]): boolean {
  const key = kanji.normalize("NFC");
  return allWords.some((w) => w.kanji.normalize("NFC") === key);
}

function UpdateCircle({
  selected,
  onPress,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      {selected ? (
        <CircleCheck size={17} color="#22c55e" />
      ) : (
        <Circle size={17} color="#22c55e" />
      )}
    </Pressable>
  );
}

export function BulkImportModal({ visible, allWords, onClose, onImport }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: categories = [] } = useCategories();

  const [html, setHtml] = useState("");
  const [preview, setPreview] = useState<PreviewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [resolveExisting, setResolveExisting] = useState(false);
  const [updateIds, setUpdateIds] = useState<Set<string>>(() => new Set());
  const [highlightIds, setHighlightIds] = useState<Set<string>>(() => new Set());
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setHtml("");
    setPreview([]);
    setResult(null);
    setLoading(false);
    setLinking(false);
    setResolveExisting(false);
    setUpdateIds(new Set());
    setHighlightIds(new Set());
    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const resetPreview = () => {
    setPreview([]);
    setResolveExisting(false);
    setUpdateIds(new Set());
    setHighlightIds(new Set());
  };

  const handleParse = () => {
    const words = parseTableHtml(html);
    setPreview(words.map((w) => ({ ...w, id: previewId() })));
    setResult(null);
    setResolveExisting(false);
    setUpdateIds(new Set());
    setHighlightIds(new Set());
  };

  function removePreviewEntry(id: string) {
    setPreview((prev) => prev.filter((w) => w.id !== id));
    setUpdateIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setHighlightIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleUpdateSelection(id: string) {
    setUpdateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setHighlightIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function triggerHighlight(ids: string[]) {
    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    setHighlightIds(new Set(ids));
    highlightTimeout.current = setTimeout(() => {
      setHighlightIds(new Set());
    }, 300);
  }

  async function runImport(entries: PreviewEntry[]) {
    if (entries.length === 0) return;
    setLoading(true);
    setLinking(true);
    let linkingSkipped = false;
    try {
      const linkedPreview: BulkWordInput[] = [];
      for (const w of entries) {
        if (w.srsExamples?.length) {
          try {
            const srsExamples = await linkSrsExamples(w.srsExamples, allWords);
            linkedPreview.push({ ...w, srsExamples });
          } catch {
            linkingSkipped = true;
            linkedPreview.push(w);
          }
        } else {
          linkedPreview.push(w);
        }
      }
      setLinking(false);
      const res = await onImport(linkedPreview);
      setResult(res);
      setPreview([]);
      setResolveExisting(false);
      setUpdateIds(new Set());
      setHighlightIds(new Set());
      setHtml("");
      if (linkingSkipped) {
        Alert.alert(t("common.confirmTitle"), t("bulkImport.linkingSkipped"));
      }
    } catch {
      Alert.alert(t("common.confirmTitle"), t("bulkImport.importFailed"));
    } finally {
      setLoading(false);
      setLinking(false);
    }
  }

  async function handleAddWords() {
    if (preview.length === 0) return;

    const hasExisting = preview.some((w) => isExistingKanji(w.kanji, allWords));

    if (!resolveExisting && hasExisting) {
      setResolveExisting(true);
      setHighlightIds(new Set());
      return;
    }

    if (resolveExisting) {
      const unresolved = preview.filter(
        (w) => isExistingKanji(w.kanji, allWords) && !updateIds.has(w.id),
      );
      if (unresolved.length > 0) {
        triggerHighlight(unresolved.map((w) => w.id));
        return;
      }
    }

    await runImport(preview);
  }

  const existingWords = preview.filter((w) => isExistingKanji(w.kanji, allWords));
  const allUpdated =
    existingWords.length > 0 && existingWords.every((w) => updateIds.has(w.id));

  return (
    <SlideUpModal
      visible={visible}
      onClose={handleClose}
      title={t("bulkImport.title")}
      maxHeight="92%"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="never"
        >
          {result ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>
                {t("bulkImport.result.totalGiven", { count: result.total })}
              </Text>
              <Text style={styles.resultLine}>
                {t("bulkImport.result.added", { count: result.added })}
              </Text>
              {result.updated > 0 ? (
                <>
                  <Text style={styles.resultLine}>
                    {t("bulkImport.result.updated", { count: result.updated })}
                  </Text>
                  <View style={styles.updatedWrap}>
                    {result.updatedWords.map((k) => (
                      <Text key={k} style={styles.updatedWord}>
                        {k}
                      </Text>
                    ))}
                  </View>
                </>
              ) : null}
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.primaryBtnText}>{t("common.close")}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.hint}>{t("bulkImport.instructions")}</Text>
              <TextInput
                value={html}
                onChangeText={(v) => {
                  setHtml(v);
                  setPreview([]);
                  setResolveExisting(false);
                  setUpdateIds(new Set());
                  setHighlightIds(new Set());
                }}
                placeholder={t("bulkImport.placeholder")}
                placeholderTextColor={theme.appTextMuted}
                multiline
                textAlignVertical="top"
                style={styles.textarea}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {preview.length === 0 ? (
                <Pressable
                  onPress={handleParse}
                  disabled={!html.trim()}
                  style={({ pressed }) => [
                    styles.outlineBtn,
                    !html.trim() && styles.disabledBtn,
                    pressed && html.trim() ? { opacity: 0.85 } : null,
                  ]}
                >
                  <Text style={styles.outlineBtnText}>
                    {html.trim() ? t("common.preview") : t("bulkImport.pasteTable")}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>
                    {t("bulkImport.wordsDetected", { count: preview.length })}
                  </Text>
                  <ScrollView style={styles.previewList} nestedScrollEnabled>
                    {preview.map((w) => {
                      const knownKanji = new Set([
                        ...allWords.map((word) => word.kanji.normalize("NFC")),
                        ...preview.map((word) => word.kanji.normalize("NFC")),
                      ]);
                      const existing = isExistingKanji(w.kanji, allWords);
                      const markedUpdate = updateIds.has(w.id);
                      const needsAction =
                        resolveExisting && existing && highlightIds.has(w.id);

                      const matchedCategoryIds =
                        w.categoryNames && w.categoryNames.length > 0
                          ? matchCategoryNames(w.categoryNames, categories)
                          : [];
                      const matchedCategoryNames = matchedCategoryIds
                        .map((id) => categories.find((c) => c.id === id)?.name ?? "")
                        .filter(Boolean);

                      const showActions = resolveExisting && existing;
                      const hideActions = allUpdated;
                      const invisibleActions = markedUpdate && !allUpdated;
                      const areActionsVisible = !hideActions && showActions

                      return (
                        <View
                          key={w.id}
                          style={[
                            styles.previewRow,
                            needsAction && styles.previewRowHighlight,
                          ]}
                        >
                          <Text style={styles.previewKanji} numberOfLines={1}>
                            {w.kanji}
                          </Text>
                          <Text style={styles.previewPron} numberOfLines={1}>
                            {w.pronunciation || "—"}
                          </Text>

                          {w.jlptLevel ? (
                            <View style={styles.jlptBadge}>
                              <Text style={styles.jlptText}>{w.jlptLevel}</Text>
                            </View>
                          ) : null}

                          {(w.srsExamples?.length ?? 0) > 0 ? (
                            <View style={styles.srsBadge}>
                              <Text style={styles.srsBadgeText}>
                                {t("common.srsBadge", {
                                  count: w.srsExamples!.length,
                                })}
                              </Text>
                            </View>
                          ) : null}

                          {matchedCategoryNames.length > 0 ? (
                            <View style={styles.catBadge} accessibilityLabel={matchedCategoryNames.join(", ")}>
                              <Text style={areActionsVisible ?  styles.catBadgeTextShortened : styles.catBadgeText} numberOfLines={1}>
                                {t("bulkImport.categoriesBadge", {
                                  count: matchedCategoryNames.length,
                                })}
                              </Text>
                            </View>
                          ) : null}

                          {w.synonymKanji && w.synonymKanji.length > 0 ? (
                            <View
                              style={styles.synBadge}
                              accessibilityLabel={w.synonymKanji.join(", ")}
                            >
                              <Text style={areActionsVisible ?  styles.synBadgeTextShortened : styles.synBadgeText} numberOfLines={1}>
                                {t("bulkImport.synonymsBadge", {
                                  count: w.synonymKanji.filter((k) =>
                                    knownKanji.has(k.normalize("NFC")),
                                  ).length,
                                  total: w.synonymKanji.length,
                                })}
                              </Text>
                            </View>
                          ) : null}

                          {areActionsVisible ? (
                            <View
                              style={[
                                styles.actionGroup,
                                needsAction && styles.actionGroupHighlight,
                                invisibleActions && styles.actionGroupHidden,
                              ]}
                            >
                              <UpdateCircle
                                selected={markedUpdate}
                                onPress={() => toggleUpdateSelection(w.id)}
                                label={t("bulkImport.updateWord")}
                              />
                              <Pressable
                                onPress={() => removePreviewEntry(w.id)}
                                accessibilityLabel={t("bulkImport.excludeWord")}
                                hitSlop={6}
                                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                              >
                                <X size={17} color="#ef4444" />
                              </Pressable>
                            </View>
                          ) : (
                            <View style={styles.actionSpacer} />
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.footerRow}>
                    <Pressable
                      onPress={resetPreview}
                      style={({ pressed }) => [
                        styles.footerBtnOutline,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.footerBtnOutlineText}>{t("common.cancel")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleAddWords}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.footerBtnPrimary,
                        loading && styles.disabledBtn,
                        pressed && !loading ? { opacity: 0.85 } : null,
                      ]}
                    >
                      {loading ? (
                        <View style={styles.loadingRow}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.footerBtnPrimaryText}>
                            {linking ? t("bulkImport.linking") : t("bulkImport.adding")}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.loadingRow}>
                          <Upload size={15} color="#fff" />
                          <Text style={styles.footerBtnPrimaryText}>
                            {t("bulkImport.addWords", { count: preview.length })}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SlideUpModal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.appBg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
      backgroundColor: theme.appSurface,
    },
    title: { fontSize: 18, fontWeight: "700", color: theme.appText },
    closeBtn: { padding: 8, borderRadius: 20 },
    content: { padding: 20, paddingBottom: 40, gap: 12 },
    hint: { fontSize: 12, lineHeight: 18, color: theme.appTextMuted },
    textarea: {
      minHeight: 160,
      maxHeight: 280,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 12,
      backgroundColor: theme.appMuted,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      color: theme.appTextSecondary,
    },
    outlineBtn: {
      borderWidth: 2,
      borderColor: theme.appBorderStrong,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    outlineBtnText: { fontSize: 14, fontWeight: "600", color: theme.appTextSecondary },
    previewBox: {
      backgroundColor: theme.appAccent,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.main200 ?? theme.appBorder,
      padding: 14,
      gap: 10,
    },
    previewTitle: { fontSize: 14, fontWeight: "700", color: theme.appText },
    previewList: { maxHeight: 180 },
    previewRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: 8,
    },
    previewRowHighlight: {
      borderWidth: 2,
      borderColor: "#f87171",
    },
    previewKanji: {
      width: 48,
      fontSize: 12,
      fontWeight: "700",
      color: theme.appText,
    },
    previewPron: {
      flex: 1,
      minWidth: 30,
      fontSize: 11,
      color: theme.appTextSecondary,
    },
    jlptBadge: {
      backgroundColor: "#f3f4f6",
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    jlptText: { fontSize: 10, fontWeight: "700", color: "#6b7280" },
    srsBadge: {
      backgroundColor: theme.main100 ?? theme.appAccent,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    srsBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.main600 ?? theme.main500,
    },
    catBadge: {
      backgroundColor: "#fef3c7",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      maxWidth: 72,
    },
    catBadgeText: { fontSize: 10, fontWeight: "700", color: "#b45309" },
    catBadgeTextShortened: { fontSize: 10, fontWeight: "700", color: "#b45309", maxWidth: 40 },
    synBadge: {
      backgroundColor: "#ede9fe",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      maxWidth: 80,
    },
    synBadgeText: { fontSize: 10, fontWeight: "700", color: "#6d28d9" },
    synBadgeTextShortened: { fontSize: 10, fontWeight: "700", color: "#6d28d9", maxWidth: 40 },
    actionGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginLeft: "auto",
      borderRadius: 999,
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    actionGroupHighlight: {
      borderWidth: 2,
      borderColor: "#f87171",
    },
    actionGroupHidden: {
      opacity: 0,
    },
    actionSpacer: { width: 40 },
    footerRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    footerBtnOutline: {
      flex: 1,
      borderWidth: 2,
      borderColor: theme.appBorderStrong,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    footerBtnOutlineText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.appTextMuted,
    },
    footerBtnPrimary: {
      flex: 1,
      backgroundColor: theme.main500,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    footerBtnPrimaryText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    primaryBtn: {
      backgroundColor: theme.main500,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    primaryBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    disabledBtn: { opacity: 0.45 },
    resultBox: {
      backgroundColor: theme.appSurface,
      borderRadius: 12,
      padding: 16,
      gap: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.appBorder,
    },
    resultTitle: { fontSize: 15, fontWeight: "700", color: theme.appText },
    resultLine: { fontSize: 14, color: theme.appTextSecondary },
    updatedWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    updatedWord: {
      fontSize: 12,
      color: theme.appTextMuted,
      backgroundColor: theme.appMuted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
  });
}
