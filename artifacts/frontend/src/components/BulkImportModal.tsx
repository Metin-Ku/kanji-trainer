import { useRef, useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";

interface BulkWord {
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  jlptLevel?: string;
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
}


function extractText(el: Element): string {
  el.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return el.textContent?.trim() ?? "";
}

const JLPT_SET = new Set(["N1", "N2", "N3", "N4", "N5"]);

function parseTableHtml(html: string): BulkWord[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("tr");
  const words: BulkWord[] = [];

  rows.forEach((row) => {
    const wordEl = row.querySelector(".word");
    const pronEl = row.querySelector(".pronunciation");
    const meanEl = row.querySelector(".meaning");
    const descEl = row.querySelector(".description");
    const jlptEl = row.querySelector(".jlpt");
    if (!wordEl) return;
    const kanji = wordEl.textContent?.trim() ?? "";
    if (!kanji || kanji === "Word" || kanji === "Kelime") return;
    const rawJlpt = jlptEl?.textContent?.trim().toUpperCase() ?? "";
    const jlptLevel = JLPT_SET.has(rawJlpt) ? rawJlpt : undefined;
    words.push({
      kanji,
      pronunciation: pronEl ? extractText(pronEl) : "",
      meaning: meanEl ? extractText(meanEl) : "",
      description: descEl ? extractText(descEl) : "",
      ...(jlptLevel ? { jlptLevel } : {}),
    });
  });

  return words;
}

export function BulkImportModal({ onImport, onClose }: Props) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<BulkWord[]>([]);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleParse() {
    const words = parseTableHtml(html);
    setPreview(words);
    setResult(null);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await onImport(preview);
      setResult(res);
      setPreview([]);
      setHtml("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-sheet">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Toplu Kelime Ekle</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              HTML tabloyu yapıştırın.{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.word</code>,{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.pronunciation</code>,{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.meaning</code>,{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.description</code> ve{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.jlpt</code>{" "}
              class'larına göre ayrıştırılır.
            </p>

            <textarea
              value={html}
              onChange={(e) => { setHtml(e.target.value); setPreview([]); }}
              placeholder="<table>...</table>"
              rows={6}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-600 font-mono focus:outline-none focus:ring-2 focus:ring-main-300 transition-all mb-3"
            />

            {preview.length === 0 ? (
              <button
                onClick={handleParse}
                disabled={!html.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-500 hover:border-main-300 hover:text-main-500 transition-colors disabled:opacity-40"
              >
                {html.trim() ? "Önizle" : "Tablo yapıştırın"}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-main-50 border border-main-100 rounded-xl px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-800">{preview.length} kelime algılandı</p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {preview.map((w, i) => (
                      <div key={i} className="flex gap-2 text-xs items-center">
                        <span className="font-bold text-gray-700 w-16 shrink-0">{w.kanji}</span>
                        <span className="text-gray-500 truncate flex-1">{w.pronunciation}</span>
                        {w.jlptLevel && (
                          <span className="text-[10px] font-semibold px-1 py-0.5 rounded shrink-0" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                            {w.jlptLevel}
                          </span>
                        )}
                        {w.description && (
                          <span className="text-gray-300 shrink-0">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPreview([])}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-400 hover:border-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, rgb(255,150,30), rgb(255,90,10))" }}
                  >
                    {loading ? (
                      <><Loader2 size={15} className="animate-spin" /> Ekleniyor...</>
                    ) : (
                      <><Upload size={15} /> {preview.length} Kelime Ekle</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 space-y-2">
              <p className="text-sm text-gray-500">{result.total} kelime verildi</p>
              <p className="text-base font-bold text-gray-800">
                ✓ {result.added} yeni kelime eklendi
              </p>
              {result.updated > 0 && (
                <>
                  <p className="text-sm text-gray-400">
                    {result.updated} kelime zaten mevcut, alanlar güncellendi:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.updatedWords.map((w) => (
                      <span key={w} className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                        {w}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-white text-sm active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, rgb(255,150,30), rgb(255,90,10))" }}
            >
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
