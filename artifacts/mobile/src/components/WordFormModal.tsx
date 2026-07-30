import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BookOpen, Languages, Waves } from "lucide-react-native";
import type { Word, SrsExample } from "@/lib/types";
import {
  sanitizeSrsExamples,
  srsExamplesToPlainDescription,
} from "@/lib/srsExamples";
import { CategoriesSelect } from "@/components/CategoriesSelect";
import { DatePickerField } from "@/components/DatePickerField";
import { SlideUpModal } from "@/components/SlideUpModal";
import { SrsExamplesEditor } from "./SrsExamplesEditor";
import { useCategories } from "@/hooks/useCategories";
import { useTranslation } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

export type WordFormSaveData = {
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  level: number;
  starred: boolean;
  pronLevel: number;
  pronStarred: boolean;
  meaningLevel: number;
  meaningStarred: boolean;
  jlptLevel: string | null;
  date: string;
  srsExamples: SrsExample[];
  categoryIds: number[];
};

type TabId = "general" | "srs";

type Props = {
  visible: boolean;
  initial?: Word | null;
  allWords?: Word[];
  onSave: (data: WordFormSaveData) => void;
  onClose: () => void;
};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

type LevelField = "word" | "pronunciation" | "meaning";

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function WordFormModal({ visible, initial, allWords = [], onSave, onClose }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: categories = [] } = useCategories();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [kanji, setKanji] = useState(initial?.kanji ?? "");
  const [pronunciation, setPronunciation] = useState(initial?.pronunciation ?? "");
  const [meaning, setMeaning] = useState(initial?.meaning ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [level, setLevel] = useState(initial?.level ?? 1);
  const [pronLevel, setPronLevel] = useState(initial?.pronLevel ?? 1);
  const [meaningLevel, setMeaningLevel] = useState(initial?.meaningLevel ?? 1);
  const [starred, setStarred] = useState(initial?.starred ?? false);
  const [pronStarred, setPronStarred] = useState(initial?.pronStarred ?? false);
  const [meaningStarred, setMeaningStarred] = useState(initial?.meaningStarred ?? false);
  const [jlptLevel, setJlptLevel] = useState<string | null>(initial?.jlptLevel ?? null);
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [openLevelField, setOpenLevelField] = useState<LevelField | null>(null);
  const [tab, setTab] = useState<TabId>("general");
  const [srsExamples, setSrsExamples] = useState<SrsExample[]>(
    initial?.srsExamples ?? [],
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(
    initial?.categoryIds ?? [],
  );

  const isEdit = !!initial;

  useEffect(() => {
    if (visible) resetFromInitial();
  }, [visible, initial?.id]);

  function resetFromInitial() {
    setKanji(initial?.kanji ?? "");
    setPronunciation(initial?.pronunciation ?? "");
    setMeaning(initial?.meaning ?? "");
    setDescription(initial?.description ?? "");
    setLevel(initial?.level ?? 1);
    setPronLevel(initial?.pronLevel ?? 1);
    setMeaningLevel(initial?.meaningLevel ?? 1);
    setStarred(initial?.starred ?? false);
    setPronStarred(initial?.pronStarred ?? false);
    setMeaningStarred(initial?.meaningStarred ?? false);
    setJlptLevel(initial?.jlptLevel ?? null);
    setDate(initial?.date ?? todayStr());
    setOpenLevelField(null);
    setTab("general");
    setSrsExamples(initial?.srsExamples ?? []);
    setCategoryIds(initial?.categoryIds ?? []);
  }

  function syncDescriptionFromSrs() {
    const next = srsExamplesToPlainDescription(srsExamples);
    if (next) setDescription(next);
  }

  function getLevelState(field: LevelField) {
    switch (field) {
      case "word":
        return { level, starred };
      case "pronunciation":
        return { level: pronLevel, starred: pronStarred };
      case "meaning":
        return { level: meaningLevel, starred: meaningStarred };
    }
  }

  function applyLevelState(field: LevelField, nextLevel: number, nextStarred: boolean) {
    switch (field) {
      case "word":
        setLevel(nextLevel);
        setStarred(nextStarred);
        break;
      case "pronunciation":
        setPronLevel(nextLevel);
        setPronStarred(nextStarred);
        break;
      case "meaning":
        setMeaningLevel(nextLevel);
        setMeaningStarred(nextStarred);
        break;
    }
  }

  function handleSubmit() {
    if (!kanji.trim()) return;
    onSave({
      kanji: kanji.trim(),
      pronunciation: pronunciation.trim(),
      meaning: meaning.trim(),
      description: description.trim(),
      level,
      starred,
      pronLevel,
      pronStarred,
      meaningLevel,
      meaningStarred,
      jlptLevel,
      date,
      srsExamples: sanitizeSrsExamples(srsExamples),
      categoryIds,
    });
  }

  const levelRows: {
    key: LevelField;
    labelKey: "wordForm.labels.word" | "wordForm.labels.pronunciation" | "wordForm.labels.meaning";
    Icon: typeof Languages;
  }[] = [
    { key: "word", labelKey: "wordForm.labels.word", Icon: Languages },
    { key: "pronunciation", labelKey: "wordForm.labels.pronunciation", Icon: Waves },
    { key: "meaning", labelKey: "wordForm.labels.meaning", Icon: BookOpen },
  ];

  return (
    <SlideUpModal
      visible={visible}
      onClose={onClose}
      title={t(isEdit ? "wordForm.editTitle" : "wordForm.addTitle")}
      maxHeight="92%"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("general")}
            style={[styles.tab, tab === "general" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "general" && styles.tabTextActive]}>
              {t("wordForm.tabs.general")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("srs")}
            style={[styles.tab, tab === "srs" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "srs" && styles.tabTextActive]}>
              {t("wordForm.tabs.srsExamples")}
              {srsExamples.length > 0 ? (
                <Text style={styles.tabBadge}> {srsExamples.length}</Text>
              ) : null}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "general" ? (
            <>
              <Text style={styles.label}>{t("wordForm.labels.kanji")}</Text>
              <TextInput
                value={kanji}
                onChangeText={setKanji}
                placeholder={t("wordForm.placeholders.kanji")}
                placeholderTextColor={theme.appTextMuted}
                style={styles.input}
              />

              <Text style={styles.label}>{t("wordForm.labels.pronunciation")}</Text>
              <TextInput
                value={pronunciation}
                onChangeText={setPronunciation}
                placeholder={t("wordForm.placeholders.pronunciation")}
                placeholderTextColor={theme.appTextMuted}
                style={styles.input}
              />

              <Text style={styles.label}>{t("wordForm.labels.meaning")}</Text>
              <TextInput
                value={meaning}
                onChangeText={setMeaning}
                placeholder={t("wordForm.placeholders.meaning")}
                placeholderTextColor={theme.appTextMuted}
                style={styles.input}
              />

              <Text style={styles.label}>{t("wordForm.labels.examplesAndNotes")}</Text>
              {srsExamples.length > 0 ? (
                <Pressable onPress={syncDescriptionFromSrs} style={styles.syncLink}>
                  <Text style={styles.syncLinkText}>
                    {t("wordForm.actions.generateFromSrs")}
                  </Text>
                </Pressable>
              ) : null}
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("wordForm.placeholders.description")}
                placeholderTextColor={theme.appTextMuted}
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>
                {t("wordForm.labels.jlptLevel")}{" "}
                <Text style={styles.optional}>{t("wordForm.labels.jlptOptional")}</Text>
              </Text>
              <View style={styles.jlptRow}>
                {JLPT_LEVELS.map((lv) => {
                  const active = jlptLevel === lv;
                  return (
                    <Pressable
                      key={lv}
                      onPress={() => setJlptLevel(active ? null : lv)}
                      style={[styles.jlptChip, active && styles.jlptChipActive]}
                    >
                      <Text style={[styles.jlptChipText, active && styles.jlptChipTextActive]}>
                        {lv}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t("wordForm.labels.date")}</Text>
              <DatePickerField value={date} onChange={setDate} />

              {categories.length > 0 ? (
                <>
                  <Text style={styles.label}>{t("wordForm.labels.categories")}</Text>
                  <CategoriesSelect
                    categories={categories}
                    selectedIds={categoryIds}
                    onChange={setCategoryIds}
                  />
                </>
              ) : null}

              <Text style={[styles.label, { marginTop: 8 }]}>{t("wordForm.labels.level")}</Text>
              {levelRows.map(({ key, labelKey, Icon }) => {
                const { level: lv, starred: st } = getLevelState(key);
                const starEnabled = lv === 5 || st;
                const open = openLevelField === key;
                return (
                  <View key={key} style={styles.levelRow}>
                    <Pressable
                      onPress={() => setOpenLevelField(open ? null : key)}
                      style={styles.levelRowHead}
                    >
                      <Icon size={16} color={theme.appTextSecondary} />
                      <Text style={styles.levelRowLabel}>{t(labelKey)}</Text>
                      <View
                        style={[
                          styles.levelBadge,
                          { backgroundColor: st ? theme.starColor : theme.levelColor(lv, lv) },
                        ]}
                      >
                        <Text style={styles.levelBadgeText}>{st ? "★" : lv}</Text>
                      </View>
                    </Pressable>
                    {open ? (
                      <View style={styles.levelPicker}>
                        {[1, 2, 3, 4, 5].map((l) => {
                          const active = lv === l && !st;
                          const color = theme.levelColor(l, l);
                          return (
                            <Pressable
                              key={l}
                              onPress={() => {
                                applyLevelState(key, l, false);
                                setOpenLevelField(null);
                              }}
                              style={[
                                styles.levelBtn,
                                {
                                  backgroundColor: active ? color : "transparent",
                                  borderColor: color,
                                },
                              ]}
                            >
                              <Text style={{ color: active ? theme.white : color, fontWeight: "700" }}>
                                {l}
                              </Text>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          disabled={!starEnabled}
                          onPress={() => {
                            if (!starEnabled) return;
                            applyLevelState(key, 5, !st);
                            setOpenLevelField(null);
                          }}
                          style={[
                            styles.levelBtn,
                            {
                              backgroundColor: st ? theme.starColor : "transparent",
                              borderColor: starEnabled ? theme.starColor : theme.appBorderStrong,
                              opacity: starEnabled ? 1 : 0.4,
                            },
                          ]}
                        >
                          <Text style={{ color: st ? theme.white : theme.starColor }}>★</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <Pressable
                onPress={handleSubmit}
                disabled={!kanji.trim()}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !kanji.trim() && styles.submitDisabled,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.submitText}>
                  {t(isEdit ? "wordForm.actions.submitUpdate" : "wordForm.actions.submitAdd")}
                </Text>
              </Pressable>
            </>
          ) : (
            <SrsExamplesEditor
              examples={srsExamples}
              onChange={setSrsExamples}
              headword={kanji.trim()}
              plainDescription={description}
              allWords={allWords}
              currentWordId={initial?.id}
            />
          )}
        </ScrollView>

        {tab === "srs" ? (
          <View style={styles.footer}>
            <Pressable
              onPress={handleSubmit}
              disabled={!kanji.trim()}
              style={({ pressed }) => [
                styles.submitBtn,
                !kanji.trim() && styles.submitDisabled,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.submitText}>
                {t(isEdit ? "wordForm.actions.submitUpdate" : "wordForm.actions.submitAdd")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SlideUpModal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    flex: { flex: 1 },
    tabRow: {
      flexDirection: "row",
      gap: 4,
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: theme.appMuted,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: theme.appSurface,
    },
    tabText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.appTextSecondary,
    },
    tabTextActive: {
      color: theme.appText,
    },
    tabBadge: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.main500,
    },
    syncLink: { alignSelf: "flex-end", marginBottom: 4 },
    syncLinkText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.main500,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.appBorder,
      backgroundColor: theme.appSurface,
    },
    form: {
      padding: 20,
      paddingBottom: 24,
      gap: 6,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: theme.appTextMuted,
      marginTop: 10,
    },
    optional: {
      textTransform: "none",
      fontWeight: "400",
      fontStyle: "italic",
    },
    input: {
      backgroundColor: theme.appSurface,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.appText,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 10,
    },
    jlptRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    jlptChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      backgroundColor: theme.appSurface,
    },
    jlptChipActive: {
      borderColor: theme.main500,
      backgroundColor: theme.appAccent,
    },
    jlptChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.appTextSecondary,
    },
    jlptChipTextActive: {
      color: theme.main500,
    },
    levelRow: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.appBorder,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.appSurface,
    },
    levelRowHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    levelRowLabel: {
      flex: 1,
      fontSize: 14,
      color: theme.appText,
    },
    levelBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    levelBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.white,
    },
    levelPicker: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      paddingBottom: 12,
      paddingHorizontal: 12,
    },
    levelBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    submitBtn: {
      marginTop: 24,
      backgroundColor: theme.main500,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitDisabled: { opacity: 0.5 },
    submitText: {
      color: theme.white,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
