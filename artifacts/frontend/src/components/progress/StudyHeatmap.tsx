import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { Lens } from "@/components/ui/lens";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  getHeatmapCells,
  getYearHeatmapCells,
  getYearToDateHeatmapCells,
  HEATMAP_LEVEL_CLASSES,
  type HeatmapCell,
} from "../../lib/progressStats";
import { HeatmapYearSelect } from "./HeatmapYearSelect";

export type HeatmapRange =
  | { kind: "weeks"; weeks: number }
  | { kind: "year"; year: number }
  | { kind: "ytd" };

type StudyHeatmapProps = {
  isMainPage: boolean;
  activityByDate: Record<string, Partial<Record<string, number>>>;
  years: number[];
  heatmapYear: number;
  currentYear: number;
  setHeatmapYear: (year: number) => void;
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
type ViewportPoint = { x: number; y: number };

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

const LENS_SIZE = { full: 120, compact: 96 } as const;
const LENS_ZOOM = { full: 1.4, compact: 1.6 } as const;
/** Viewport px: loupe center sits this far above the finger. */
const TOUCH_LOUPE_LIFT = { full: 92, compact: 80 } as const;
const LOUPE_HOLD_MS = 220;
const SCROLL_INTENT_PX = 10;

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

  const extend = step * 1.1;
  const gridWidth = colCount * step - gapPx;
  const gridHeight = rowCount * step - gapPx;

  const x = Math.max(
    -extend,
    Math.min(gridWidth + extend, clientX - innerRect.left),
  );
  const y = Math.max(
    -extend,
    Math.min(gridHeight + extend, clientY - innerRect.top),
  );

  const focus: FocusPos = {
    col: Math.max(0, Math.min(maxCol, x / step)),
    row: Math.max(0, Math.min(maxRow, y / step)),
  };

  const nearCol = Math.round(focus.col);
  const nearRow = Math.round(focus.row);
  const date = columns[nearCol]?.[nearRow]?.date ?? null;

  return { date, focus };
}

function focusToRingCell(focus: FocusPos | null): GridPos | null {
  if (!focus) return null;
  return { col: Math.round(focus.col), row: Math.round(focus.row) };
}

