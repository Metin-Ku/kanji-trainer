import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useTheme } from "../hooks/useThemes";
import { HintLinesEditor } from "../components/HintLinesEditor";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import type { ThemeQuizQuestion } from "../types";
import {
  defaultChoices,
  emptyQuestion,
  sanitizeThemeQuestions,
} from "../lib/themeQuiz";
import { useTranslation } from "../i18n/I18nProvider";
import { pageTitleLabelClass } from "../lib/japaneseScript";

export function ThemeQuizEditorPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/themes/:id/quiz/edit");
  const id = Number(params?.id);

  const { theme, isLoading, saveThemeQuestions, isSaving } = useTheme(id);
  const [questions, setQuestions] = useState<ThemeQuizQuestion[]>([]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (theme?.questions) {
      setQuestions(
        theme.questions.length > 0
          ? theme.questions.map((q) => ({ ...q }))
          : [emptyQuestion(0, "ab")],
      );
    }
  }, [theme?.questions]);

  function patchQuestion(index: number, patch: Partial<ThemeQuizQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function setQuestionType(index: number, type: "ab" | "four") {
    patchQuestion(index, {
      type,
      choices: defaultChoices(type),
      correctKey: type === "ab" ? "a" : "1",
    });
  }

  async function handleSave() {
    await saveThemeQuestions({
      questions: sanitizeThemeQuestions(questions),
    });
    navigate(`/themes/${id}`);
  }

  if (isLoading || !theme) {
    return <LoadingPlaceholder padding="lg" />;
  }

  return (
    <div className="bg-app-bg min-h-dvh pb-24">
      <div className="sm:border-app-border mx-auto max-w-2xl sm:box-content sm:border-r-2 sm:border-l-2">
        <div className="bg-app-surface border-app-border sticky top-0 z-10 border-b px-5 pt-4 pb-4">
          <button
            onClick={() => navigate(`/themes/${id}`)}
            className="text-app-text-muted -ml-1 flex items-center gap-1.5 p-1"
          >
            <ArrowLeft size={18} />
            <span className={pageTitleLabelClass(theme.name)}>
              {theme.name}
            </span>
          </button>
          <h1 className="text-app-text mt-2 text-xl font-bold">
            {t("themeQuiz.editTitle")}
          </h1>
        </div>

        <div className="space-y-4 px-5 py-4">
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="border-app-border bg-app-surface overflow-hidden rounded-2xl border"
            >
              <div className="border-app-border bg-app-muted/30 flex items-center gap-2 border-b px-4 py-3">
                <span className="text-app-text text-sm font-bold">
                  #{qi + 1}
                </span>
                <select
                  value={q.type}
                  onChange={(e) =>
                    setQuestionType(qi, e.target.value as "ab" | "four")
                  }
                  className="border-app-border-strong bg-app-surface rounded-lg border px-2 py-1 text-xs"
                >
                  <option value="ab">{t("themeQuiz.typeAb")}</option>
                  <option value="four">{t("themeQuiz.typeFour")}</option>
                </select>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [qi]: !c[qi] }))}
                >
                  {collapsed[qi] ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </button>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((prev) => prev.filter((_, i) => i !== qi))
                    }
                    className="text-app-text-muted hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {!collapsed[qi] && (
                <div className="space-y-4 p-4">
                  <div>
                    <label className="text-app-text-muted text-[10px] font-bold tracking-widest uppercase">
                      {t("themeQuiz.prompt")}
                    </label>
                    <textarea
                      value={q.prompt}
                      onChange={(e) =>
                        patchQuestion(qi, { prompt: e.target.value })
                      }
                      rows={4}
                      className="border-app-border-strong text-app-text mt-1 w-full rounded-xl border px-3 py-2 text-sm font-medium"
                      placeholder={t("themeQuiz.promptPlaceholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-app-text-muted text-[10px] font-bold tracking-widest uppercase">
                      {t("themeQuiz.choices")}
                    </p>
                    {q.choices.map((choice, ci) => (
                      <div key={choice.key} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctKey === choice.key}
                          onChange={() =>
                            patchQuestion(qi, { correctKey: choice.key })
                          }
                        />
                        <span className="w-6 text-sm font-bold">
                          {choice.key}.
                        </span>
                        <input
                          value={choice.label}
                          onChange={(e) => {
                            const choices = q.choices.map((c, i) =>
                              i === ci ? { ...c, label: e.target.value } : c,
                            );
                            patchQuestion(qi, { choices });
                          }}
                          className="border-app-border-strong flex-1 rounded-lg border px-3 py-1.5 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <HintLinesEditor
                    hints={q.hints}
                    onChange={(hints) => patchQuestion(qi, { hints })}
                    label={t("themeQuiz.hints")}
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setQuestions((prev) => [...prev, emptyQuestion(prev.length)])
            }
            className="border-app-border-strong text-app-text-muted w-full rounded-xl border border-dashed py-2 text-sm font-semibold"
          >
            <Plus size={14} className="mr-1 inline" />
            {t("themeQuiz.addQuestion")}
          </button>
        </div>

        <div className="border-app-border bg-app-surface fixed right-0 bottom-0 left-0 z-40 border-t px-5 py-3">
          <div className="mx-auto flex max-w-2xl gap-2">
            <button
              type="button"
              onClick={() => navigate(`/themes/${id}`)}
              className="border-app-border-strong flex-1 rounded-xl border py-2.5 text-sm font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="bg-main-500 flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t("common.update")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
