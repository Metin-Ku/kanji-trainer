import { useEffect, useRef, useState, useCallback } from "react";
import { X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

function getKanjiChars(str: string): string[] {
  return [...str].filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0x20000 && cp <= 0x2a6df)
    );
  });
}

function charToHex(char: string): string {
  return (char.codePointAt(0) ?? 0).toString(16).padStart(5, "0");
}

function strokeColor(i: number, total: number): string {
  const t = total <= 1 ? 0 : i / (total - 1);
  const g = Math.round(160 - t * 80);
  return `rgb(255,${Math.max(g, 20)},${Math.round(30 - t * 25)})`;
}

interface Props {
  kanji: string;
  onClose: () => void;
  variant?: "modal" | "sheet";
}

export function KanjiStrokeModal({ kanji, onClose, variant = "modal" }: Props) {
  const chars = getKanjiChars(kanji);
  const [charIndex, setCharIndex] = useState(0);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const currentChar = chars[charIndex] ?? "";

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const runAnimation = useCallback(() => {
    if (!svgRef.current) return;
    clearTimers();

    const svgEl = svgRef.current.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");
      if (!svgEl.getAttribute("viewBox")) {
        svgEl.setAttribute("viewBox", "0 0 109 109");
      }
      svgEl.style.background = "transparent";
    }

    const strokeGroup = svgRef.current.querySelector('[id*="StrokePaths"]');
    const numGroup = svgRef.current.querySelector('[id*="StrokeNumbers"]') as SVGGElement | null;

    if (!strokeGroup) return;

    const paths = Array.from(
      strokeGroup.querySelectorAll("path")
    ) as SVGPathElement[];
    const total = paths.length;

    // Style & reset stroke numbers
    const textEls = numGroup
      ? (Array.from(numGroup.querySelectorAll("text")) as SVGTextElement[])
      : [];

    if (numGroup) {
      numGroup.style.display = "";
      // Orange numbers, slightly larger
      numGroup.setAttribute(
        "style",
        "font-size:9;font-family:helvetica;font-weight:bold;fill:rgb(255,120,20)"
      );
      textEls.forEach((t) => {
        t.style.transition = "none";
        t.style.opacity = "0";
      });
    }

    // Reset stroke paths
    paths.forEach((path, i) => {
      const len = path.getTotalLength();
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor(i, total));
      path.setAttribute("stroke-width", "4");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.style.transition = "none";
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
    });

    // Force reflow, then reveal (paths are now reset/hidden)
    svgRef.current.getBoundingClientRect();
    svgRef.current.style.opacity = "1";

    const DELAY = 320;
    const DURATION = 300;

    paths.forEach((path, i) => {
      // Animate stroke
      const ts = setTimeout(() => {
        path.style.transition = `stroke-dashoffset ${DURATION}ms ease`;
        path.style.strokeDashoffset = "0";
      }, i * DELAY);
      timersRef.current.push(ts);

      // Show number when stroke finishes drawing
      if (textEls[i]) {
        const tn = setTimeout(() => {
          textEls[i].style.transition = "opacity 0.15s ease";
          textEls[i].style.opacity = "1";
        }, i * DELAY + DURATION);
        timersRef.current.push(tn);
      }
    });
  }, []);

  // Fetch SVG when char changes
  useEffect(() => {
    if (!currentChar) return;
    setLoading(true);
    setError(false);
    setSvgContent(null);

    const hex = charToHex(currentChar);
    const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.text();
      })
      .then((text) => {
        // Strip <?xml?> declaration and <!DOCTYPE ...> block (incl. internal subset [...])
        // so the raw text content doesn't leak into the rendered HTML
        const cleaned = text
          .replace(/<\?xml[\s\S]*?\?>/i, "")
          .replace(/<!DOCTYPE[\s\S]*?(?:\[[\s\S]*?\])?\s*>/i, "")
          .trim();
        setSvgContent(cleaned);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return clearTimers;
  }, [currentChar]);

  // Run animation after SVG mounts in DOM
  useEffect(() => {
    if (!svgContent) return;
    // Hide immediately to prevent flash of un-animated paths
    if (svgRef.current) svgRef.current.style.opacity = "0";
    const t = setTimeout(runAnimation, 60);
    return () => clearTimeout(t);
  }, [svgContent, runAnimation]);

  useEffect(() => () => clearTimers(), []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  if (chars.length === 0) return null;

  return (
    <div
      ref={backdropRef}
      className={variant === "sheet" ? "fixed inset-0 z-50 flex items-end justify-center bg-black/30" : "modal-backdrop"}
      style={variant === "sheet" ? undefined : { alignItems: "center" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white shadow-2xl overflow-hidden"
        style={variant === "sheet" ? { width: "100%", maxWidth: 420, borderRadius: "16px 16px 0 0", maxHeight: "70vh", overflowY: "auto" } : { width: 296, borderRadius: 16 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            筆順 · Yazım Sırası
          </p>
          <div className="flex items-center gap-0.5">
            {svgContent && !loading && (
              <button
                onClick={runAnimation}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                title="Tekrar oynat"
              >
                <RefreshCw size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Multi-char picker */}
        {chars.length > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 pb-2">
            <button
              onClick={() => setCharIndex((i) => Math.max(0, i - 1))}
              disabled={charIndex === 0}
              className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {chars.map((c, i) => (
              <button
                key={i}
                onClick={() => setCharIndex(i)}
                className="w-11 h-11 rounded-xl text-xl font-bold flex items-center justify-center transition-all"
                style={
                  i === charIndex
                    ? {
                        background:
                          "linear-gradient(135deg, rgb(255,150,30), rgb(255,90,10))",
                        color: "white",
                      }
                    : { color: "#9ca3af" }
                }
              >
                {c}
              </button>
            ))}
            <button
              onClick={() =>
                setCharIndex((i) => Math.min(chars.length - 1, i + 1))
              }
              disabled={charIndex === chars.length - 1}
              className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Single char big display */}
        {chars.length === 1 && (
          <div className="text-center pb-1">
            <span className="text-5xl font-bold text-gray-800">
              {currentChar}
            </span>
          </div>
        )}

        {/* SVG area */}
        <div
          className="mx-4 mb-4 rounded-xl flex items-center justify-center"
          style={{ height: 248, background: "#f9f9f9" }}
        >
          {loading && (
            <p className="text-gray-300 text-sm">Yükleniyor…</p>
          )}
          {error && (
            <div className="text-center px-6">
              <p className="text-3xl text-gray-200 mb-2">{currentChar}</p>
              <p className="text-xs text-gray-300">SVG bulunamadı</p>
            </div>
          )}
          {svgContent && !loading && (
            <div
              ref={svgRef}
              style={{ width: 216, height: 216 }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
