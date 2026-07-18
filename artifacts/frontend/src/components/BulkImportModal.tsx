import { useRef, useState } from "react";
import { X, Upload, CircleCheck, CircleX, Circle } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";
import type { SrsExample, Word } from "../types";
import {
  parseBulkDescriptionHtml,
  elementSurfaceText,
} from "../lib/srsExamples";
import { linkSrsExamples } from "../lib/wordLinking";
import { parseBracketList, parseCategoryBracketList } from "../lib/categoryMatch";
import { useTranslation } from "../i18n/I18nProvider";
import { useCategories } from "../hooks/useCategories";
import { matchCategoryNames } from "../lib/categoryMatch";

interface BulkWord {
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  srsExamples?: SrsExample[];
  jlptLevel?: string;
  categoryNames?: string[];
  synonymKanji?: string[];
}

type PreviewEntry = BulkWord & { id: string };

function previewId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isExistingKanji(kanji: string, allWords: Word[]): boolean {
  const key = kanji.normalize("NFC");
  return allWords.some((w) => w.kanji.normalize("NFC") === key);
}

function UpdateCircle({
  selected,
  onClick,
  ariaLabel,
}: {
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      // className={`w-6 h-6 self-stretch rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
      //   selected
      //     ? "border-main-500 bg-main-500"
      //     : "border-app-border-strong hover:border-main-400"
      // }`}
    >
      {selected ? (
        <CircleCheck size={17} className="text-green-500" />
      ) : (
        <Circle size={17} className="text-green-500" />
      )}
    </button>
  );
}

interface ImportResult {
  total: number;
  added: number;
  updated: number;
  updatedWords: string[];
}

interface Props {
  onImport: (words: BulkWord[]) => Promise<ImportResult>;
  onClose: () => void;
  allWords: Word[];
}

function extractText(el: Element): string {
  el.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return elementSurfaceText(el).trim();
}

const JLPT_SET = new Set(["N1", "N2", "N3", "N4", "N5"]);

function parseTableHtml(html: string, allWords: Word[]): BulkWord[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("tr");
  const words: BulkWord[] = [];
  const knownKanji = new Set(allWords.map((w) => w.kanji.normalize("NFC")));

  rows.forEach((row) => {
    const wordEl = row.querySelector(".word");
    const pronEl = row.querySelector(".pronunciation");
    const meanEl = row.querySelector(".meaning");
    const descEl = row.querySelector(".description");
    const jlptEl = row.querySelector(".jlpt");
    const catEl = row.querySelector(".categories");
    const synEl = row.querySelector(".synonyms");
    if (!wordEl) return;
    const kanji = wordEl.textContent?.trim() ?? "";
    if (!kanji || kanji === "Word" || kanji === "Kelime") return;
    const rawJlpt = jlptEl?.textContent?.trim().toUpperCase() ?? "";
    const jlptLevel = JLPT_SET.has(rawJlpt) ? rawJlpt : undefined;

    let description = "";
    let srsExamples: SrsExample[] | undefined;
    if (descEl) {
      if (
        descEl.querySelector(".example") ||
        descEl.querySelector(".sentence--target")
      ) {
        const parsed = parseBulkDescriptionHtml(descEl);
        description = parsed.description;
        srsExamples = parsed.srsExamples;
      } else {
        description = extractText(descEl);
      }
    }

    const categoryNames = catEl
      ? parseCategoryBracketList(extractText(catEl))
      : undefined;
    const synonymKanji = synEl
      ? parseBracketList(extractText(synEl)).filter((k) => k !== kanji)
      : undefined;

    words.push({
      kanji,
      pronunciation: pronEl ? extractText(pronEl) : "",
      meaning: meanEl ? extractText(meanEl) : "",
      description,
      ...(srsExamples && srsExamples.length > 0 ? { srsExamples } : {}),
      ...(jlptLevel ? { jlptLevel } : {}),
      ...(categoryNames && categoryNames.length > 0 ? { categoryNames } : {}),
      ...(synonymKanji && synonymKanji.length > 0 ? { synonymKanji } : {}),
    });
    knownKanji.add(kanji.normalize("NFC"));
  });

  return words;
}

