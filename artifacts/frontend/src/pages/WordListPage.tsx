import { useLocation, useSearch } from "wouter";
import { useWords } from "../hooks/useWords";
import { WordListPanel } from "../components/WordListPanel";
import { useTranslation } from "../i18n/I18nProvider";

export function WordListPage() {
  const { t } = useTranslation();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { words, isLoading, isError, updateWord, deleteWord, deleteWords } =
    useWords();

  const showAll = new URLSearchParams(search).get("all") === "1";
  const listedWords = showAll ? words : words.filter((w) => !w.starred);
  const returnPath = showAll ? "/words?all=1" : "/words";

  return (
    <div className="bg-app-surface min-h-dvh">
      <div className="sm:border-app-border mx-auto max-w-2xl pb-8 sm:box-content sm:border-r-2 sm:border-l-2">
        <WordListPanel
          layout="page"
          pageTitle={showAll ? t("words.allTitle") : t("words.title")}
          onBack={() => navigate("/")}
          words={listedWords}
          allWords={words}
          isLoading={isLoading}
          isError={isError}
          studyTitle={showAll ? t("words.allTitle") : t("words.studyTitle")}
          studyReturnPath={returnPath}
          onUpdate={updateWord}
          onDelete={deleteWord}
          onBulkDelete={deleteWords}
        />
      </div>
    </div>
  );
}
