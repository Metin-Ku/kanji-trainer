import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Import,
  Link2,
} from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";
import type { SrsExample, Word } from "../types";
import {
  parsePlainDescriptionToSrsExamples,
  renderClozeSentence,
  sanitizeSrsExamples,
  syncExampleFromSentence,
} from "../lib/srsExamples";
import { linkSrsExamples } from "../lib/wordLinking";
import { ExampleSentenceDisplay } from "./ExampleSentenceDisplay";
import { HintLinesEditor } from "./HintLinesEditor";
import { useTranslation } from "../i18n/I18nProvider";

interface Props {
  examples: SrsExample[];
  onChange: (examples: SrsExample[]) => void;
  headword: string;
  plainDescription: string;
  allWords: Word[];
  currentWordId?: number;
}

function emptyExample(order: number): SrsExample {
  return { order, sentence: "", hiddenWord: "", hints: [{ text: "" }] };
}

function reindexExamples(examples: SrsExample[]): SrsExample[] {
  return examples.map((ex, i) => ({ ...ex, order: i }));
}

export function SrsExamplesEditor({
  examples,
  onChange,
  headword,
  plainDescription,
  allWords,
  currentWordId,
}: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [linkingIndex, setLinkingIndex] = useState<number | null>(null);
  const [linkingAll, setLinkingAll] = useState(false);
  const sentenceRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function patchExample(index: number, patch: Partial<SrsExample>) {
    onChange(
      examples.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    );
  }

  function addExample() {
    onChange(reindexExamples([...examples, emptyExample(examples.length)]));
  }

  function removeExample(index: number) {
    onChange(reindexExamples(examples.filter((_, i) => i !== index)));
  }

  function moveExample(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= examples.length) return;
    const copy = [...examples];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(reindexExamples(copy));
  }

  function setHiddenFromSelection(exIndex: number) {
    const el = sentenceRefs.current[exIndex];
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const selected = el.value.slice(start, end);
    if (selected.trim()) {
      patchExample(exIndex, {
        hiddenWord: selected,
        linkedTokens: undefined,
      });
    }
  }

  async function importFromDescription() {
    const parsed = parsePlainDescriptionToSrsExamples(
      plainDescription,
      headword,
    );
    if (parsed.length === 0) return;
    try {
      setLinkingAll(true);
      const linked = await linkSrsExamples(
        sanitizeSrsExamples(parsed),
        allWords,
        currentWordId,
      );
      onChange(linked);
    } catch {
      alert(t("srs.editor.linkFailed"));
      onChange(sanitizeSrsExamples(parsed));
    } finally {
      setLinkingAll(false);
    }
  }

  async function linkOneExample(exIndex: number) {
    const ex = examples[exIndex];
    if (!ex.sentence.trim()) return;
    setLinkingIndex(exIndex);
    try {
      const linked = await linkSrsExamples([ex], allWords, currentWordId);
      patchExample(exIndex, linked[0] ?? ex);
    } catch {
      alert(t("srs.editor.linkFailed"));
    } finally {
      setLinkingIndex(null);
    }
  }

  async function linkAllExamples() {
    setLinkingAll(true);
    try {
      const linked = await linkSrsExamples(examples, allWords, currentWordId);
      onChange(linked);
    } catch {
      alert(t("srs.editor.linkFailed"));
    } finally {
      setLinkingAll(false);
    }
  }

  if (examples.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-app-border-strong bg-app-muted/80 px-4 py-8 text-center space-y-3">
        <p className="text-sm text-app-text-secondary leading-relaxed">
          {t("srs.editor.emptyHint")}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={addExample}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-main-500 text-white text-sm font-semibold hover:bg-main-600"
          >
            <Plus size={15} /> {t("srs.editor.addExample")}
          </button>
          {plainDescription.trim() && (
            <button
              type="button"
              onClick={importFromDescription}
              disabled={linkingAll}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-app-border-strong text-app-text-secondary text-sm font-semibold hover:bg-app-surface disabled:opacity-50"
            >
              {linkingAll ? (
                <LoadingSpinner size={15} />
              ) : (
                <Import size={15} />
              )}{" "}
              {t("srs.editor.importFromDescription")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-app-text-muted uppercase tracking-wide">
          {t("srs.editor.exampleSentences")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={linkAllExamples}
            disabled={linkingAll || allWords.length === 0}
            className="inline-flex items-center gap-1 text-xs font-semibold text-app-text-secondary hover:text-main-600 disabled:opacity-40"
          >
            {linkingAll ? (
              <LoadingSpinner size={13} />
            ) : (
              <Link2 size={13} />
            )}{" "}
            {t("srs.editor.linkAll")}
          </button>
          <button
            type="button"
            onClick={addExample}
            className="inline-flex items-center gap-1 text-xs font-semibold text-main-500 hover:text-main-600"
          >
            <Plus size={14} /> {t("srs.editor.add")}
          </button>
        </div>
      </div>

      {examples.map((ex, exIndex) => {
        const isCollapsed = collapsed[exIndex] ?? false;
        const linkCount = ex.linkedTokens?.length ?? 0;
        return (
          <div
            key={exIndex}
            className="rounded-xl border border-app-border bg-app-muted/60 overflow-hidden"
          >
            <div className="flex items-center gap-1 px-3 py-2 bg-app-surface border-b border-app-border">
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={exIndex === 0}
                  onClick={() => moveExample(exIndex, -1)}
                  className="p-0.5 text-app-text-muted hover:text-app-text-secondary disabled:opacity-30"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={exIndex === examples.length - 1}
                  onClick={() => moveExample(exIndex, 1)}
                  className="p-0.5 text-app-text-muted hover:text-app-text-secondary disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCollapsed((c) => ({
                    ...c,
                    [exIndex]: !isCollapsed,
                  }))
                }
                className="flex-1 text-left text-sm font-semibold text-app-text"
              >
                {t("srs.editor.exampleN", { n: exIndex + 1 })}
                {ex.sentence && (
                  <span className="ml-2 font-normal text-app-text-muted truncate">
                    {renderClozeSentence(ex.sentence, ex.hiddenWord).slice(
                      0,
                      24,
                    )}
                    …
                  </span>
                )}
                {linkCount > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-main-100 text-main-600">
                    {t("common.linkCount", { count: linkCount })}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    ex.sentence &&
                    !confirm(t("common.confirmDeleteExample"))
                  )
                    return;
                  removeExample(exIndex);
                }}
                className="p-1.5 text-app-text-muted hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {!isCollapsed && (
              <div className="p-3 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1">
                    {t("srs.editor.japaneseSentence")}
                  </label>
                  <input
                    ref={(el) => {
                      sentenceRefs.current[exIndex] = el;
                    }}
                    type="text"
                    value={ex.sentence}
                    onChange={(e) =>
                      patchExample(exIndex, {
                        ...syncExampleFromSentence({
                          ...ex,
                          sentence: e.target.value,
                        }),
                        linkedTokens: undefined,
                      })
                    }
                    placeholder={t("srs.editor.placeholders.sentence")}
                    className="w-full rounded-lg border border-app-border-strong bg-app-surface px-3 py-2 text-lg font-bold text-app-text focus:outline-none focus:ring-2 focus:ring-main-300"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setHiddenFromSelection(exIndex)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-app-surface border border-app-border-strong text-app-text-secondary hover:border-main-300"
                  >
                    {t("srs.editor.hideSelection")}
                  </button>
                  {headword && ex.sentence.includes(headword) && (
                    <button
                      type="button"
                      onClick={() =>
                        patchExample(exIndex, {
                          hiddenWord: headword,
                          linkedTokens: undefined,
                        })
                      }
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-app-surface border border-app-border-strong text-app-text-secondary hover:border-main-300"
                    >
                      {t("srs.editor.selectHeadword", { headword })}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => linkOneExample(exIndex)}
                    disabled={
                      !ex.sentence.trim() ||
                      linkingIndex === exIndex ||
                      allWords.length === 0
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-app-surface border border-app-border-strong text-app-text-secondary hover:border-main-300 disabled:opacity-40"
                  >
                    {linkingIndex === exIndex ? (
                      <LoadingSpinner size={12} />
                    ) : (
                      <Link2 size={12} />
                    )}
                    {t("srs.editor.linkWords")}
                    {linkCount > 0 && (
                      <span className="text-main-500">({linkCount})</span>
                    )}
                  </button>
                </div>

                {ex.sentence && (
                  <div className="rounded-lg bg-main-50 dark:bg-main-950 border border-main-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-main-400 uppercase tracking-widest mb-0.5">
                      {t("srs.editor.srsPreview")}
                    </p>
                    <ExampleSentenceDisplay
                      example={ex}
                      headwordKanji={headword}
                      words={allWords}
                      wordLinksEnabled={linkCount > 0}
                      onWordTap={() => {}}
                    />
                  </div>
                )}

                <HintLinesEditor
                  hints={ex.hints}
                  onChange={(hints) => patchExample(exIndex, { hints })}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addExample}
        className="w-full py-2 rounded-xl border border-dashed border-app-border-strong text-sm font-semibold text-app-text-muted hover:border-main-300 hover:text-main-500"
      >
        + {t("srs.editor.addExample")}
      </button>
    </div>
  );
}