export function BulkImportModal({ onImport, onClose, allWords }: Props) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PreviewEntry[]>([]);
  const [resolveExisting, setResolveExisting] = useState(false);
  const [updateIds, setUpdateIds] = useState<Set<string>>(new Set());
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const highlightTimeout = useRef<number | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    setHtml(textarea.value);
    setPreview([]);
    setResolveExisting(false);
    setUpdateIds(new Set());
    setHighlightIds(new Set());
  };

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleParse() {
    const words = parseTableHtml(html, allWords);
    setPreview(words.map((w) => ({ ...w, id: previewId() })));
    setResult(null);
    setResolveExisting(false);
    setUpdateIds(new Set());
    setHighlightIds(new Set());
  }

  function resetPreview() {
    setPreview([]);
    setResolveExisting(false);
    setUpdateIds(new Set());
    setHighlightIds(new Set());
  }

  function removePreviewEntry(id: string) {
    setPreview((prev) => prev.filter((w) => w.id !== id));
    setUpdateIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setHighlightIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleUpdateSelection(id: string) {
    setUpdateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setHighlightIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function triggerHighlight(ids: string[]) {
    if (highlightTimeout.current) {
      clearTimeout(highlightTimeout.current);
    }

    // hemen göster
    setHighlightIds(new Set(ids));

    highlightTimeout.current = window.setTimeout(() => {
      setHighlightIds(new Set());
    }, 300);
  }

  async function handleAddWords() {
    if (preview.length === 0) return;

    const hasExisting = preview.some((w) => isExistingKanji(w.kanji, allWords));

    if (!resolveExisting && hasExisting) {
      setResolveExisting(true);
      setHighlightIds(new Set());
      return;
    }

    if (resolveExisting) {
      const unresolved = preview.filter(
        (w) => isExistingKanji(w.kanji, allWords) && !updateIds.has(w.id),
      );
      if (unresolved.length > 0) {
        triggerHighlight(unresolved.map((w) => w.id));
        return;
      }
    }

    await runImport(preview);
  }

  async function runImport(entries: PreviewEntry[]) {
    if (entries.length === 0) return;
    setLoading(true);
    setLinking(true);
    let linkingSkipped = false;
    try {
      const linkedPreview: BulkWord[] = [];
      for (const w of entries) {
        if (w.srsExamples?.length) {
          try {
            const srsExamples = await linkSrsExamples(w.srsExamples, allWords);
            linkedPreview.push({ ...w, srsExamples });
          } catch {
            linkingSkipped = true;
            linkedPreview.push(w);
          }
        } else {
          linkedPreview.push(w);
        }
      }
      setLinking(false);
      const res = await onImport(linkedPreview);
      setResult(res);
      setPreview([]);
      setResolveExisting(false);
      setUpdateIds(new Set());
      setHighlightIds(new Set());
      setHtml("");
      if (linkingSkipped) {
        alert(t("bulkImport.linkingSkipped"));
      }
    } catch {
      alert(t("bulkImport.importFailed"));
    } finally {
      setLoading(false);
      setLinking(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="modal-sheet">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-app-text text-lg font-bold">
            {t("bulkImport.title")}
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-app-muted text-app-text-muted rounded-full p-1.5"
          >
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-app-text-muted mb-3 text-xs leading-relaxed">
              {t("bulkImport.instructions")}
            </p>

            <textarea
              ref={textareaRef}
              value={html}
              onChange={handleHtmlChange}
              placeholder={t("bulkImport.placeholder")}
              rows={6}
              className="border-app-border-strong bg-app-muted max-h-[90vh]Z text-app-text-secondary focus:ring-main-300 mb-3 w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs transition-all focus:ring-2 focus:outline-none"
            />

            {preview.length === 0 ? (
              <button
                onClick={handleParse}
                disabled={!html.trim()}
                className="border-app-border-strong text-app-text-secondary hover:border-main-300 hover:text-main-500 dark:hover:text-main-600 w-full rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {html.trim() ? t("common.preview") : t("bulkImport.pasteTable")}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-main-50 dark:bg-main-950 border-main-100 text-app-text rounded-xl border px-4 py-3 text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-app-text font-semibold">
                      {t("bulkImport.wordsDetected", { count: preview.length })}
                    </p>
                  </div>
                  {/* {resolveExisting && (
                    <p className="text-xs text-app-text-muted mb-2 leading-relaxed">
                      {t("bulkImport.existingResolveHint")}
                    </p>
                  )} */}
                  <div className="max-h-36 space-y-1.5 overflow-y-auto">
                    {(() => {
                      const existingWords = preview.filter((w) =>
                        isExistingKanji(w.kanji, allWords),
                      );

                      const allUpdated =
                        existingWords.length > 0 &&
                        existingWords.every((w) => updateIds.has(w.id));

                      return preview.map((w) => {
                        const knownKanji = new Set([
                          ...allWords.map((word) =>
                            word.kanji.normalize("NFC"),
                          ),
                          ...preview.map((word) => word.kanji.normalize("NFC")),
                        ]);

                        const existing = isExistingKanji(w.kanji, allWords);
                        const shorten = resolveExisting;
                        const markedUpdate = updateIds.has(w.id);

                        const needsAction =
                          resolveExisting && existing && highlightIds.has(w.id);

                        const matchedCategories =
                          w.categoryNames && w.categoryNames.length > 0
                            ? matchCategoryNames(w.categoryNames, categories)
                            : [];

                        const matchedCategoryNames = matchedCategories
                          .map(
                            (id) =>
                              categories.find((c) => c.id === id)?.name ?? "",
                          )
                          .filter(Boolean);

                        return (
                          <div
                            key={w.id}
                            className="-mx-2 flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors"
                          >
                            <span className="text-app-text w-12 shrink-0 font-bold">
                              {w.kanji}
                            </span>

                            <span className="text-app-text-secondary min-w-0 flex-1 truncate">
                              {w.pronunciation}
                            </span>

                            {w.jlptLevel && (
                              <span
                                className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold"
                                style={{
                                  background: "#f3f4f6",
                                  color: "#6b7280",
                                }}
                              >
                                {w.jlptLevel}
                              </span>
                            )}

                            {w.srsExamples && w.srsExamples.length > 0 && (
                              <span className="bg-main-100 text-main-600 shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold">
                                {t("common.srsBadge", {
                                  count: w.srsExamples.length,
                                })}
                              </span>
                            )}

                            {matchedCategoryNames.length > 0 && (
                              <span
                                className={`shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ${
                                  shorten ? "max-w-10 truncate" : "max-w-24"
                                }`}
                                title={matchedCategoryNames.join(", ")}
                              >
                                {t("bulkImport.categoriesBadge", {
                                  count: matchedCategoryNames.length,
                                })}
                              </span>
                            )}

                            {w.synonymKanji && w.synonymKanji.length > 0 && (
                              <span
                                className={`shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ${
                                  shorten ? "max-w-12 truncate" : "max-w-24"
                                }`}
                                title={w.synonymKanji.join(", ")}
                              >
                                {t("bulkImport.synonymsBadge", {
                                  count: w.synonymKanji.filter((k) =>
                                    knownKanji.has(k.normalize("NFC")),
                                  ).length,
                                  total: w.synonymKanji.length,
                                })}
                              </span>
                            )}

                            <div
                              className={` ${allUpdated ? "hidden" : markedUpdate ? "invisible" : ""} flex gap-1.5 rounded-full outline-2 outline-offset-2 transition-[outline-color] duration-300 ${needsAction ? "outline-red-400" : "outline-transparent"} `}
                            >
                              {resolveExisting && existing && (
                                <UpdateCircle
                                  selected={markedUpdate}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleUpdateSelection(w.id);
                                  }}
                                  ariaLabel={t("bulkImport.updateWord")}
                                />
                              )}

                              {resolveExisting && existing && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removePreviewEntry(w.id);
                                  }}
                                  className="shrink-0 transition-colors"
                                  aria-label={t("bulkImport.excludeWord")}
                                >
                                  <X size={17} className="text-red-500" />
                                </button>
                              )}
                            </div>

                            <div
                              className={`${allUpdated ? "hidden" : markedUpdate ? "invisible" : ""} flex gap-1.5`}
                            >
                              {resolveExisting && !existing && (
                                <button
                                  type="button"
                                  disabled={true}
                                  className="shrink-0 transition-colors"
                                  aria-label={t("bulkImport.excludeWord")}
                                >
                                  <CircleX
                                    size={17}
                                    className="invisible text-red-500"
                                  />
                                </button>
                              )}

                              {resolveExisting && !existing && (
                                <button
                                  type="button"
                                  disabled={true}
                                  className="shrink-0 transition-colors"
                                  aria-label={t("bulkImport.excludeWord")}
                                >
                                  <CircleX
                                    size={17}
                                    className="invisible text-red-500"
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {/* {resolveExisting && highlightIds.size > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      {t("bulkImport.chooseActionRequired")}
                    </p>
                  )} */}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetPreview}
                    className="border-app-border-strong text-app-text-muted hover:border-app-border-strong flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleAddWords}
                    disabled={loading}
                    className="bg-main-500 hover:bg-main-600 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size={15} className="text-white" />{" "}
                        {linking
                          ? t("bulkImport.linking")
                          : t("bulkImport.adding")}
                      </>
                    ) : (
                      <>
                        <Upload size={15} />{" "}
                        {t("bulkImport.addWords", { count: preview.length })}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-app-muted border-app-border space-y-2 rounded-xl border px-4 py-4">
              <p className="text-app-text-secondary text-sm">
                {t("bulkImport.result.totalGiven", { count: result.total })}
              </p>
              <p className="text-app-text text-base font-bold">
                {t("bulkImport.result.added", { count: result.added })}
              </p>
              {result.updated > 0 && (
                <>
                  <p className="text-app-text-muted text-sm">
                    {t("bulkImport.result.updated", { count: result.updated })}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.updatedWords.map((w) => (
                      <span
                        key={w}
                        className="text-app-text-secondary bg-app-muted rounded-lg px-2 py-0.5 text-sm font-medium"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="bg-main-500 hover:bg-main-600 w-full rounded-xl py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
