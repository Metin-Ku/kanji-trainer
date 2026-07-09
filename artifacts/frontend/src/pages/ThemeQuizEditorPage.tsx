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
    <div className="min-h-dvh bg-app-bg pb-24">
      <div className="max-w-2xl mx-auto sm:border-l sm:border-r sm:border-app-border">
        <div className="sticky top-0 z-10 bg-app-surface border-b border-app-border px-5 pt-4 pb-4">
          <button
            onClick={() => navigate(`/themes/${id}`)}
            className="flex items-center gap-1.5 p-1 -ml-1 text-app-text-muted"
          >
            <ArrowLeft size={18} />
            <span className={pageTitleLabelClass(theme.name)}>
              {theme.name}
            </span>
          </button>
          <h1 className="text-xl font-bold text-app-text mt-2">
            {t("themeQuiz.editTitle")}
          </h1>
        </div>

        <div className="px-5 py-4 space-y-4">
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="rounded-2xl border border-app-border bg-app-surface overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-app-border bg-app-muted/30">
                <span className="text-sm font-bold text-app-text">
                  #{qi + 1}
                </span>
                <select
                  value={q.type}
                  onChange={(e) =>
                    setQuestionType(qi, e.target.value as "ab" | "four")
                  }
                  className="text-xs rounded-lg border border-app-border-strong px-2 py-1 bg-app-surface"
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
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">
                      {t("themeQuiz.prompt")}
                    </label>
                    <textarea
                      value={q.prompt}
                      onChange={(e) =>
                        patchQuestion(qi, { prompt: e.target.value })
                      }
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-app-border-strong px-3 py-2 text-sm font-medium text-app-text"
                      placeholder={t("themeQuiz.promptPlaceholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">
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
                        <span className="text-sm font-bold w-6">
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
                          className="flex-1 rounded-lg border border-app-border-strong px-3 py-1.5 text-sm"
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
            className="w-full py-2 rounded-xl border border-dashed border-app-border-strong text-sm font-semibold text-app-text-muted"
          >
            <Plus size={14} className="inline mr-1" />
            {t("themeQuiz.addQuestion")}
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-app-border bg-app-surface px-5 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/themes/${id}`)}
              className="flex-1 py-2.5 rounded-xl border border-app-border-strong text-sm font-semibold"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-main-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              {t("common.update")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
