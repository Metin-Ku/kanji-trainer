import { useLocation } from "wouter";
import { useWords } from "../hooks/useWords";
import { WordListPanel } from "../components/WordListPanel";
import { useTranslation } from "../i18n/I18nProvider";

export function WordListPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { words, isLoading, isError, updateWord, deleteWord, deleteWords } =
    useWords();

  const nonStarred = words.filter((w) => !w.starred);

  return (
    <div className="min-h-dvh bg-app-surface">
      <div className="max-w-2xl mx-auto pb-8 sm:border-l sm:border-r sm:border-app-border">
        <WordListPanel
          layout="page"
          pageTitle={t("words.title")}
          onBack={() => navigate("/")}
          words={nonStarred}
          allWords={words}
          isLoading={isLoading}
          isError={isError}
          studyTitle={t("words.studyTitle")}
          studyReturnPath="/words"
          onUpdate={updateWord}
          onDelete={deleteWord}
          onBulkDelete={deleteWords}
        />
      </div>
    </div>
  );
}
