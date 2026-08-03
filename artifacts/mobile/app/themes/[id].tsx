import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingPlaceholder } from "@/components/LoadingPlaceholder";
import { WordCard } from "@/components/WordCard";
import { WordPickerSheet } from "@/components/WordPickerSheet";
import { confirmAsync } from "@/lib/confirm";
import { useTheme as useAppTheme } from "@/theme/ThemeProvider";
import { useTheme } from "@/hooks/useThemes";
import { useWords } from "@/hooks/useWords";
import { useTranslation } from "@/i18n/I18nProvider";

export default function ThemeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeId = Number(id);
  const { t } = useTranslation();
  const router = useRouter();
  const { theme: colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { words, updateWord, deleteWord } = useWords();
  const {
    theme: themeData,
    isLoading,
    isError,
    addThemeWords,
    deleteTheme,
  } = useTheme(themeId);

  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIds, setPickerIds] = useState<Set<number>>(() => new Set());

  const themeWords = useMemo(() => {
    if (!themeData) return [];
    const map = new Map(words.map((w) => [w.id, w]));
    return themeData.wordIds
      .map((wid) => map.get(wid))
      .filter((w): w is NonNullable<typeof w> => !!w);
  }, [themeData, words]);

  const handleDelete = async () => {
    const ok = await confirmAsync(
      t("common.confirmTitle"),
      t("themes.confirmDelete"),
      t("common.delete"),
      t("common.cancel"),
    );
    if (!ok) return;
    await deleteTheme();
    router.replace("/themes" as Href);
  };

  const handleAddWords = async () => {
    const newIds = [...pickerIds].filter(
      (wid) => !themeData?.wordIds.includes(wid),
    );
    if (newIds.length > 0) await addThemeWords(newIds);
    setShowPicker(false);
    setPickerIds(new Set());
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingPlaceholder padding="lg" style={styles.center} />
      </SafeAreaView>
    );
  }

  if (isError || !themeData) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>{t("themes.loadError")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <ArrowLeft size={18} color={colors.appTextMuted} />
          <Text style={styles.backTitle}>{t("nav.themes")}</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowPicker(true)} style={styles.iconBtn}>
            <Plus size={18} color={colors.main500} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.iconBtn}>
            <Trash2 size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.title}>{themeData.name}</Text>
      <Text style={styles.count}>
        {t("themes.meta", {
          words: themeWords.length,
          questions: themeData.questions?.length ?? 0,
        })}
      </Text>

      <View style={styles.quizActions}>
        <Pressable
          onPress={() =>
            router.push(`/themes/${themeId}/quiz/edit` as Href)
          }
          style={styles.quizBtn}
        >
          <Text style={styles.quizBtnText}>{t("themeQuiz.edit")}</Text>
        </Pressable>
        {(themeData.questions?.length ?? 0) > 0 ? (
          <Pressable
            onPress={() =>
              router.push(`/themes/${themeId}/quiz` as Href)
            }
            style={[styles.quizBtn, styles.quizBtnPrimary]}
          >
            <Text style={[styles.quizBtnText, styles.quizBtnTextPrimary]}>
              {t("themeQuiz.start")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={themeWords}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <WordCard
            word={item}
            index={index + 1}
            mode="words"
            isOpen={openIds.has(item.id)}
            onToggle={() => {
              setOpenIds((prev) => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              });
            }}
            onUpdate={updateWord}
            onDelete={deleteWord}
            allWords={words}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("themes.noWords")}</Text>
        }
      />

      <WordPickerSheet
        visible={showPicker}
        words={words.filter((w) => !themeData.wordIds.includes(w.id))}
        selectedIds={pickerIds}
        onToggle={(wid) => {
          setPickerIds((prev) => {
            const next = new Set(prev);
            if (next.has(wid)) next.delete(wid);
            else next.add(wid);
            return next;
          });
        }}
        onClose={() => {
          void handleAddWords();
        }}
        title={t("themes.addWords")}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>["theme"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.appBg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    backRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
    backTitle: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.main400,
    },
    headerActions: { flexDirection: "row", gap: 4 },
    iconBtn: { padding: 8 },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.appText,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    count: {
      fontSize: 13,
      color: theme.appTextMuted,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    quizActions: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    quizBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: theme.appSurface,
    },
    quizBtnPrimary: {
      backgroundColor: theme.main500,
      borderColor: theme.main500,
    },
    quizBtnText: { fontSize: 13, fontWeight: "700", color: theme.main500 },
    quizBtnTextPrimary: { color: "#fff" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    error: { color: theme.danger, fontSize: 14 },
    empty: {
      textAlign: "center",
      color: theme.appTextMuted,
      padding: 40,
      fontSize: 14,
    },
  });
}
