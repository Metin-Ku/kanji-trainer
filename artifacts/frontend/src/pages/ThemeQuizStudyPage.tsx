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
      <div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
        <p className="text-app-text-muted mb-4">{t("themeQuiz.noQuestions")}</p>
        <button
          type="button"
          onClick={() => navigate(`/themes/${id}/quiz/edit`)}
          className="bg-main-500 rounded-xl px-4 py-2 font-semibold text-white"
        >
          {t("themeQuiz.edit")}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="bg-app-bg flex min-h-dvh flex-col items-center justify-center p-8">
        <p className="text-app-text mb-2 text-2xl font-bold">
          {t("common.completed")}
        </p>
        <p className="text-app-text-secondary mb-8">
          {t("themeQuiz.score", {
            correct: correctCount,
            total: questions.length,
          })}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/themes/${id}`)}
            className="border-app-border-strong rounded-xl border px-4 py-2.5 font-semibold"
          >
            {t("themes.backToTheme")}
          </button>
          <button
            type="button"
            onClick={restart}
            className="bg-main-500 rounded-xl px-4 py-2.5 font-semibold text-white"
          >
            {t("themeQuiz.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-app-bg min-h-dvh">
      <div className="sm:border-app-border mx-auto flex min-h-dvh max-w-2xl flex-col sm:box-content sm:border-r-2 sm:border-l-2">
        <div className="border-app-border bg-app-surface border-b px-5 pt-4 pb-3">
          <button
            onClick={() => navigate(`/themes/${id}`)}
            className="text-app-text-muted -ml-1 flex items-center gap-1.5 p-1"
          >
            <ArrowLeft size={18} />
            <span className="text-main-500 dark:text-main-600 text-[11px] font-semibold tracking-widest uppercase">
              {theme.name}
            </span>
          </button>
          <p className="text-app-text-muted mt-2 text-xs">
            {t("themeQuiz.progress", {
              current: index + 1,
              total: questions.length,
            })}
          </p>
        </div>

        <div className="flex-1 px-5 py-6">
          <p className="text-app-text text-base leading-relaxed font-medium whitespace-pre-wrap sm:text-lg">
            {q.prompt}
          </p>

          <div
            className={`mt-6 grid gap-2 ${q.type === "ab" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}
          >
            {q.choices.map((choice) => {
              const selected = selectedKey === choice.key;
              const isCorrect = choice.key === q.correctKey;
              let cls =
                "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ";
              if (revealed) {
                if (isCorrect)
                  cls +=
                    "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
                else if (selected)
                  cls +=
                    "border-red-400 bg-red-50 text-red-600 dark:bg-red-950";
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
                  <span className="font-bold">{choice.key}.</span>{" "}
                  {choice.label}
                </button>
              );
            })}
          </div>

          {!revealed && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleHints}
                className="border-app-border-strong text-app-text-secondary inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold"
              >
                <Lightbulb size={16} />
                {t("themeQuiz.showHint")}
              </button>
              <button
                type="button"
                disabled={!selectedKey}
                onClick={handleSubmit}
                className="bg-main-500 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t("themeQuiz.submit")}
              </button>
            </div>
          )}

          <HintLinesDisplay hints={q.hints} visible={hintsOpen || revealed} />

          {revealed && (
            <div className="mt-6">
              <p
                className={`mb-3 text-sm font-semibold ${selectedKey === q.correctKey ? "text-green-600" : "text-red-500"}`}
              >
                {selectedKey === q.correctKey
                  ? t("themeQuiz.correct")
                  : t("themeQuiz.incorrect", { answer: q.correctKey })}
              </p>
              <button
                type="button"
                onClick={goNext}
                className="bg-main-500 w-full rounded-xl py-3 font-semibold text-white"
              >
                {index + 1 >= questions.length
                  ? t("themeQuiz.finish")
                  : t("themeQuiz.next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
