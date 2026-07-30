import { WordListPanel } from "@/components/WordListPanel";
import { useTranslation } from "@/i18n/I18nProvider";
import { useWords } from "@/hooks/useWords";

export default function LearnedMeaningScreen() {
  const { t } = useTranslation();
  const { words, isLoading, isError, updateWord, deleteWord } = useWords();

  return (
    <WordListPanel
      title={t("learned.studyMeaningTitle")}
      prefsScope="/learned/meaning"
      words={words}
      isLoading={isLoading}
      isError={isError}
      mode="meaning"
      learnedOnly
      emptyMessage={t("learned.empty")}
      onUpdate={updateWord}
      onDelete={deleteWord}
      showDice={false}
    />
  );
}
