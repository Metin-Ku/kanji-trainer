import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronDown, ChevronUp, Link2, Plus, Trash2 } from "lucide-react-native";
import type { SrsExample, Word } from "@/lib/types";
import {
  parsePlainDescriptionToSrsExamples,
  renderClozeSentence,
  sanitizeSrsExamples,
} from "@/lib/srsExamples";
import { isJapaneseAnalyzerAvailable } from "@/lib/japaneseAnalyzer";
import { linkSrsExamples } from "@/lib/wordLinking";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { confirmAsync } from "@/lib/confirm";
import { LoadingSpinner } from "./LoadingSpinner";

type Props = {
  examples: SrsExample[];
  onChange: (examples: SrsExample[]) => void;
  headword: string;
  plainDescription: string;
  allWords?: Word[];
  currentWordId?: number;
};

function emptyExample(order: number): SrsExample {
  return { order, sentence: "", hiddenWord: "", hints: [{ text: "" }] };
}

function reindexExamples(examples: SrsExample[]): SrsExample[] {
  return examples.map((ex, i) => ({ ...ex, order: i }));
}

export function SrsExamplesEditor({
  examples,
  onChange,
  headword,
  plainDescription,
  allWords = [],
  currentWordId,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [linkingIndex, setLinkingIndex] = useState<number | null>(null);
  const [linkingAll, setLinkingAll] = useState(false);

  const canLink = isJapaneseAnalyzerAvailable() && allWords.length > 0;

  function patchExample(index: number, patch: Partial<SrsExample>) {
    onChange(examples.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  function addExample() {
    onChange(reindexExamples([...examples, emptyExample(examples.length)]));
  }

  async function removeExample(index: number) {
    const ex = examples[index];
    if (ex?.sentence) {
      const ok = await confirmAsync(
        t("common.confirmTitle"),
        t("common.confirmDeleteExample"),
        t("common.delete"),
        t("common.cancel"),
      );
      if (!ok) return;
    }
    onChange(reindexExamples(examples.filter((_, i) => i !== index)));
  }

  function moveExample(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= examples.length) return;
    const copy = [...examples];
    [copy[index], copy[next]] = [copy[next]!, copy[index]!];
    onChange(reindexExamples(copy));
  }

  function importFromDescription() {
    const parsed = parsePlainDescriptionToSrsExamples(
      plainDescription,
      headword,
    );
    if (parsed.length === 0) return;
    onChange(sanitizeSrsExamples(parsed));
  }

  async function linkOneExample(exIndex: number) {
    const ex = examples[exIndex];
    if (!ex?.sentence.trim() || !canLink) return;
    setLinkingIndex(exIndex);
    try {
      const linked = await linkSrsExamples([ex], allWords, currentWordId);
      patchExample(exIndex, linked[0] ?? ex);
    } catch {
      Alert.alert(t("common.confirmTitle"), t("srs.editor.linkFailed"));
    } finally {
      setLinkingIndex(null);
    }
  }

  async function linkAllExamples() {
    if (!canLink) return;
    setLinkingAll(true);
    try {
      onChange(await linkSrsExamples(examples, allWords, currentWordId));
    } catch {
      Alert.alert(t("common.confirmTitle"), t("srs.editor.linkFailed"));
    } finally {
      setLinkingAll(false);
    }
  }

  async function importFromDescriptionLinked() {
    const parsed = parsePlainDescriptionToSrsExamples(
      plainDescription,
      headword,
    );
    if (parsed.length === 0) return;
    if (!canLink) {
      onChange(sanitizeSrsExamples(parsed));
      return;
    }
    setLinkingAll(true);
    try {
      onChange(
        await linkSrsExamples(sanitizeSrsExamples(parsed), allWords, currentWordId),
      );
    } catch {
      onChange(sanitizeSrsExamples(parsed));
      Alert.alert(t("common.confirmTitle"), t("srs.editor.linkFailed"));
    } finally {
      setLinkingAll(false);
    }
  }

  if (examples.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyHint}>{t("srs.editor.emptyHint")}</Text>
        <Pressable onPress={addExample} style={styles.primaryBtn}>
          <Plus size={15} color="#fff" />
          <Text style={styles.primaryBtnText}>{t("srs.editor.addExample")}</Text>
        </Pressable>
        {plainDescription.trim() ? (
          <Pressable onPress={importFromDescriptionLinked} style={styles.outlineBtn}>
            {linkingAll ? (
              <LoadingSpinner size={14} color={theme.main500} />
            ) : (
              <Text style={styles.outlineBtnText}>
                {t("srs.editor.importFromDescription")}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>{t("srs.editor.exampleSentences")}</Text>
        <View style={styles.headerActions}>
          {canLink ? (
            <Pressable onPress={linkAllExamples} disabled={linkingAll} style={styles.linkBtn}>
              {linkingAll ? (
                <LoadingSpinner size={12} color={theme.main500} />
              ) : (
                <Link2 size={12} color={theme.main500} />
              )}
              <Text style={styles.linkBtnText}>{t("srs.editor.linkAll")}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={addExample}>
            <Text style={styles.addLink}>+ {t("srs.editor.add")}</Text>
          </Pressable>
        </View>
      </View>

      {examples.map((ex, exIndex) => {
        const isCollapsed = collapsed[exIndex] ?? false;
        const linkCount = ex.linkedTokens?.length ?? 0;
        return (
          <View key={exIndex} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.moveCol}>
                <Pressable
                  disabled={exIndex === 0}
                  onPress={() => moveExample(exIndex, -1)}
                  style={{ opacity: exIndex === 0 ? 0.3 : 1 }}
                >
                  <ChevronUp size={14} color={theme.appTextMuted} />
                </Pressable>
                <Pressable
                  disabled={exIndex === examples.length - 1}
                  onPress={() => moveExample(exIndex, 1)}
                  style={{ opacity: exIndex === examples.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronDown size={14} color={theme.appTextMuted} />
                </Pressable>
              </View>
              <Pressable
                onPress={() =>
                  setCollapsed((c) => ({ ...c, [exIndex]: !isCollapsed }))
                }
                style={styles.cardTitleBtn}
              >
                <Text style={styles.cardTitle}>
                  {t("srs.editor.exampleN", { n: exIndex + 1 })}
                  {linkCount > 0 ? (
                    <Text style={styles.linkBadge}>
                      {" "}
                      {t("common.linkCount", { count: linkCount })}
                    </Text>
                  ) : null}
                </Text>
              </Pressable>
              <Pressable onPress={() => removeExample(exIndex)} hitSlop={8}>
                <Trash2 size={15} color={theme.danger} />
              </Pressable>
            </View>

            {!isCollapsed ? (
              <View style={styles.cardBody}>
                <Text style={styles.fieldLabel}>
                  {t("srs.editor.japaneseSentence")}
                </Text>
                <TextInput
                  value={ex.sentence}
                  onChangeText={(v) => patchExample(exIndex, { sentence: v })}
                  placeholder={t("srs.editor.placeholders.sentence")}
                  placeholderTextColor={theme.appTextMuted}
                  style={styles.sentenceInput}
                />

                <View style={styles.chipRow}>
                  {headword && ex.sentence.includes(headword) ? (
                    <Pressable
                      onPress={() =>
                        patchExample(exIndex, { hiddenWord: headword })
                      }
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>
                        {t("srs.editor.selectHeadword", { headword })}
                      </Text>
                    </Pressable>
                  ) : null}
                  {canLink ? (
                    <Pressable
                      onPress={() => linkOneExample(exIndex)}
                      disabled={!ex.sentence.trim() || linkingIndex === exIndex}
                      style={styles.chip}
                    >
                      {linkingIndex === exIndex ? (
                        <ActivityIndicator size="small" color={theme.main500} />
                      ) : (
                        <>
                          <Link2 size={11} color={theme.main500} />
                          <Text style={styles.chipText}>
                            {t("srs.editor.linkWords")}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.fieldLabel}>{t("srs.editor.hiddenWord")}</Text>
                <TextInput
                  value={ex.hiddenWord}
                  onChangeText={(v) => patchExample(exIndex, { hiddenWord: v })}
                  placeholder={headword || "…"}
                  placeholderTextColor={theme.appTextMuted}
                  style={styles.input}
                />

                {ex.sentence ? (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>
                      {t("srs.editor.srsPreview")}
                    </Text>
                    <Text style={styles.previewText}>
                      {renderClozeSentence(ex.sentence, ex.hiddenWord)}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>{t("srs.editor.hintLines")}</Text>
                {ex.hints.map((hint, hi) => (
                  <TextInput
                    key={hi}
                    value={hint.text}
                    onChangeText={(v) => {
                      const hints = ex.hints.map((h, i) =>
                        i === hi ? { ...h, text: v } : h,
                      );
                      patchExample(exIndex, { hints });
                    }}
                    placeholder={t("srs.editor.placeholders.hint")}
                    placeholderTextColor={theme.appTextMuted}
                    style={styles.input}
                  />
                ))}
                <Pressable
                  onPress={() =>
                    patchExample(exIndex, {
                      hints: [...ex.hints, { text: "" }],
                    })
                  }
                >
                  <Text style={styles.addLine}>{t("srs.editor.addLine")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable onPress={addExample} style={styles.dashedBtn}>
        <Text style={styles.dashedBtnText}>+ {t("srs.editor.addExample")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    emptyBox: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.appBorderStrong,
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      gap: 12,
      backgroundColor: theme.appMuted,
    },
    emptyHint: {
      fontSize: 13,
      color: theme.appTextSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.main500,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    outlineBtn: {
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    outlineBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.appTextSecondary,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    linkBtnText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.main500,
    },
    linkBadge: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.main500,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: theme.appTextMuted,
    },
    addLink: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.main500,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.appBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.appMuted,
    },
    cardHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.appSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorder,
    },
    moveCol: { gap: 0 },
    cardTitleBtn: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: "600", color: theme.appText },
    cardBody: { padding: 12, gap: 6 },
    fieldLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: theme.appTextMuted,
      marginTop: 4,
    },
    sentenceInput: {
      backgroundColor: theme.appSurface,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 18,
      fontWeight: "700",
      color: theme.appText,
    },
    input: {
      backgroundColor: theme.appSurface,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.appText,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.appSurface,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    chipText: { fontSize: 11, fontWeight: "600", color: theme.appTextSecondary },
    previewBox: {
      backgroundColor: theme.appAccent,
      borderRadius: 8,
      padding: 10,
    },
    previewLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.main500,
      marginBottom: 4,
      textTransform: "uppercase",
    },
    previewText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.appText,
    },
    addLine: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.main500,
      marginTop: 4,
    },
    dashedBtn: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.appBorderStrong,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
    },
    dashedBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.appTextMuted,
    },
  });
}
