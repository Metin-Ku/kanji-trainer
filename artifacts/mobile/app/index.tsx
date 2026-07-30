import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { BookOpen, Settings, Waves } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DailyGoalCard } from "@/components/DailyGoalCard";
import { BulkImportModal } from "@/components/BulkImportModal";
import { SearchBar } from "@/components/SearchBar";
import { SearchResultItem } from "@/components/SearchResultItem";
import { StudyLinkRow } from "@/components/StudyLinkRow";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WordAddFab } from "@/components/WordAddFab";
import {
  WordFormModal,
  type WordFormSaveData,
} from "@/components/WordFormModal";
import { confirmAsync } from "@/lib/confirm";
import { useTranslation } from "@/i18n/I18nProvider";
import { filterWords } from "@/lib/filterWords";
import { useCategories } from "@/hooks/useCategories";
import { useThemes } from "@/hooks/useThemes";
import { useWords } from "@/hooks/useWords";
import { useTheme } from "@/theme/ThemeProvider";
import type { Word } from "@/lib/types";
import {
  STUDY_LINKS,
  buildStudyCounts,
  studyCountLabel,
} from "@/lib/studyLinks";

export default function HomeScreen() {
  const { t, formatToday } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { words, isLoading, addWord, updateWord, deleteWord, bulkCreate } =
    useWords();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { themes, isLoading: themesLoading } = useThemes();
  const studyCounts = useMemo(
    () => buildStudyCounts(words, themes, categories),
    [words, themes, categories],
  );
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [relatedOpenIds, setRelatedOpenIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [formVisible, setFormVisible] = useState(false);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  const isSearching = query.trim().length > 0;
  const results = filterWords(words, query);

  const handleDelete = useCallback(
    async (id: number) => {
      const word = words.find((w) => w.id === id);
      const ok = await confirmAsync(
        t("common.confirmTitle"),
        word?.kanji
          ? t("home.confirmDelete", { kanji: word.kanji })
          : t("common.confirmDeleteWord"),
        t("common.delete"),
        t("common.cancel"),
      );
      if (ok) deleteWord(id);
    },
    [words, t, deleteWord],
  );

  const handleEdit = useCallback((word: Word) => {
    setEditingWord(word);
    setFormVisible(true);
  }, []);

  const handleNewWord = useCallback(() => {
    setEditingWord(null);
    setFormVisible(true);
  }, []);

  const handleFormSave = useCallback(
    (data: WordFormSaveData) => {
      if (editingWord) {
        updateWord(editingWord.id, {
          ...data,
          relatedWordIds: editingWord.relatedWordIds,
          categoryIds: data.categoryIds,
        });
      } else {
        addWord({
          ...data,
          relatedWordIds: [],
          categoryIds: data.categoryIds,
        });
      }
      setFormVisible(false);
      setEditingWord(null);
    },
    [editingWord, addWord, updateWord],
  );

  const handleBulkImport = useCallback(() => {
    setBulkVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.subtitle}>{t("home.appSubtitle")}</Text>
            <Pressable
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [
                styles.settingsBtn,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel={t("a11y.settings")}
            >
              <Settings size={20} color={theme.appTextMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={styles.title}>{formatToday()}</Text>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={t("home.searchPlaceholder")}
            wordCount={words.length}
            wordCountLoading={isLoading}
            onWordCountClick={() =>
              router.push({ pathname: "/words", params: { all: "1" } })
            }
          />
          {!isSearching ? <DailyGoalCard /> : null}
        </View>

        {isSearching ? (
          isLoading ? (
            <View style={styles.center}>
              <LoadingSpinner size={32} color={theme.main500} />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>?</Text>
              <Text style={styles.emptyText}>
                {t("common.noResultsForQuery", { query: query.trim() })}
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              ListHeaderComponent={
                <Text style={styles.resultCount}>
                  {t("common.resultCount", { count: results.length })}
                </Text>
              }
              renderItem={({ item }) => (
                <SearchResultItem
                  word={item}
                  allWords={words}
                  isOpen={openIds.has(item.id)}
                  isRelatedOpen={relatedOpenIds.has(item.id)}
                  onToggle={() => {
                    setOpenIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                  onToggleRelated={() => {
                    setRelatedOpenIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
              keyboardShouldPersistTaps="handled"
              style={styles.flex}
            />
          )
        ) : (
          <ScrollView
            style={styles.studyScroll}
            contentContainerStyle={styles.linksContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>{t("home.studySection")}</Text>
            <View style={styles.links}>
              {STUDY_LINKS.map(({ path, Icon, titleKey }) => {
                const count = studyCounts[titleKey];
                const linkLoading =
                  isLoading ||
                  (titleKey === "nav.categories" && categoriesLoading) ||
                  (titleKey === "nav.themes" && themesLoading);
                return (
                  <StudyLinkRow
                    key={path}
                    Icon={Icon}
                    title={t(titleKey)}
                    subtitle={studyCountLabel(titleKey, count, t)}
                    loading={linkLoading}
                    onPress={() => router.push(path as Href)}
                  />
                );
              })}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {!isSearching ? (
        <WordAddFab onNewWord={handleNewWord} onBulkImport={handleBulkImport} />
      ) : null}

      <WordFormModal
        visible={formVisible}
        initial={editingWord}
        allWords={words}
        onClose={() => {
          setFormVisible(false);
          setEditingWord(null);
        }}
        onSave={handleFormSave}
      />

      <BulkImportModal
        visible={bulkVisible}
        allWords={words}
        onClose={() => setBulkVisible(false)}
        onImport={bulkCreate}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.appBg,
    },
    flex: {
      flex: 1,
    },
    studyScroll: {
      flex: 1,
      backgroundColor: theme.appBg,
    },
    header: {
      backgroundColor: theme.appSurface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.appBorderStrong,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    subtitle: {
      flex: 1,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: theme.main400,
    },
    settingsBtn: {
      padding: 8,
      borderRadius: 12,
      marginRight: -8,
      marginTop: -4,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.appText,
      marginBottom: 12,
    },
    linksContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 100,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: theme.appTextMuted,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    links: {
      gap: 8,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 36,
      color: theme.appBorderStrong,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.appTextMuted,
      textAlign: "center",
    },
    resultCount: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.appTextMuted,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
  });
}
