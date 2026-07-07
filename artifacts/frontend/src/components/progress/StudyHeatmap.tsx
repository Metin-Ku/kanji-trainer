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

function dateAtPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const cell = (el as HTMLElement).closest("[data-heatmap-date]");
  return cell?.getAttribute("data-heatmap-date") ?? null;
}

type GridPos = { col: number; row: number };

/** Radial scale: active cell peaks, neighbors dip smoothly, far cells return to 1. */
function scaleAtDistance(d: number, peak: number): number {
  if (d < 0.01) return peak;
  const boost = (peak - 1) * Math.exp(-d * d * 1.25);
  const dip = 0.28 * Math.exp(-((d - 0.85) ** 2) / 0.35);
  return Math.max(0.72, Math.min(peak, 1 + boost - dip));
}

function scaleForCell(
  pos: GridPos,
  active: GridPos | undefined,
  peak: number,
): number {
  if (!active) return 1;
  const d = Math.hypot(pos.col - active.col, pos.row - active.row);
  return scaleAtDistance(d, peak);
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
  const posByDate = useMemo(() => {
    const map = new Map<string, GridPos>();
    columns.forEach((col, colIdx) => {
      col.forEach((cell, rowIdx) => {
        map.set(cell.date, { col: colIdx, row: rowIdx });
      });
    });
    return map;
  }, [columns]);
  const activePos = activeDate ? posByDate.get(activeDate) : undefined;

  const selectDate = useCallback((dateKey: string | null) => {
    activeDateRef.current = dateKey;
    setActiveDate(dateKey);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      gridRef.current?.setPointerCapture(e.pointerId);
      const date = dateAtPoint(e.clientX, e.clientY);
      if (date) selectDate(date);
    },
    [selectDate],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStartRef.current;
      if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) dragMovedRef.current = true;
      }

      const date = dateAtPoint(e.clientX, e.clientY);
      if (!date) return;

      if (isDraggingRef.current || e.buttons > 0) {
        if (date !== activeDateRef.current) selectDate(date);
      } else if (e.pointerType === "mouse") {
        selectDate(date);
      }
    },
    [selectDate],
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
        selectDate(null);
      }
    },
    [selectDate],
  );

  const activeCell = activeDate ? cellByDate.get(activeDate) : null;

  const cellPx = compact ? 10 : 12;
  const gapPx = compact ? 2 : 4;
  const activeScale = compact ? 1.55 : 1.65;

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
                const scale = scaleForCell(pos, activePos, activeScale);
                const isActive = activeDate === cell.date;
                return (
                  <div
                    key={cell.date}
                    data-heatmap-date={cell.date}
                    role="img"
                    aria-label={t("progress.heatmap.tooltip", {
                      date: formatTooltipDate(cell.date, dateLocale),
                      count: cell.count,
                    })}
                    className={`rounded-sm shrink-0 ${HEATMAP_LEVEL_CLASSES[cell.level]} transition-transform duration-200 ease-out`}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      transform: `scale(${scale})`,
                      zIndex: Math.round(scale * 10),
                      position: "relative",
                      opacity: activePos && !isActive && scale < 0.92 ? 0.88 : 1,
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
