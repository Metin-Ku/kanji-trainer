import { ArrowLeft } from "lucide-react";
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
      <div className="max-w-2xl mx-auto pb-28 sm:border-l sm:border-r sm:border-app-border">
        <div className="sticky top-0 z-10 bg-app-surface border-b border-app-border px-5 pt-4 pb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted hover:text-app-text-secondary transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
              {t("words.title")}
            </span>
          </button>
        </div>

        <div className="px-5 pt-2">
          <WordListPanel
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
    </div>
  );
}
