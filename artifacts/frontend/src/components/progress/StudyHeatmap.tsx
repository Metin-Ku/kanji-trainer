import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  getHeatmapCells,
  getYearToDateHeatmapCells,
  HEATMAP_LEVEL_CLASSES,
  type HeatmapCell,
} from "../../lib/progressStats";

export type HeatmapRange =
  | { kind: "weeks"; weeks: number }
  | { kind: "ytd" };

type StudyHeatmapProps = {
  activityByDate: Record<string, Partial<Record<string, number>>>;
  /** @deprecated Prefer `range`. */
  weeks?: number;
  range?: HeatmapRange;
  compact?: boolean;
  className?: string;
  /** Called on tap without drag (e.g. navigate on mini strip). */
  onTap?: () => void;
};

function formatTooltipDate(dateKey: string, dateLocale: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function chunkIntoWeeks(cells: HeatmapCell[]): HeatmapCell[][] {
  const cols: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    cols.push(cells.slice(i, i + 7));
  }
  return cols;
}

type GridPos = { col: number; row: number };
type FocusPos = { col: number; row: number };

type MagnifyConfig = {
  maxScale: number;
  minScale: number;
  radius: number;
  power: number;
};

const MAGNIFY: Record<"full" | "compact", MagnifyConfig> = {
  full: { maxScale: 1.55, minScale: 0.76, radius: 2.9, power: 2.1 },
  compact: { maxScale: 1.42, minScale: 0.74, radius: 2.6, power: 2.1 },
};

/** Smooth polynomial falloff — center peaks, neighbors step down gently, far stays readable. */
function dockScaleAtDistance(d: number, cfg: MagnifyConfig): number {
  const t = Math.max(0, 1 - d / cfg.radius);
  const falloff = Math.pow(t, cfg.power);
  return cfg.minScale + (cfg.maxScale - cfg.minScale) * falloff;
}

function scaleForCell(
  pos: GridPos,
  focus: FocusPos | undefined,
  cfg: MagnifyConfig,
): number {
  if (!focus) return 1;
  const d = Math.hypot(pos.col - focus.col, pos.row - focus.row);
  return dockScaleAtDistance(d, cfg);
}

function pointerToFocus(
  clientX: number,
  clientY: number,
  innerEl: HTMLElement,
  columns: HeatmapCell[][],
  cellPx: number,
  gapPx: number,
): { date: string | null; focus: FocusPos | null } {
  if (columns.length === 0) return { date: null, focus: null };

  const innerRect = innerEl.getBoundingClientRect();
  const step = cellPx + gapPx;
  const colCount = columns.length;
  const rowCount = columns[0]?.length ?? 7;
  const maxCol = colCount - 1;
  const maxRow = rowCount - 1;

  // Extended hit zone beyond visible dots (edge columns remain reachable)
  const extend = step * 1.1;
  const gridWidth = colCount * step - gapPx;
  const gridHeight = rowCount * step - gapPx;

  const x = Math.max(-extend, Math.min(gridWidth + extend, clientX - innerRect.left));
  const y = Math.max(-extend, Math.min(gridHeight + extend, clientY - innerRect.top));

  const focus: FocusPos = {
    col: Math.max(0, Math.min(maxCol, x / step)),
    row: Math.max(0, Math.min(maxRow, y / step)),
  };

  const nearCol = Math.round(focus.col);
  const nearRow = Math.round(focus.row);
  const date = columns[nearCol]?.[nearRow]?.date ?? null;

  return { date, focus };
}

const LOUPE_SPAN = 2;
const LOUPE_DOT_PX = 14;
const LOUPE_GAP_PX = 3;
const LOUPE_LIFT_PX = 88;

type LoupeCell = {
  col: number;
  row: number;
  cell: HeatmapCell | null;
  isCenter: boolean;
};

function buildLoupeGrid(
  columns: HeatmapCell[][],
  focus: FocusPos,
): LoupeCell[][] {
  const centerCol = Math.round(focus.col);
  const centerRow = Math.round(focus.row);
  const rows: LoupeCell[][] = [];

  for (let r = centerRow - LOUPE_SPAN; r <= centerRow + LOUPE_SPAN; r++) {
    const rowCells: LoupeCell[] = [];
    for (let c = centerCol - LOUPE_SPAN; c <= centerCol + LOUPE_SPAN; c++) {
      rowCells.push({
        col: c,
        row: r,
        cell: columns[c]?.[r] ?? null,
        isCenter: c === centerCol && r === centerRow,
      });
    }
    rows.push(rowCells);
  }
  return rows;
}

