import { WordListPanel } from "@/components/WordListPanel";
import { useTranslation } from "@/i18n/I18nProvider";
import { useWords } from "@/hooks/useWords";

export default function PronunciationScreen() {
  const { t } = useTranslation();
  const { words, isLoading, isError, updateWord, deleteWords } = useWords();

  return (
    <WordListPanel
      title={t("pronunciation.title")}
      prefsScope="pronunciation"
      words={words}
      isLoading={isLoading}
      isError={isError}
      mode="pronunciation"
      filterLearned
      onUpdate={updateWord}
      onDeleteMany={deleteWords}
      studyTitle={t("pronunciation.title")}
      studyReturnPath="/pronunciation"
    />
  );
}
