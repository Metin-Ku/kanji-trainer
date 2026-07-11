import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { LoadingSpinner } from "./LoadingSpinner";
import { fetchKanjiSvg, getKanjiChars } from "../lib/kanjiVg";
import {
  clientToViewBox,
  type Point,
  validateStroke,
} from "../lib/kanjiStrokePractice";

interface Props {
  kanji: string;
  onClose: () => void;
  onSuccess: () => void;
  variant?: "modal" | "sheet";
}

type Feedback = "none" | "correct" | "wrong";

const CANVAS_SIZE = 216;
const VIEW_SIZE = 109;

function getMainStrokeColor(): string {
  const styles = getComputedStyle(document.documentElement);
  const main600 = styles.getPropertyValue("--main-600").trim();
  return main600 || "#2563eb";
}

export function KanjiPracticeModal({
  kanji,
  onClose,
  onSuccess,
  variant = "sheet",
}: Props) {
  const { t } = useTranslation();
  const chars = getKanjiChars(kanji);
  const [charIndex, setCharIndex] = useState(0);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [completedCount, setCompletedCount] = useState(0);

  const svgRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const completedStrokesRef = useRef<Point[][]>([]);
  const refPathsRef = useRef<SVGPathElement[]>([]);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChar = chars[charIndex] ?? "";
  const totalStrokes = refPathsRef.current.length;

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = CANVAS_SIZE / VIEW_SIZE;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const strokeColor = getMainStrokeColor();

    const drawPolyline = (pts: Point[], color: string, width: number, alpha = 1) => {
      if (pts.length < 2) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
      }
      ctx.stroke();
      ctx.restore();
    };

    completedStrokesRef.current.forEach((pts) => {
      drawPolyline(pts, strokeColor, 4);
    });

    const cur = currentStrokeRef.current;
    if (cur.length >= 2) {
      drawPolyline(cur, strokeColor, 4, 0.85);
    }
  }, []);

  const setupGhostSvg = useCallback((activeStrokeIdx?: number) => {
    const idx = activeStrokeIdx ?? strokeIndex;
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");
      if (!svgEl.getAttribute("viewBox")) {
        svgEl.setAttribute("viewBox", `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`);
      }
      svgEl.style.background = "transparent";
    }

    const strokeGroup = svgRef.current.querySelector('[id*="StrokePaths"]');
    const numGroup = svgRef.current.querySelector('[id*="StrokeNumbers"]');
    if (numGroup) numGroup.remove();

    if (!strokeGroup) {
      refPathsRef.current = [];
      return;
    }

    const paths = Array.from(
      strokeGroup.querySelectorAll("path"),
    ) as SVGPathElement[];
    refPathsRef.current = paths;

    paths.forEach((path, i) => {
      const done = i < idx;
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", done ? getMainStrokeColor() : "#d1d5db");
      path.setAttribute("stroke-width", done ? "4" : "3");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
      path.style.opacity = done ? "1" : "0.55";
    });
  }, [strokeIndex]);

  const resetCharPractice = useCallback(() => {
    setStrokeIndex(0);
    currentStrokeRef.current = [];
    completedStrokesRef.current = [];
    setCompletedCount(0);
    setFeedback("none");
    drawCanvas();
    setupGhostSvg(0);
  }, [drawCanvas, setupGhostSvg]);

  const advanceAfterCorrect = useCallback(() => {
    const paths = refPathsRef.current;
    const nextStroke = strokeIndex + 1;

    if (nextStroke >= paths.length) {
      const nextChar = charIndex + 1;
      if (nextChar >= chars.length) {
        onSuccess();
        return;
      }
      setCharIndex(nextChar);
      setStrokeIndex(0);
      currentStrokeRef.current = [];
      completedStrokesRef.current = [];
      setCompletedCount(0);
    } else {
      setStrokeIndex(nextStroke);
      setCompletedCount(nextStroke);
    }
    setFeedback("none");
    drawCanvas();
  }, [charIndex, chars.length, drawCanvas, onSuccess, strokeIndex]);

  const handleStrokeEnd = useCallback(() => {
    const pts = currentStrokeRef.current;
    if (pts.length < 2) {
      currentStrokeRef.current = [];
      drawCanvas();
      return;
    }

    const refPath = refPathsRef.current[strokeIndex];
    if (!refPath) return;

    if (validateStroke(pts, refPath)) {
      completedStrokesRef.current.push([...pts]);
      currentStrokeRef.current = [];
      setFeedback("correct");
      drawCanvas();
      clearFeedbackTimer();
      feedbackTimerRef.current = setTimeout(advanceAfterCorrect, 280);
    } else {
      currentStrokeRef.current = [];
      setFeedback("wrong");
      drawCanvas();
      clearFeedbackTimer();
      feedbackTimerRef.current = setTimeout(() => setFeedback("none"), 450);
    }
  }, [advanceAfterCorrect, drawCanvas, strokeIndex]);

  const addPoint = useCallback(
    (clientX: number, clientY: number) => {
      const area = areaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const pt = clientToViewBox(clientX, clientY, rect);
      const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      if (last && dist(last, pt) < 1.2) return;
      currentStrokeRef.current.push(pt);
      drawCanvas();
    },
    [drawCanvas],
  );

  function dist(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (loading || error || feedback === "correct") return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = [];
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    currentStrokeRef.current.push(clientToViewBox(e.clientX, e.clientY, rect));
    drawCanvas();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    addPoint(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    drawingRef.current = false;
    handleStrokeEnd();
  };

  useEffect(() => {
    if (!currentChar) return;
    setLoading(true);
    setError(false);
    setSvgContent(null);
    setStrokeIndex(0);
    currentStrokeRef.current = [];
    completedStrokesRef.current = [];
    setCompletedCount(0);
    setFeedback("none");

    fetchKanjiSvg(currentChar)
      .then(setSvgContent)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentChar]);

  useEffect(() => {
    if (!svgContent) return;
    const t = setTimeout(setupGhostSvg, 40);
    return () => clearTimeout(t);
  }, [svgContent, setupGhostSvg, strokeIndex]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, strokeIndex, completedCount]);

  useEffect(() => () => clearFeedbackTimer(), []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  if (chars.length === 0) return null;

  const progressLabel =
    totalStrokes > 0
      ? t("kanjiPractice.strokeProgress", {
          current: Math.min(strokeIndex + 1, totalStrokes),
          total: totalStrokes,
        })
      : "";

  const areaBorder =
    feedback === "correct"
      ? "2px solid var(--main-500)"
      : feedback === "wrong"
        ? "2px solid #ef4444"
        : "2px solid transparent";

  return (
    <div
      ref={backdropRef}
      className={
        variant === "sheet"
          ? "fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          : "modal-backdrop"
      }
      style={variant === "sheet" ? undefined : { alignItems: "center" }}
      onClick={handleBackdropClick}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className="bg-app-surface shadow-2xl overflow-hidden"
        style={
          variant === "sheet"
            ? {
                width: "100%",
                maxWidth: 420,
                borderRadius: "16px 16px 0 0",
                maxHeight: "70vh",
                overflowY: "auto",
              }
            : { width: 296, borderRadius: 16 }
        }
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-widest">
            {t("kanjiPractice.title")}
          </p>
          <div className="flex items-center gap-0.5">
            {svgContent && !loading && (
              <button
                onClick={resetCharPractice}
                className="p-1.5 rounded-lg hover:bg-app-muted text-app-text-muted transition-colors"
                title={t("kanjiPractice.reset")}
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-app-muted text-app-text-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-app-text-muted px-4 pb-2">
          {t("kanjiPractice.hint")}
        </p>

        {chars.length > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 pb-2">
            <button
              onClick={() => {
                setCharIndex((i) => Math.max(0, i - 1));
                setStrokeIndex(0);
                currentStrokeRef.current = [];
                completedStrokesRef.current = [];
                setCompletedCount(0);
              }}
              disabled={charIndex === 0}
              className="p-1 text-app-text-muted hover:text-app-text-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {chars.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setCharIndex(i);
                  setStrokeIndex(0);
                  currentStrokeRef.current = [];
                  completedStrokesRef.current = [];
                  setCompletedCount(0);
                }}
                className="w-11 h-11 rounded-xl text-xl font-bold flex items-center justify-center transition-all"
                style={
                  i === charIndex
                    ? {
                        background:
                          "linear-gradient(135deg, var(--main-400), var(--main-600))",
                        color: "white",
                      }
                    : { color: "#9ca3af" }
                }
              >
                {c}
              </button>
            ))}
            <button
              onClick={() => {
                setCharIndex((i) => Math.min(chars.length - 1, i + 1));
                setStrokeIndex(0);
                currentStrokeRef.current = [];
                completedStrokesRef.current = [];
                setCompletedCount(0);
              }}
              disabled={charIndex === chars.length - 1}
              className="p-1 text-app-text-muted hover:text-app-text-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {chars.length === 1 && (
          <div className="text-center pb-1">
            <span className="text-5xl font-bold text-app-text">{currentChar}</span>
          </div>
        )}

        {progressLabel && (
          <p className="text-center text-[11px] font-medium text-app-text-muted pb-2 tabular-nums">
            {progressLabel}
          </p>
        )}

        <div
          ref={areaRef}
          className="mx-4 mb-4 rounded-xl flex items-center justify-center relative"
          style={{
            height: 248,
            background: "#f9f9f9",
            border: areaBorder,
            transition: "border-color 0.15s ease",
          }}
        >
          {loading && <LoadingSpinner size={32} className="text-app-text-muted" />}
          {error && (
            <div className="text-center px-6">
              <p className="text-3xl text-app-border-strong mb-2">{currentChar}</p>
              <p className="text-xs text-app-text-muted">{t("kanjiStroke.svgNotFound")}</p>
            </div>
          )}
          {svgContent && !loading && (
            <>
              <div
                ref={svgRef}
                style={{
                  width: CANVAS_SIZE,
                  height: CANVAS_SIZE,
                  position: "absolute",
                  pointerEvents: "none",
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute touch-none"
                style={{
                  width: CANVAS_SIZE,
                  height: CANVAS_SIZE,
                  cursor: "crosshair",
                  touchAction: "none",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </>
          )}
        </div>

        {feedback === "wrong" && (
          <p className="text-center text-xs font-medium text-red-500 pb-4 -mt-2">
            {t("kanjiPractice.tryAgain")}
          </p>
        )}
        {feedback === "correct" && (
          <p className="text-center text-xs font-medium pb-4 -mt-2" style={{ color: "var(--main-600)" }}>
            {t("kanjiPractice.correct")}
          </p>
        )}
      </div>
    </div>
  );
}
