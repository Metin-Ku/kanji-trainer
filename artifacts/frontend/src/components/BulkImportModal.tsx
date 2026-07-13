import { useRef, useState } from "react";
import { X, Upload } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";
import type { SrsExample, Word } from "../types";
import {
  parseBulkDescriptionHtml,
  elementSurfaceText,
} from "../lib/srsExamples";
import { linkSrsExamples } from "../lib/wordLinking";
import { parseBracketList } from "../lib/categoryMatch";
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
  const knownKanji = new Set(
    allWords.map((w) => w.kanji.normalize("NFC")),
  );

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
      ? parseBracketList(extractText(catEl))
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
  const [preview, setPreview] = useState<BulkWord[]>([]);
  const backdropRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    setHtml(textarea.value);
    setPreview([]);
  };

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleParse() {
    const words = parseTableHtml(html, allWords);
    setPreview(words);
    setResult(null);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setLoading(true);
    setLinking(true);
    let linkingSkipped = false;
    try {
      const linkedPreview: BulkWord[] = [];
      for (const w of preview) {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-app-text">
            {t("bulkImport.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-app-muted text-app-text-muted"
          >
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-xs text-app-text-muted mb-3 leading-relaxed">
              {t("bulkImport.instructions")}
            </p>

            <textarea
               ref={textareaRef}
               value={html}
               onChange={handleHtmlChange}
               placeholder={t("bulkImport.placeholder")}
               rows={6}
              className="w-full rounded-xl border border-app-border-strong bg-app-muted px-3.5 py-2.5 max-h-[90vh]Z text-xs text-app-text-secondary font-mono focus:outline-none focus:ring-2 focus:ring-main-300 transition-all mb-3"
            />

            {preview.length === 0 ? (
              <button
                onClick={handleParse}
                disabled={!html.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm border-2 border-app-border-strong text-app-text-secondary hover:border-main-300 hover:text-main-500 dark:hover:text-main-600 transition-colors disabled:opacity-40"
              >
                {html.trim() ? t("common.preview") : t("bulkImport.pasteTable")}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-main-50 dark:bg-main-950 border border-main-100 rounded-xl px-4 py-3 text-sm text-app-text">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-app-text">
                      {t("bulkImport.wordsDetected", { count: preview.length })}
                    </p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {preview.map((w, i) => {
                      const knownKanji = new Set([
                        ...allWords.map((word) => word.kanji.normalize("NFC")),
                        ...preview.map((word) => word.kanji.normalize("NFC")),
                      ]);
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
                      <div key={i} className="flex gap-2 text-xs items-center flex-wrap">
                        <span className="font-bold text-app-text w-16 shrink-0">
                          {w.kanji}
                        </span>
                        <span className="text-app-text-secondary truncate flex-1 min-w-0">
                          {w.pronunciation}
                        </span>
                        {w.jlptLevel && (
                          <span
                            className="text-[10px] font-semibold px-1 py-0.5 rounded shrink-0"
                            style={{ background: "#f3f4f6", color: "#6b7280" }}
                          >
                            {w.jlptLevel}
                          </span>
                        )}
                        {w.description && (
                          <span
                            className="text-app-text-muted shrink-0"
                            title={t("bulkImport.descriptionTitle")}
                          >
                            ✓
                          </span>
                        )}
                        {w.srsExamples && w.srsExamples.length > 0 && (
                          <span className="text-[10px] font-semibold px-1 py-0.5 rounded shrink-0 bg-main-100 text-main-600">
                            {t("common.srsBadge", {
                              count: w.srsExamples.length,
                            })}
                          </span>
                        )}
                        {matchedCategoryNames.length > 0 && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-amber-100 text-amber-700"
                            title={matchedCategoryNames.join(", ")}
                          >
                            {t("bulkImport.categoriesBadge", {
                              count: matchedCategoryNames.length,
                            })}
                          </span>
                        )}
                        {w.synonymKanji && w.synonymKanji.length > 0 && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-violet-100 text-violet-700"
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
                      </div>
                    );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreview([])}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 border-app-border-strong text-app-text-muted hover:border-app-border-strong transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-bold bg-main-500 hover:bg-main-600 text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
            <div className="bg-app-muted border border-app-border rounded-xl px-4 py-4 space-y-2">
              <p className="text-sm text-app-text-secondary">
                {t("bulkImport.result.totalGiven", { count: result.total })}
              </p>
              <p className="text-base font-bold text-app-text">
                {t("bulkImport.result.added", { count: result.added })}
              </p>
              {result.updated > 0 && (
                <>
                  <p className="text-sm text-app-text-muted">
                    {t("bulkImport.result.updated", { count: result.updated })}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.updatedWords.map((w) => (
                      <span
                        key={w}
                        className="text-sm font-medium text-app-text-secondary bg-app-muted px-2 py-0.5 rounded-lg"
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
              className="w-full py-3 rounded-xl font-bold bg-main-500 hover:bg-main-600 text-white text-sm active:scale-[0.98]"
            >
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
