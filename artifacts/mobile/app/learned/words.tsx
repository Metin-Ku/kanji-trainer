import { WordListPanel } from "@/components/WordListPanel";
import type { WordFormSaveData } from "@/components/WordFormModal";
import { useTranslation } from "@/i18n/I18nProvider";
import { useWords } from "@/hooks/useWords";

export default function LearnedWordsScreen() {
  const { t } = useTranslation();
  const { words, isLoading, isError, updateWord, deleteWord, deleteWords } =
    useWords();

  const handleEditSave = (id: number, data: WordFormSaveData) => {
    updateWord(id, {
      ...data,
      relatedWordIds: words.find((w) => w.id === id)?.relatedWordIds ?? [],
      categoryIds: data.categoryIds,
    });
  };

  return (
    <WordListPanel
      title={t("learned.studyWordsTitle")}
      prefsScope="/learned/words"
      words={words}
      isLoading={isLoading}
      isError={isError}
      mode="words"
      learnedOnly
      emptyMessage={t("learned.empty")}
      onUpdate={updateWord}
      onDelete={deleteWord}
      onDeleteMany={deleteWords}
      onEditSave={handleEditSave}
      studyTitle={t("learned.studyWordsTitle")}
      studyReturnPath="/learned/words"
    />
  );
}
