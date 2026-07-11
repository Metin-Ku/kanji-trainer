import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  buildCombinedStrokeSvg,
  fetchKanjiSvg,
  getKanjiChars,
  KANJI_CHAR_VIEW,
} from "../lib/kanjiVg";
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

interface RefStroke {
  path: SVGPathElement;
  offsetX: number;
}

const CANVAS_HEIGHT = 216;
const CANVAS_MAX_WIDTH = 360;

function getMainStrokeColor(): string {
  const styles = getComputedStyle(document.documentElement);
  const main600 = styles.getPropertyValue("--main-600").trim();
  return main600 || "#2563eb";
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function KanjiPracticeModal({
  kanji,
  onClose,
  onSuccess,
  variant = "sheet",
}: Props) {
  const { t } = useTranslation();
  const chars = getKanjiChars(kanji);
  const viewWidth = KANJI_CHAR_VIEW * chars.length;
  const viewHeight = KANJI_CHAR_VIEW;

  const canvasWidth = Math.min(
    CANVAS_MAX_WIDTH,
    Math.round(CANVAS_HEIGHT * (viewWidth / viewHeight)),
  );

  const [strokeIndex, setStrokeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [ready, setReady] = useState(false);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [combinedSvg, setCombinedSvg] = useState<string | null>(null);

  const svgRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const completedStrokesRef = useRef<Point[][]>([]);
  const refStrokesRef = useRef<RefStroke[]>([]);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drawScale = useMemo(
    () => ({
      x: canvasWidth / viewWidth,
      y: CANVAS_HEIGHT / viewHeight,
    }),
    [canvasWidth, viewWidth, viewHeight],
  );

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

    ctx.clearRect(0, 0, canvasWidth, CANVAS_HEIGHT);
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
      ctx.moveTo(pts[0].x * drawScale.x, pts[0].y * drawScale.y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * drawScale.x, pts[i].y * drawScale.y);
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
  }, [canvasWidth, drawScale.x, drawScale.y]);

  const collectRefStrokes = useCallback(() => {
    if (!svgRef.current) return;
    const groups = svgRef.current.querySelectorAll("g");
    const strokes: RefStroke[] = [];
    groups.forEach((g, charIdx) => {
      const paths = Array.from(g.querySelectorAll("path")) as SVGPathElement[];
      paths.forEach((path) => {
        strokes.push({ path, offsetX: charIdx * KANJI_CHAR_VIEW });
      });
    });
    refStrokesRef.current = strokes;
    setTotalStrokes(strokes.length);
    setReady(strokes.length > 0);
  }, []);

  const resetPractice = useCallback(() => {
    setStrokeIndex(0);
    currentStrokeRef.current = [];
    completedStrokesRef.current = [];
    setFeedback("none");
    drawCanvas();
  }, [drawCanvas]);

  const advanceAfterCorrect = useCallback(() => {
    const nextStroke = strokeIndex + 1;
    if (nextStroke >= refStrokesRef.current.length) {
      onSuccess();
      return;
    }
    setStrokeIndex(nextStroke);
    setFeedback("none");
    drawCanvas();
  }, [drawCanvas, onSuccess, strokeIndex]);

  const handleStrokeEnd = useCallback(() => {
    const pts = currentStrokeRef.current;
    if (pts.length < 2) {
      currentStrokeRef.current = [];
      drawCanvas();
      return;
    }

    const ref = refStrokesRef.current[strokeIndex];
    if (!ref) return;

    if (validateStroke(pts, ref.path, undefined, ref.offsetX)) {
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
      const pt = clientToViewBox(clientX, clientY, rect, viewWidth, viewHeight);
      const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      if (last && dist(last, pt) < 1.2) return;
      currentStrokeRef.current.push(pt);
      drawCanvas();
    },
    [drawCanvas, viewWidth, viewHeight],
  );

  const stopModalTouch = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if ("cancelable" in e && e.cancelable) e.preventDefault();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (loading || error || !ready || feedback === "correct") return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = [];
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    currentStrokeRef.current.push(
      clientToViewBox(e.clientX, e.clientY, rect, viewWidth, viewHeight),
    );
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
    if (chars.length === 0) return;
    setLoading(true);
    setError(false);
    setReady(false);
    setStrokeIndex(0);
    currentStrokeRef.current = [];
    completedStrokesRef.current = [];
    setFeedback("none");
    refStrokesRef.current = [];
    setCombinedSvg(null);
    setTotalStrokes(0);

    Promise.all(chars.map((c) => fetchKanjiSvg(c)))
      .then((svgs) => setCombinedSvg(buildCombinedStrokeSvg(svgs)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [kanji]);

  useEffect(() => {
    if (!combinedSvg) return;
    const t = setTimeout(collectRefStrokes, 0);
    return () => clearTimeout(t);
  }, [combinedSvg, collectRefStrokes]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, strokeIndex, ready]);

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
      onTouchStart={stopModalTouch}
      onTouchMove={stopModalTouch}
      onTouchEnd={stopModalTouch}
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
        onTouchStart={stopModalTouch}
        onTouchMove={stopModalTouch}
        onTouchEnd={stopModalTouch}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-widest">
            {t("kanjiPractice.title")}
          </p>
          <div className="flex items-center gap-0.5">
            {ready && !loading && (
              <button
                onClick={resetPractice}
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
              <p className="text-xs text-app-text-muted">{t("kanjiStroke.svgNotFound")}</p>
            </div>
          )}
          {!loading && !error && (
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={CANVAS_HEIGHT}
              className="touch-none"
              style={{
                width: canvasWidth,
                height: CANVAS_HEIGHT,
                cursor: ready ? "crosshair" : "default",
                touchAction: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
        </div>

        {/* Hidden reference SVG for stroke validation only */}
        <div
          ref={svgRef}
          aria-hidden
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
            visibility: "hidden",
            pointerEvents: "none",
          }}
          dangerouslySetInnerHTML={combinedSvg ? { __html: combinedSvg } : undefined}
        />

        {feedback === "wrong" && (
          <p className="text-center text-xs font-medium text-red-500 pb-4 -mt-2">
            {t("kanjiPractice.tryAgain")}
          </p>
        )}
        {feedback === "correct" && strokeIndex < totalStrokes - 1 && (
          <p
            className="text-center text-xs font-medium pb-4 -mt-2"
            style={{ color: "var(--main-600)" }}
          >
            {t("kanjiPractice.correct")}
          </p>
        )}
      </div>
    </div>
  );
}
