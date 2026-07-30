import { WordListPanel } from "@/components/WordListPanel";
import { useTranslation } from "@/i18n/I18nProvider";
import { useWords } from "@/hooks/useWords";

export default function MeaningScreen() {
  const { t } = useTranslation();
  const { words, isLoading, isError, updateWord, deleteWords } = useWords();

  return (
    <WordListPanel
      title={t("meaning.title")}
      prefsScope="meaning"
      words={words}
      isLoading={isLoading}
      isError={isError}
      mode="meaning"
      filterLearned
      onUpdate={updateWord}
      onDeleteMany={deleteWords}
      studyTitle={t("meaning.title")}
      studyReturnPath="/meaning"
    />
  );
}