function HeatmapGrid({
  columns,
  cellPx,
  gapPx,
  dockFocus,
  ringCell,
  magnify,
  t,
  dateLocale,
}: {
  columns: HeatmapCell[][];
  cellPx: number;
  gapPx: number;
  dockFocus: FocusPos | null;
  ringCell: GridPos | null;
  magnify: MagnifyConfig;
  t: (key: string, params?: Record<string, string | number>) => string;
  dateLocale: string;
}) {
  return (
    <div className="flex w-max" style={{ gap: gapPx }}>
      {columns.map((col, wi) => (
        <div key={wi} className="flex flex-col" style={{ gap: gapPx }}>
          {col.map((cell, rowIdx) => {
            const pos = { col: wi, row: rowIdx };
            const scale = scaleForCell(pos, dockFocus ?? undefined, magnify);
            const isRing =
              ringCell != null &&
              ringCell.col === wi &&
              ringCell.row === rowIdx;

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
                className={`rounded-sm shrink-0 ${
                  cell.isFuture
                    ? "bg-app-muted-alternative"
                    : HEATMAP_LEVEL_CLASSES[cell.level]
                } transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                  isRing
                    ? "ring-2 ring-main-500 ring-offset-1 ring-offset-app-bg z-[300]"
                    : ""
                }`}
                style={{
                  width: cellPx,
                  height: cellPx,
                  transform: `scale(${scale})`,
                  zIndex: isRing
                    ? 300
                    : dockFocus
                      ? Math.round(scale * 100)
                      : 1,
                  position: "relative",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function cellCenterPx(
  col: number,
  row: number,
  cellPx: number,
  gapPx: number,
): { x: number; y: number } {
  const step = cellPx + gapPx;
  return {
    x: col * step + cellPx / 2,
    y: row * step + cellPx / 2,
  };
}

function TouchLoupe({
  point,
  gridRect,
  ringCell,
  cellPx,
  gapPx,
  lensSize,
  lensZoom,
  lift,
  gridProps,
}: {
  point: ViewportPoint;
  gridRect: DOMRect;
  ringCell: GridPos | null;
  cellPx: number;
  gapPx: number;
  lensSize: number;
  lensZoom: number;
  lift: number;
  gridProps: ComponentProps<typeof HeatmapGrid>;
}) {
  const loupeLeft = point.x - lensSize / 2;
  const loupeTop = point.y - lift - lensSize / 2;
  const offsetLeft = gridRect.left - loupeLeft;
  const offsetTop = gridRect.top - loupeTop;

  const focal = ringCell
    ? cellCenterPx(ringCell.col, ringCell.row, cellPx, gapPx)
    : {
        x: point.x - gridRect.left,
        y: point.y - gridRect.top,
      };

  const focalInLoupeX = offsetLeft + focal.x;
  const focalInLoupeY = offsetTop + focal.y;
  const dx = lensSize / 2 - focalInLoupeX;
  const dy = lensSize / 2 - focalInLoupeY;

  const loupeStyle: CSSProperties = {
    left: loupeLeft,
    top: loupeTop,
    width: lensSize,
    height: lensSize,
  };

  const contentStyle: CSSProperties = {
    left: offsetLeft,
    top: offsetTop,
    transformOrigin: `${focal.x}px ${focal.y}px`,
    transform: `translate(${dx}px, ${dy}px) scale(${lensZoom})`,
  };

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none rounded-full overflow-hidden border-2 border-app-border-strong bg-app-surface shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      style={loupeStyle}
      aria-hidden
    >
      <div className="absolute inset-0 bg-app-surface" />
      <div className="absolute" style={contentStyle}>
        <HeatmapGrid {...gridProps} dockFocus={null} />
      </div>
    </div>,
    document.body,
  );
}

export function StudyHeatmap({
  isMainPage,
  activityByDate,
  years,
  heatmapYear,
  currentYear,
  setHeatmapYear,
  weeks = 26,
  range,
  compact = false,
  className = "",
  onTap,
}: StudyHeatmapProps) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";

  const gridRef = useRef<HTMLDivElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const activeDateRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const gridRectRef = useRef<DOMRect | null>(null);
  const touchModeRef = useRef<"pending" | "scroll" | "loupe">("pending");
  const loupeHoldTimerRef = useRef<number | null>(null);
  const lastTouchRef = useRef<ViewportPoint | null>(null);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [focusPos, setFocusPos] = useState<FocusPos | null>(null);
  const [touchScrubbing, setTouchScrubbing] = useState(false);
  const [touchPoint, setTouchPoint] = useState<ViewportPoint | null>(null);
  const [touchGridRect, setTouchGridRect] = useState<DOMRect | null>(null);
  const [mouseLensPos, setMouseLensPos] = useState({ x: 0, y: 0 });

  const resolvedRange: HeatmapRange = range ?? { kind: "weeks", weeks };

  const cells = useMemo(() => {
    if (resolvedRange.kind === "year") {
      return getYearHeatmapCells(activityByDate, resolvedRange.year);
    }
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

  const cellPx = compact ? 9 : 12;
  const gapPx = compact ? 2 : 4;
  const magnify = compact ? MAGNIFY.compact : MAGNIFY.full;
  const hitPad = Math.round((cellPx + gapPx) * 1.1);
  const lensSize = compact ? LENS_SIZE.compact : LENS_SIZE.full;
  const lensZoom = compact ? LENS_ZOOM.compact : LENS_ZOOM.full;
  const touchLoupeLift = compact
    ? TOUCH_LOUPE_LIFT.compact
    : TOUCH_LOUPE_LIFT.full;

  const syncTouchLoupe = useCallback((clientX: number, clientY: number) => {
    const wrap = gridWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    gridRectRef.current = rect;
    setTouchGridRect(rect);
    setTouchPoint({ x: clientX, y: clientY });
  }, []);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const inner = gridWrapRef.current;
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

  const clearLoupeHoldTimer = useCallback(() => {
    if (loupeHoldTimerRef.current != null) {
      window.clearTimeout(loupeHoldTimerRef.current);
      loupeHoldTimerRef.current = null;
    }
  }, []);

  const activateTouchLoupe = useCallback(
    (pointerId: number) => {
      const point = lastTouchRef.current ?? pointerStartRef.current;
      if (!point) return;

      touchModeRef.current = "loupe";
      setTouchScrubbing(true);
      syncTouchLoupe(point.x, point.y);
      applyPointer(point.x, point.y);
      gridRef.current?.setPointerCapture(pointerId);
    },
    [applyPointer, syncTouchLoupe],
  );

  const clearFocus = useCallback(() => {
    clearLoupeHoldTimer();
    touchModeRef.current = "pending";
    lastTouchRef.current = null;
    activeDateRef.current = null;
    setActiveDate(null);
    setFocusPos(null);
    setTouchScrubbing(false);
    setTouchPoint(null);
    setTouchGridRect(null);
    gridRectRef.current = null;
  }, [clearLoupeHoldTimer]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") {
        isDraggingRef.current = true;
        dragMovedRef.current = false;
        touchModeRef.current = "pending";
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
        lastTouchRef.current = { x: e.clientX, y: e.clientY };
        clearLoupeHoldTimer();
        loupeHoldTimerRef.current = window.setTimeout(() => {
          if (touchModeRef.current !== "pending") return;
          activateTouchLoupe(e.pointerId);
        }, LOUPE_HOLD_MS);
        return;
      }

      e.preventDefault();
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      gridRef.current?.setPointerCapture(e.pointerId);
      applyPointer(e.clientX, e.clientY);
    },
    [activateTouchLoupe, applyPointer, clearLoupeHoldTimer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") {
        lastTouchRef.current = { x: e.clientX, y: e.clientY };
        const start = pointerStartRef.current;
        if (!start) return;

        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) dragMovedRef.current = true;

        if (touchModeRef.current === "pending") {
          if (
            Math.abs(dx) > SCROLL_INTENT_PX &&
            Math.abs(dx) > Math.abs(dy) * 1.2
          ) {
            touchModeRef.current = "scroll";
            clearLoupeHoldTimer();
          }
          return;
        }

        if (touchModeRef.current === "scroll") return;

        if (touchModeRef.current === "loupe") {
          e.preventDefault();
          syncTouchLoupe(e.clientX, e.clientY);
          applyPointer(e.clientX, e.clientY);
        }
        return;
      }

      const start = pointerStartRef.current;
      if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) dragMovedRef.current = true;
      }

      if (isDraggingRef.current || e.buttons > 0) {
        if (lensRef.current) {
          const rect = lensRef.current.getBoundingClientRect();
          setMouseLensPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
        applyPointer(e.clientX, e.clientY);
      } else if (e.pointerType === "mouse") {
        if (lensRef.current) {
          const rect = lensRef.current.getBoundingClientRect();
          setMouseLensPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
        applyPointer(e.clientX, e.clientY);
      }
    },
    [applyPointer, clearLoupeHoldTimer, syncTouchLoupe],
  );

  const endInteraction = useCallback(
    (e: React.PointerEvent, fireTap: boolean) => {
      clearLoupeHoldTimer();
      isDraggingRef.current = false;
      pointerStartRef.current = null;

      if (gridRef.current?.hasPointerCapture(e.pointerId)) {
        gridRef.current.releasePointerCapture(e.pointerId);
      }

      const touchMode = touchModeRef.current;
      if (
        fireTap &&
        !dragMovedRef.current &&
        onTap &&
        (touchMode === "pending" || touchMode === "loupe")
      ) {
        onTap();
      }

      clearFocus();
    },
    [clearFocus, clearLoupeHoldTimer, onTap],
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
  const ringCell = useMemo(() => focusToRingCell(focusPos), [focusPos]);

  const gridProps = {
    columns,
    cellPx,
    gapPx,
    magnify,
    ringCell,
    t,
    dateLocale,
  };

  const grid = (
    <div ref={gridWrapRef} className="inline-block w-max">
      <HeatmapGrid
        {...gridProps}
        dockFocus={touchScrubbing ? null : focusPos}
      />
    </div>
  );

  return (
    <div className={`min-w-0 w-full max-w-full ${className}`.trim()}>
      <div
        className={`min-h-[1.25rem] text-app-text-secondary tabular-nums flex items-center justify-between ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <span>
          {" "}
          {activeCell
            ? t("progress.heatmap.tooltip", {
                date: formatTooltipDate(activeCell.date, dateLocale),
                count: activeCell.count,
              })
            : t("progress.heatmap.hint")}
        </span>
        {!isMainPage && (
          <HeatmapYearSelect
            years={years}
            value={heatmapYear}
            currentYear={currentYear}
            onChange={setHeatmapYear}
          />
        )}
      </div>
      <HorizontalScroll
        ref={gridRef}
        scrollDeps={[cells.length, compact, columns.length]}
        className="select-none"
        //style={{ padding: hitPad }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      >
        {touchScrubbing ? (
          grid
        ) : (
          <Lens
            ref={lensRef}
            position={mouseLensPos}
            zoomOrigin={mouseLensPos}
            zoomFactor={lensZoom}
            lensSize={lensSize}
            lensColor="black"
            hideBaseUnderLens
            duration={0.1}
            ariaLabel={t("progress.heatmap.hint")}
            className="inline-block w-max overflow-visible rounded-none shadow-none"
          >
            {grid}
          </Lens>
        )}
      </HorizontalScroll>

      {touchScrubbing && touchPoint && touchGridRect && (
        <TouchLoupe
          point={touchPoint}
          gridRect={touchGridRect}
          ringCell={ringCell}
          cellPx={cellPx}
          gapPx={gapPx}
          lensSize={lensSize}
          lensZoom={lensZoom}
          lift={touchLoupeLift}
          gridProps={{ ...gridProps, dockFocus: null, ringCell }}
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