function HeatmapLoupe({
  x,
  y,
  focus,
  columns,
  label,
}: {
  x: number;
  y: number;
  focus: FocusPos;
  columns: HeatmapCell[][];
  label: string;
}) {
  const grid = useMemo(
    () => buildLoupeGrid(columns, focus),
    [columns, focus],
  );

  return createPortal(
    <div
      className="heatmap-loupe fixed"
      style={{
        left: x,
        top: y - LOUPE_LIFT_PX,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="heatmap-loupe-glass">
        <div
          className="grid"
          style={{
            gap: LOUPE_GAP_PX,
            gridTemplateColumns: `repeat(${LOUPE_SPAN * 2 + 1}, ${LOUPE_DOT_PX}px)`,
          }}
        >
          {grid.flat().map(({ col, row, cell, isCenter }) => (
            <div
              key={`${col}-${row}`}
              className={`rounded-sm shrink-0 ${
                cell ? HEATMAP_LEVEL_CLASSES[cell.level] : "bg-app-muted"
              } ${isCenter ? "ring-2 ring-main-500 ring-offset-2 ring-offset-app-surface" : ""}`}
              style={{
                width: LOUPE_DOT_PX,
                height: LOUPE_DOT_PX,
                transform: isCenter ? "scale(1.2)" : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div className="heatmap-loupe-stem" />
      <p className="heatmap-loupe-label">{label}</p>
    </div>,
    document.body,
  );
}

export function StudyHeatmap({
  activityByDate,
  weeks = 26,
  range,
  compact = false,
  className = "",
  onTap,
}: StudyHeatmapProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";

  const gridRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const activeDateRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [focusPos, setFocusPos] = useState<FocusPos | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchScrubbing, setTouchScrubbing] = useState(false);

  const resolvedRange: HeatmapRange = range ?? { kind: "weeks", weeks };

  const cells = useMemo(() => {
    if (resolvedRange.kind === "ytd") {
      return getYearToDateHeatmapCells(activityByDate);
    }
    return getHeatmapCells(activityByDate, resolvedRange.weeks);
  }, [activityByDate, resolvedRange]);

  const columns = useMemo(() => chunkIntoWeeks(cells), [cells]);
  const cellByDate = useMemo(
    () => new Map(cells.map((c) => [c.date, c])),
    [cells],
  );

  const cellPx = compact ? 10 : 12;
  const gapPx = compact ? 2 : 4;
  const magnify = compact ? MAGNIFY.compact : MAGNIFY.full;
  const hitPad = Math.round((cellPx + gapPx) * 1.1);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const inner = innerRef.current;
      if (!inner) return;
      const { date, focus } = pointerToFocus(
        clientX,
        clientY,
        inner,
        columns,
        cellPx,
        gapPx,
      );
      if (focus) setFocusPos(focus);
      if (date) {
        activeDateRef.current = date;
        setActiveDate(date);
      }
    },
    [columns, cellPx, gapPx],
  );

  const clearFocus = useCallback(() => {
    activeDateRef.current = null;
    setActiveDate(null);
    setFocusPos(null);
    setLoupePos(null);
    setTouchScrubbing(false);
  }, []);

  const trackLoupe = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      if (pointerType === "touch" && isDraggingRef.current) {
        setLoupePos({ x: clientX, y: clientY });
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      gridRef.current?.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch") {
        setTouchScrubbing(true);
        setLoupePos({ x: e.clientX, y: e.clientY });
      }
      applyPointer(e.clientX, e.clientY);
    },
    [applyPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStartRef.current;
      if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) dragMovedRef.current = true;
      }

      if (isDraggingRef.current || e.buttons > 0) {
        trackLoupe(e.clientX, e.clientY, e.pointerType);
        applyPointer(e.clientX, e.clientY);
      } else if (e.pointerType === "mouse") {
        applyPointer(e.clientX, e.clientY);
      }
    },
    [applyPointer, trackLoupe],
  );

  const endInteraction = useCallback(
    (e: React.PointerEvent, fireTap: boolean) => {
      isDraggingRef.current = false;
      pointerStartRef.current = null;
      if (gridRef.current?.hasPointerCapture(e.pointerId)) {
        gridRef.current.releasePointerCapture(e.pointerId);
      }
      if (fireTap && !dragMovedRef.current && onTap) onTap();
      clearFocus();
    },
    [clearFocus, onTap],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => endInteraction(e, true),
    [endInteraction],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => endInteraction(e, false),
    [endInteraction],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && !isDraggingRef.current) {
        clearFocus();
      }
    },
    [clearFocus],
  );

  const activeCell = activeDate ? cellByDate.get(activeDate) : null;
  const loupeLabel = activeCell
    ? t("progress.heatmap.tooltip", {
        date: formatTooltipDate(activeCell.date, dateLocale),
        count: activeCell.count,
      })
    : "";

  const showLoupe =
    touchScrubbing && loupePos !== null && focusPos !== null && activeCell;

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [cells.length, compact]);

  return (
    <div className={className}>
      <div
        className={`min-h-[1.25rem] mb-2 text-app-text-secondary tabular-nums ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {showLoupe
          ? "\u00a0"
          : activeCell
            ? t("progress.heatmap.tooltip", {
                date: formatTooltipDate(activeCell.date, dateLocale),
                count: activeCell.count,
              })
            : t("progress.heatmap.hint")}
      </div>

      <div
        ref={gridRef}
        className="overflow-x-auto touch-none select-none"
        style={{ padding: hitPad }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      >
        <div ref={innerRef} className="flex w-max" style={{ gap: gapPx }}>
          {columns.map((col, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: gapPx }}>
              {col.map((cell, rowIdx) => {
                const pos = { col: wi, row: rowIdx };
                const scale = scaleForCell(pos, focusPos ?? undefined, magnify);
                // const isActive = activeDate === cell.date;

                return (
                  <div
                    key={cell.date}
                    data-heatmap-date={cell.date}
                    data-col={wi}
                    data-row={rowIdx}
                    role="img"
                    aria-label={t("progress.heatmap.tooltip", {
                      date: formatTooltipDate(cell.date, dateLocale),
                      count: cell.count,
                    })}
                    className={`rounded-sm shrink-0 ${HEATMAP_LEVEL_CLASSES[cell.level]} transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]`}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      transform: `scale(${scale})`,
                      zIndex: Math.round(scale * 100),
                      position: "relative",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showLoupe && loupePos && focusPos && (
        <HeatmapLoupe
          x={loupePos.x}
          y={loupePos.y}
          focus={focusPos}
          columns={columns}
          label={loupeLabel}
        />
      )}

      {!compact && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-app-text-muted">
          <span>{t("progress.heatmap.less")}</span>
          {HEATMAP_LEVEL_CLASSES.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>{t("progress.heatmap.more")}</span>
        </div>
      )}
    </div>
  );
}
