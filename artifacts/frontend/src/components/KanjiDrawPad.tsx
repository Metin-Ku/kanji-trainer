import { useCallback, useEffect, useRef, useState } from "react";
import {
  matches,
  type KanjiStroke,
} from "../lib/kanjidraw-master/src/kanji";

const WIDTH = 400;
const HEIGHT = 400;
const LINE_WIDTH = 8;
const MATCH_THRESHOLD = 80;
const TOP_N = 3;

export type KanjiDrawPadProps = {
  /** Expected kanji character for the current slot. */
  expected: string;
  /** Called when expected is among top matches ≥80%. */
  onMatch: () => void;
  /** Slot already completed — keep canvas locked. */
  alreadyMatched?: boolean;
  /** Reset key — clear canvas when this changes. */
  resetKey?: string | number;
  clearLabel?: string;
  undoLabel?: string;
  gridLabel?: string;
  fuzzyLabel?: string;
  offby1Label?: string;
  className?: string;
};

function getPoint(
  el: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): KanjiStroke {
  const rect = el.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
  };
}

export function KanjiDrawPad({
  expected,
  onMatch,
  alreadyMatched = false,
  resetKey,
  clearLabel = "Clear",
  undoLabel = "Undo",
  gridLabel = "Grid",
  fuzzyLabel = "Fuzzy",
  offby1Label = "±1 stroke",
  className = "",
}: KanjiDrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<KanjiStroke[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<KanjiStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [matched, setMatched] = useState(alreadyMatched);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [fuzzy, setFuzzy] = useState(false);
  const [offby1, setOffby1] = useState(false);
  const drawingRef = useRef(false);
  const currentRef = useRef<KanjiStroke[]>([]);
  const matchedRef = useRef(alreadyMatched);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    setStrokes([]);
    setCurrentStroke([]);
    setIsDrawing(false);
    setMatched(alreadyMatched);
    setBestScore(null);
    matchedRef.current = alreadyMatched;
    drawingRef.current = false;
    currentRef.current = [];
  }, [resetKey, expected, alreadyMatched]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains("dark");
    const canvasBg = isDark
      ? styles.getPropertyValue("--color-app-muted").trim() || "#1a1a1a"
      : "#ffffff";
    const fg = isDark ? "#f5f5f5" : "#111111";
    const grid = isDark ? "#555555" : "#cccccc";

    ctx.fillStyle = canvasBg || (isDark ? "#222" : "#fff");
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (showGrid) {
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      [WIDTH / 3, (2 * WIDTH) / 3].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      });
      [HEIGHT / 3, (2 * HEIGHT) / 3].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      });
    }

    ctx.strokeStyle = matched ? "#22c55e" : fg;
    ctx.lineCap = "round";
    ctx.lineWidth = LINE_WIDTH;

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0]!.x, stroke[0]!.y);
      for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0]!.x, currentStroke[0]!.y);
      for (const p of currentStroke.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, [strokes, currentStroke, matched, showGrid]);

  const evaluate = useCallback(
    (allStrokes: KanjiStroke[][]) => {
      if (matchedRef.current || allStrokes.length === 0) return;
      const results = matches(allStrokes, { fuzzy, offby1 });
      const top = results
        .filter(([score]) => score >= MATCH_THRESHOLD)
        .slice(0, TOP_N);
      const best = top[0]?.[0] ?? results[0]?.[0] ?? null;
      setBestScore(best != null ? Math.round(best) : null);
      if (top.some(([, kanji]) => kanji === expected)) {
        matchedRef.current = true;
        setMatched(true);
        onMatchRef.current();
      }
    },
    [expected, fuzzy, offby1],
  );

  useEffect(() => {
    if (strokes.length > 0) {
      evaluate(strokes);
    }
  }, [fuzzy, offby1, strokes, evaluate]);

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsDrawing(false);
    const stroke = currentRef.current;
    currentRef.current = [];
    setCurrentStroke([]);
    if (stroke.length < 2) return;
    setStrokes((prev) => {
      const next = [...prev, stroke];
      queueMicrotask(() => evaluate(next));
      return next;
    });
  }, [evaluate]);

  const startAt = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || matchedRef.current) return;
    const point = getPoint(canvas, clientX, clientY);
    drawingRef.current = true;
    currentRef.current = [point];
    setCurrentStroke([point]);
    setIsDrawing(true);
  }, []);

  const moveAt = useCallback((clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPoint(canvas, clientX, clientY);
    currentRef.current = [...currentRef.current, point];
    setCurrentStroke(currentRef.current);
  }, []);

  function clear() {
    if (matchedRef.current) return;
    setStrokes([]);
    setCurrentStroke([]);
    setBestScore(null);
    currentRef.current = [];
  }

  function undo() {
    if (matchedRef.current) return;
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      queueMicrotask(() => evaluate(next));
      return next;
    });
    setBestScore(null);
  }

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={clear}
          disabled={matched || (strokes.length === 0 && !isDrawing)}
          className="bg-app-muted text-app-text-secondary rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
        >
          {clearLabel}
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={matched || strokes.length === 0}
          className="bg-app-muted text-app-text-secondary rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
        >
          {undoLabel}
        </button>
        <label className="text-app-text-secondary flex cursor-pointer items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={() => setShowGrid((v) => !v)}
            className="accent-main-500"
          />
          {gridLabel}
        </label>
        <label className="text-app-text-secondary flex cursor-pointer items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={fuzzy}
            onChange={() => setFuzzy((v) => !v)}
            className="accent-main-500"
          />
          {fuzzyLabel}
        </label>
        <label className="text-app-text-secondary flex cursor-pointer items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={offby1}
            onChange={() => setOffby1((v) => !v)}
            className="accent-main-500"
          />
          {offby1Label}
        </label>
        <span className="text-app-text-muted ml-auto text-xs tabular-nums">
          {matched ? "✓" : bestScore != null ? `${bestScore}%` : ""}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="border-app-border bg-app-surface touch-none h-full w-full max-w-full rounded-xl border"
          style={{ aspectRatio: "1 / 1", maxHeight: "100%" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => moveAt(e.clientX, e.clientY)}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
    </div>
  );
}
