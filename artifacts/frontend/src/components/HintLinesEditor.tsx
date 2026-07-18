import { useRef } from "react";
import { Highlighter, Trash2 } from "lucide-react";
import type { SrsExampleHint } from "../types";
import { renderHintParts } from "../lib/srsExamples";
import { useTranslation } from "../i18n/I18nProvider";

type HintLinesEditorProps = {
  hints: SrsExampleHint[];
  onChange: (hints: SrsExampleHint[]) => void;
  label?: string;
};

export function HintLinesEditor({
  hints,
  onChange,
  label,
}: HintLinesEditorProps) {
  const { t } = useTranslation();
  const hintRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function patchHint(index: number, patch: Partial<SrsExampleHint>) {
    onChange(hints.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function addHint() {
    onChange([...hints, { text: "" }]);
  }

  function removeHint(index: number) {
    onChange(hints.filter((_, i) => i !== index));
  }

  function addHighlight(index: number) {
    const el = hintRefs.current[index];
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const selected = el.value.slice(start, end).trim();
    if (!selected) return;
    const hint = hints[index];
    const highlights = [...(hint.highlights ?? [])];
    if (!highlights.includes(selected)) highlights.push(selected);
    patchHint(index, { highlights });
  }

  function removeHighlight(index: number, word: string) {
    const hint = hints[index];
    patchHint(index, {
      highlights: (hint.highlights ?? []).filter((h) => h !== word),
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-app-text-muted text-[10px] font-bold tracking-widest uppercase">
        {label ?? t("srs.editor.hintLines")}
      </p>
      {hints.map((hint, hintIndex) => (
        <div key={hintIndex} className="space-y-1">
          <div className="flex gap-1.5">
            <input
              ref={(el) => {
                hintRefs.current[hintIndex] = el;
              }}
              type="text"
              value={hint.text}
              onChange={(e) => patchHint(hintIndex, { text: e.target.value })}
              placeholder={t("srs.editor.placeholders.hint")}
              className="border-app-border-strong bg-app-surface text-app-text focus:ring-main-300 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => addHighlight(hintIndex)}
              className="border-app-border-strong bg-app-surface text-app-text-secondary hover:text-main-500 dark:hover:text-main-600 hover:border-main-300 dark:hover:border-main-400 shrink-0 rounded-lg border p-2"
              title={t("srs.editor.highlightSelection")}
            >
              <Highlighter size={14} />
            </button>
            {hints.length > 1 && (
              <button
                type="button"
                onClick={() => removeHint(hintIndex)}
                className="border-app-border-strong bg-app-surface text-app-text-muted shrink-0 rounded-lg border p-2 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {hint.highlights && hint.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hint.highlights.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => removeHighlight(hintIndex, h)}
                  className="bg-main-100 text-main-600 dark:bg-main-900 dark:text-main-300 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                >
                  {h} ×
                </button>
              ))}
            </div>
          )}
          {hint.text && (
            <p className="text-app-text-secondary pl-0.5 text-xs">
              {renderHintParts(hint.text, hint.highlights).map((p, i) =>
                p.highlight ? (
                  <span
                    key={i}
                    className="text-main-600 bg-main-100 dark:bg-main-900 rounded px-0.5 font-semibold"
                  >
                    {p.text}
                  </span>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </p>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addHint}
        className="text-app-text-muted hover:text-main-500 dark:hover:text-main-600 text-xs font-semibold"
      >
        {t("srs.editor.addLine")}
      </button>
    </div>
  );
}

export function HintLinesDisplay({
  hints,
  visible,
}: {
  hints: SrsExampleHint[];
  visible: boolean;
}) {
  if (!visible) return null;
  const lines = hints.filter((h) => h.text.trim());
  if (lines.length === 0) return null;

  return (
    <div className="bg-main-50 dark:bg-main-950 border-main-100 dark:border-main-900 mt-4 space-y-2 rounded-xl border px-4 py-3">
      {lines.map((hint, hi) => (
        <p key={hi} className="text-app-text-secondary text-sm leading-relaxed">
          {renderHintParts(hint.text, hint.highlights).map((p, i) =>
            p.highlight ? (
              <span
                key={i}
                className="text-main-600 bg-main-100 dark:bg-main-900 rounded px-0.5 font-semibold"
              >
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
