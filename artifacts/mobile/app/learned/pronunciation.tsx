import { WordListPanel } from "@/components/WordListPanel";
import { useTranslation } from "@/i18n/I18nProvider";
import { useWords } from "@/hooks/useWords";

export default function LearnedPronunciationScreen() {
  const { t } = useTranslation();
  const { words, isLoading, isError, updateWord, deleteWord } = useWords();

  return (
    <WordListPanel
      title={t("learned.studyPronunciationTitle")}
      prefsScope="/learned/pronunciation"
      words={words}
      isLoading={isLoading}
      isError={isError}
      mode="pronunciation"
      learnedOnly
      emptyMessage={t("learned.empty")}
      onUpdate={updateWord}
      onDelete={deleteWord}
      showDice={false}
    />
  );
}
