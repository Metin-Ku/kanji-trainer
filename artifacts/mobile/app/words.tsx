import { useLocalSearchParams } from "expo-router";
import { WordListPanel } from "@/components/WordListPanel";
import type { WordFormSaveData } from "@/components/WordFormModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useWords } from "@/hooks/useWords";

export default function WordsScreen() {
  const { t } = useTranslation();
  const { all } = useLocalSearchParams<{ all?: string }>();
  const { words, isLoading, isError, updateWord, deleteWord, deleteWords } =
    useWords();

  const showAll = all === "1";
  const title = showAll ? t("words.allTitle") : t("words.title");
  const prefsScope = showAll ? "/words?all=1" : "/words";

  const handleEditSave = (id: number, data: WordFormSaveData) => {
    updateWord(id, {
      ...data,
      relatedWordIds: words.find((w) => w.id === id)?.relatedWordIds ?? [],
      categoryIds: data.categoryIds,
    });
  };

  return (
    <WordListPanel
      title={title}
      prefsScope={prefsScope}
      words={words}
      isLoading={isLoading}
      isError={isError}
      mode="words"
      filterLearned={!showAll}
      onUpdate={updateWord}
      onDelete={deleteWord}
      onDeleteMany={deleteWords}
      onEditSave={handleEditSave}
      studyTitle={title}
      studyReturnPath={showAll ? "/words?all=1" : "/words"}
    />
  );
}
