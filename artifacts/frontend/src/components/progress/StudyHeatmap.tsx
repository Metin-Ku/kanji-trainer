import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  sigma: number;
};

const MAGNIFY: Record<"full" | "compact", MagnifyConfig> = {
  full: { maxScale: 1.55, minScale: 0.38, sigma: 1.9 },
  compact: { maxScale: 1.42, minScale: 0.34, sigma: 1.7 },
};

/** Apple Dock–style Gaussian falloff: peak at focus, min at distance. */
function dockScaleAtDistance(d: number, cfg: MagnifyConfig): number {
  const t = Math.exp(-(d * d) / (2 * cfg.sigma * cfg.sigma));
  return cfg.minScale + (cfg.maxScale - cfg.minScale) * t;
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

function focusFromPointer(
  clientX: number,
  clientY: number,
  gapPx: number,
): { date: string | null; focus: FocusPos | null } {
  const el = document.elementFromPoint(clientX, clientY);
  const cell = (el as HTMLElement | null)?.closest(
    "[data-heatmap-date]",
  ) as HTMLElement | null;
  if (!cell) return { date: null, focus: null };

  const date = cell.getAttribute("data-heatmap-date");
  const col = Number(cell.dataset.col);
  const row = Number(cell.dataset.row);
  if (Number.isNaN(col) || Number.isNaN(row)) {
    return { date, focus: null };
  }

  const rect = cell.getBoundingClientRect();
  const step = rect.width + gapPx;
  const focus: FocusPos = {
    col: col + (clientX - (rect.left + rect.width / 2)) / step,
    row: row + (clientY - (rect.top + rect.height / 2)) / step,
  };
  return { date, focus };
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
  const activeDateRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [focusPos, setFocusPos] = useState<FocusPos | null>(null);

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

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const { date, focus } = focusFromPointer(clientX, clientY, gapPx);
      if (focus) setFocusPos(focus);
      if (date) {
        activeDateRef.current = date;
        setActiveDate(date);
      }
    },
    [gapPx],
  );

  const clearFocus = useCallback(() => {
    activeDateRef.current = null;
    setActiveDate(null);
    setFocusPos(null);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      gridRef.current?.setPointerCapture(e.pointerId);
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
        applyPointer(e.clientX, e.clientY);
      } else if (e.pointerType === "mouse") {
        applyPointer(e.clientX, e.clientY);
      }
    },
    [applyPointer],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = false;
      pointerStartRef.current = null;
      if (gridRef.current?.hasPointerCapture(e.pointerId)) {
        gridRef.current.releasePointerCapture(e.pointerId);
      }
      if (!dragMovedRef.current && onTap) onTap();
    },
    [onTap],
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    pointerStartRef.current = null;
    if (gridRef.current?.hasPointerCapture(e.pointerId)) {
      gridRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && !isDraggingRef.current) {
        clearFocus();
      }
    },
    [clearFocus],
  );

  const activeCell = activeDate ? cellByDate.get(activeDate) : null;

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [cells.length, compact]);

  return (
    <div className={className}>
      <div
        className={`min-h-[1.25rem] mb-2 text-gray-600 tabular-nums ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {activeCell
          ? t("progress.heatmap.tooltip", {
              date: formatTooltipDate(activeCell.date, dateLocale),
              count: activeCell.count,
            })
          : t("progress.heatmap.hint")}
      </div>

      <div
        ref={gridRef}
        // className={`rounded-xl border border-gray-200 bg-gray-50/80 overflow-x-auto touch-none select-none ${
        //   compact ? "p-2" : "p-3"
        // }`}
        className={`overflow-x-auto touch-none select-none`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      >
        <div
          className="flex"
          style={{ gap: gapPx }}
        >
          {columns.map((col, wi) => (
            <div
              key={wi}
              className="flex flex-col"
              style={{ gap: gapPx }}
            >
              {col.map((cell, rowIdx) => {
                const pos = { col: wi, row: rowIdx };
                const scale = scaleForCell(pos, focusPos ?? undefined, magnify);
                const isActive = activeDate === cell.date;
                const prominence =
                  focusPos && magnify.maxScale > magnify.minScale
                    ? (scale - magnify.minScale) /
                      (magnify.maxScale - magnify.minScale)
                    : 1;
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
                    className={`rounded-sm shrink-0 ${HEATMAP_LEVEL_CLASSES[cell.level]} transition-[transform,opacity,box-shadow] duration-200 ease-out ${
                      isActive && focusPos
                        ? "ring-2 ring-main-400/70 shadow-sm shadow-main-200/60"
                        : ""
                    }`}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      transform: `scale(${scale})`,
                      zIndex: Math.round(scale * 100),
                      position: "relative",
                      opacity: focusPos ? 0.5 + prominence * 0.5 : 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
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
