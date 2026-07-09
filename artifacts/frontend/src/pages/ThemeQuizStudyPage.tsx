import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useTheme } from "../hooks/useThemes";
import { HintLinesDisplay } from "../components/HintLinesEditor";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import { useTranslation } from "../i18n/I18nProvider";
import { isDesktopStudyKeyboard, isEditableTarget } from "../lib/studyKeyboard";

export function ThemeQuizStudyPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/themes/:id/quiz");
  const id = Number(params?.id);

  const { theme, isLoading } = useTheme(id);
  const questions = useMemo(() => theme?.questions ?? [], [theme?.questions]);

  const [index, setIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[index];

  const toggleHints = useCallback(() => {
    if (!revealed) setHintsOpen((v) => !v);
  }, [revealed]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current + 1 >= questions.length) {
        setFinished(true);
        return current;
      }
      return current + 1;
    });
    setSelectedKey(null);
    setRevealed(false);
    setHintsOpen(false);
  }, [questions.length]);

  const handleKnow = useCallback(() => {
    if (!q || revealed) return;
    setSelectedKey(q.correctKey);
    setCorrectCount((c) => c + 1);
    setRevealed(true);
    setHintsOpen(true);
  }, [q, revealed]);

  const handleDontKnow = useCallback(() => {
    if (!q || revealed) return;
    setSelectedKey(null);
    setRevealed(true);
    setHintsOpen(true);
  }, [q, revealed]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (finished) return;
      if (isEditableTarget(e.target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        toggleHints();
        return;
      }

      if (revealed) {
        if (e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
        }
        return;
      }

      if (isDesktopStudyKeyboard()) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handleKnow();
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleDontKnow();
          return;
        }
      }

      if (!q) return;
      if (q.type === "ab") {
        if (e.key === "a" || e.key === "A") setSelectedKey("a");
        if (e.key === "b" || e.key === "B") setSelectedKey("b");
      } else {
        if (["1", "2", "3", "4"].includes(e.key)) setSelectedKey(e.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, revealed, q, toggleHints, goNext, handleKnow, handleDontKnow]);

  function handleSubmit() {
    if (!q || !selectedKey) return;
    const ok = selectedKey === q.correctKey;
    if (ok) setCorrectCount((c) => c + 1);
    setRevealed(true);
    setHintsOpen(true);
  }

  function restart() {
    setIndex(0);
    setSelectedKey(null);
    setRevealed(false);
    setHintsOpen(false);
    setCorrectCount(0);
    setFinished(false);
  }

  if (isLoading || !theme) {
    return <LoadingPlaceholder padding="lg" />;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-8 text-center">
        <p className="text-app-text-muted mb-4">{t("themeQuiz.noQuestions")}</p>
        <button
          type="button"
          onClick={() => navigate(`/themes/${id}/quiz/edit`)}
          className="px-4 py-2 rounded-xl bg-main-500 text-white font-semibold"
        >
          {t("themeQuiz.edit")}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-dvh bg-app-bg flex flex-col items-center justify-center p-8">
        <p className="text-2xl font-bold text-app-text mb-2">{t("common.completed")}</p>
        <p className="text-app-text-secondary mb-8">
          {t("themeQuiz.score", { correct: correctCount, total: questions.length })}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/themes/${id}`)}
            className="px-4 py-2.5 rounded-xl border border-app-border-strong font-semibold"
          >
            {t("themes.backToTheme")}
          </button>
          <button
            type="button"
            onClick={restart}
            className="px-4 py-2.5 rounded-xl bg-main-500 text-white font-semibold"
          >
            {t("themeQuiz.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-app-bg">
      <div className="max-w-2xl mx-auto sm:border-l sm:border-r sm:border-app-border min-h-dvh flex flex-col">
        <div className="px-5 pt-4 pb-3 border-b border-app-border bg-app-surface">
          <button
            onClick={() => navigate(`/themes/${id}`)}
            className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">
              {theme.name}
            </span>
          </button>
          <p className="text-xs text-app-text-muted mt-2">
            {t("themeQuiz.progress", { current: index + 1, total: questions.length })}
          </p>
        </div>

        <div className="flex-1 px-5 py-6">
          <p className="text-base sm:text-lg font-medium text-app-text leading-relaxed whitespace-pre-wrap">
            {q.prompt}
          </p>

          <div className={`mt-6 grid gap-2 ${q.type === "ab" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
            {q.choices.map((choice) => {
              const selected = selectedKey === choice.key;
              const isCorrect = choice.key === q.correctKey;
              let cls =
                "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ";
              if (revealed) {
                if (isCorrect) cls += "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
                else if (selected) cls += "border-red-400 bg-red-50 text-red-600 dark:bg-red-950";
                else cls += "border-app-border text-app-text-muted opacity-60";
              } else {
                cls += selected
                  ? "border-main-500 bg-main-50 text-main-700 dark:bg-main-950"
                  : "border-app-border-strong bg-app-surface hover:border-main-300";
              }
              return (
                <button
                  key={choice.key}
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelectedKey(choice.key)}
                  className={cls}
                >
                  <span className="font-bold">{choice.key}.</span> {choice.label}
                </button>
              );
            })}
          </div>

          {!revealed && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleHints}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-app-border-strong text-sm font-semibold text-app-text-secondary"
              >
                <Lightbulb size={16} />
                {t("themeQuiz.showHint")}
              </button>
              <button
                type="button"
                disabled={!selectedKey}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl bg-main-500 text-white text-sm font-semibold disabled:opacity-40"
              >
                {t("themeQuiz.submit")}
              </button>
            </div>
          )}

          <HintLinesDisplay hints={q.hints} visible={hintsOpen || revealed} />

          {revealed && (
            <div className="mt-6">
              <p
                className={`text-sm font-semibold mb-3 ${selectedKey === q.correctKey ? "text-green-600" : "text-red-500"}`}
              >
                {selectedKey === q.correctKey
                  ? t("themeQuiz.correct")
                  : t("themeQuiz.incorrect", { answer: q.correctKey })}
              </p>
              <button
                type="button"
                onClick={goNext}
                className="w-full py-3 rounded-xl bg-main-500 text-white font-semibold"
              >
                {index + 1 >= questions.length ? t("themeQuiz.finish") : t("themeQuiz.next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
