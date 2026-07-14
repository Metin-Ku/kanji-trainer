import { useState } from "react";
import { WordAddFab } from "../../components/WordAddFab";
import { BulkImportModal } from "../../components/BulkImportModal";
import { WordFormModal } from "../../components/WordFormModal";
import { useWords } from "../../hooks/useWords";
import { useThemes } from "../../hooks/useThemes";
import { useCategories } from "../../hooks/useCategories";
import { useStudyHistory } from "../../hooks/useStudyHistory";
import { filterWords } from "../../utils/filterWords";
import type { Word } from "../../types";
import { useTranslation } from "../../i18n/I18nProvider";
import { useConfirm } from "../../components/ConfirmProvider";
import { HomeHeader } from "./HomeHeader";
import { HomeSearchResults } from "./HomeSearchResults";
import { HomeStudyLinks } from "./HomeStudyLinks";

export function HomePage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { words, isLoading, updateWord, deleteWord, addWord, bulkCreate } =
    useWords();
  const { themes, isLoading: themesLoading } = useThemes();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { activityByDate, isLoading: activityLoading } = useStudyHistory();
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [relatedOpenIds, setRelatedOpenIds] = useState<Set<number>>(new Set());
  const [editingWord, setEditingWord] = useState<Word | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  function handleSave(data: {
    kanji: string;
    pronunciation: string;
    meaning: string;
    description: string;
    srsExamples?: import("../../types").SrsExample[];
    level: number;
    jlptLevel: string | null;
    date: string;
    relatedWordIds: number[];
    categoryIds: number[];
  }) {
    if (editingWord) updateWord(editingWord.id, data);
    else addWord(data);
    setShowForm(false);
    setEditingWord(undefined);
  }

  function handleNewWord() {
    setEditingWord(undefined);
    setShowForm(true);
  }

  const results = filterWords(words, query);
  const isSearching = query.trim().length > 0;

  function toggleOpen(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setRelatedOpenIds((r) => {
          const n = new Set(r);
          n.delete(id);
          return n;
        });
      } else next.add(id);
      return next;
    });
  }

  function toggleRelated(id: number) {
    setRelatedOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleDelete(id: number) {
    const word = words.find((w) => w.id === id);
    if (
      word &&
      (await confirm(t("home.confirmDelete", { kanji: word.kanji })))
    ) {
      deleteWord(id);
    }
  }

  return (
    <div className="min-h-dvh max-w-2xl mx-auto bg-app-bg flex flex-col sm:box-content sm:border-l-2 sm:border-r-2 sm:border-app-border">
      <HomeHeader
        query={query}
        onQueryChange={setQuery}
        isSearching={isSearching}
        activityByDate={activityByDate}
        activityLoading={activityLoading}
      />

      {isSearching ? (
        <HomeSearchResults
          query={query}
          results={results}
          allWords={words}
          isLoading={isLoading}
          openIds={openIds}
          relatedOpenIds={relatedOpenIds}
          onToggleOpen={toggleOpen}
          onToggleRelated={toggleRelated}
          onEdit={(word) => {
            setEditingWord(word);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      ) : (
        <HomeStudyLinks
          words={words}
          themes={themes}
          categories={categories}
          isLoading={isLoading}
          themesLoading={themesLoading}
          categoriesLoading={categoriesLoading}
        />
      )}

      {!isSearching && (
        <WordAddFab
          onNewWord={handleNewWord}
          onBulkImport={() => setShowBulk(true)}
        />
      )}

      {showForm && (
        <WordFormModal
          initial={editingWord}
          allWords={words}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingWord(undefined);
          }}
        />
      )}
      {showBulk && (
        <BulkImportModal
          onImport={bulkCreate}
          onClose={() => setShowBulk(false)}
          allWords={words}
        />
      )}
    </div>
  );
}
