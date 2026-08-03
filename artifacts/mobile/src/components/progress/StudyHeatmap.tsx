import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type View as RNView,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useTranslation } from "@/i18n/I18nProvider";
import { localDateKey } from "@/lib/dailyGoal";
import {
  getHeatmapCells,
  getHeatmapFutureColor,
  getHeatmapLevelColors,
  getYearHeatmapCells,
  getYearToDateHeatmapCells,
  type HeatmapCell,
} from "@/lib/progressStats";
import { useTheme } from "@/theme/ThemeProvider";
import { HeatmapYearSelect } from "./HeatmapYearSelect";

export type HeatmapRange =
  | { kind: "weeks"; weeks: number }
  | { kind: "year"; year: number }
  | { kind: "ytd" };

type Props = {
  isMainPage: boolean;
  activityByDate: Record<string, Partial<Record<string, number>>>;
  isActivityLoading?: boolean;
  years: number[];
  heatmapYear: number;
  currentYear: number;
  setHeatmapYear: (year: number) => void;
  weeks?: number;
  range?: HeatmapRange;
  compact?: boolean;
  onTap?: () => void;
};

type GridPos = { col: number; row: number };
type FocusPos = { col: number; row: number };
type ViewportPoint = { x: number; y: number };
type GridRect = { left: number; top: number; width: number; height: number };

const LENS_SIZE = { full: 120, compact: 96 } as const;
const LENS_ZOOM = { full: 1.4, compact: 1.6 } as const;
const TOUCH_LOUPE_LIFT = { full: 92, compact: 80 } as const;
const LOUPE_HOLD_MS = 220;

const RING_WIDTH = 2;
const RING_OFFSET = 1;

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

function findTodayOrLastActiveCell(columns: HeatmapCell[][]): GridPos {
  const todayKey = localDateKey(new Date());
  for (let col = 0; col < columns.length; col++) {
    for (let row = 0; row < (columns[col]?.length ?? 0); row++) {
      if (columns[col]?.[row]?.date === todayKey) {
        return { col, row };
      }
    }
  }
  let last: GridPos = { col: 0, row: 0 };
  for (let col = 0; col < columns.length; col++) {
    for (let row = 0; row < (columns[col]?.length ?? 0); row++) {
      if (!columns[col]?.[row]?.isFuture) last = { col, row };
    }
  }
  return last;
}

function scrollLeftForToday(
  scrollWidth: number,
  clientWidth: number,
  columns: HeatmapCell[][],
  cellPx: number,
  gapPx: number,
): number {
  const { col } = findTodayOrLastActiveCell(columns);
  const step = cellPx + gapPx;
  const cellCenterX = col * step + cellPx / 2;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  return Math.max(0, Math.min(cellCenterX - clientWidth / 2, maxScroll));
}

function pointerToFocus(
  clientX: number,
  clientY: number,
  gridRect: GridRect,
  columns: HeatmapCell[][],
  cellPx: number,
  gapPx: number,
): { date: string | null; focus: FocusPos | null } {
  if (columns.length === 0) return { date: null, focus: null };

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
    Math.min(gridWidth + extend, clientX - gridRect.left),
  );
  const y = Math.max(
    -extend,
    Math.min(gridHeight + extend, clientY - gridRect.top),
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

type GridProps = {
  columns: HeatmapCell[][];
  cellPx: number;
  gapPx: number;
  ringCell: GridPos | null;
  levelColors: string[];
  futureColor: string;
  ringColor: string;
  ringOffsetColor: string;
  ringOffset?: number;
  ringWidth?: number;
};

function HeatmapCell({
  cellPx,
  bg,
  isRing,
  ringColor,
  ringOffsetColor,
  ringOffset = RING_OFFSET,
  ringWidth = RING_WIDTH,
}: {
  cellPx: number;
  bg: string;
  isRing: boolean;
  ringColor: string;
  ringOffsetColor: string;
  ringOffset?: number;
  ringWidth?: number;
}) {
  return (
    <View
      style={[
        stylesStatic.cellWrap,
        { width: cellPx, height: cellPx },
        isRing && stylesStatic.cellWrapRing,
      ]}
    >
      <View
        style={[
          {
            width: cellPx,
            height: cellPx,
            borderRadius: 2,
            backgroundColor: bg,
          },
          isRing && {
            boxShadow: [
              {
                offsetX: 0,
                offsetY: 0,
                blurRadius: 0,
                spreadDistance: ringOffset,
                color: ringOffsetColor,
              },
              {
                offsetX: 0,
                offsetY: 0,
                blurRadius: 0,
                spreadDistance: ringOffset + ringWidth,
                color: ringColor,
              },
            ],
          },
        ]}
      />
    </View>
  );
}

function HeatmapGrid({
  columns,
  cellPx,
  gapPx,
  ringCell,
  levelColors,
  futureColor,
  ringColor,
  ringOffsetColor,
  ringOffset = RING_OFFSET,
  ringWidth = RING_WIDTH,
}: GridProps) {
  return (
    <View style={[stylesStatic.grid, { gap: gapPx }]}>
      {columns.map((col, wi) => (
        <View
          key={wi}
          style={[
            stylesStatic.col,
            { gap: gapPx },
            ringCell?.col === wi && stylesStatic.colRing,
          ]}
        >
          {col.map((cell, rowIdx) => {
            const isRing =
              ringCell != null &&
              ringCell.col === wi &&
              ringCell.row === rowIdx;
            const bg = cell.isFuture
              ? futureColor
              : levelColors[cell.level] ?? levelColors[0]!;
            return (
              <HeatmapCell
                key={cell.date}
                cellPx={cellPx}
                bg={bg}
                isRing={isRing}
                ringColor={ringColor}
                ringOffsetColor={ringOffsetColor}
                ringOffset={ringOffset}
                ringWidth={ringWidth}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Loupe: re-render grid at zoomed pixel size (no RN scale transform). */
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
  theme,
}: {
  point: ViewportPoint;
  gridRect: GridRect;
  ringCell: GridPos | null;
  cellPx: number;
  gapPx: number;
  lensSize: number;
  lensZoom: number;
  lift: number;
  gridProps: GridProps;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const loupeLeft = point.x - lensSize / 2;
  const loupeTop = point.y - lift - lensSize / 2;

  const zCellPx = cellPx * lensZoom;
  const zGapPx = gapPx * lensZoom;
  const zRingOffset = RING_OFFSET * lensZoom;
  const zRingWidth = RING_WIDTH * lensZoom;

  const focal = ringCell
    ? cellCenterPx(ringCell.col, ringCell.row, zCellPx, zGapPx)
    : {
        x: (point.x - gridRect.left) * lensZoom,
        y: (point.y - gridRect.top) * lensZoom,
      };

  const contentLeft = lensSize / 2 - focal.x;
  const contentTop = lensSize / 2 - focal.y;

  return (
    <View
      pointerEvents="none"
      style={[
        stylesStatic.loupe,
        {
          left: loupeLeft,
          top: loupeTop,
          width: lensSize,
          height: lensSize,
          borderRadius: lensSize / 2,
          borderColor: theme.appBorderStrong,
          backgroundColor: theme.appSurface,
        },
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: contentLeft,
          top: contentTop,
        }}
      >
        <HeatmapGrid
          {...gridProps}
          cellPx={zCellPx}
          gapPx={zGapPx}
          ringOffset={zRingOffset}
          ringWidth={zRingWidth}
          ringOffsetColor={theme.appSurface}
        />
      </View>
    </View>
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
  onTap,
}: Props) {
  const { t, locale } = useTranslation();
  const { theme, colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  const levelColors = useMemo(
    () => getHeatmapLevelColors(theme, colorScheme),
    [theme, colorScheme],
  );
  const futureColor = getHeatmapFutureColor(theme);

  const scrollRef = useRef<ScrollView>(null);
  const wrapRef = useRef<RNView>(null);
  const gridWrapRef = useRef<RNView>(null);
  const gridRectRef = useRef<GridRect | null>(null);
  const columnsRef = useRef<HeatmapCell[][]>([]);
  const touchScrubbingRef = useRef(false);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [focusPos, setFocusPos] = useState<FocusPos | null>(null);
  const [touchScrubbing, setTouchScrubbing] = useState(false);
  const [touchPoint, setTouchPoint] = useState<ViewportPoint | null>(null);
  const [touchGridRect, setTouchGridRect] = useState<GridRect | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<ViewportPoint>({ x: 0, y: 0 });
  const [clientWidth, setClientWidth] = useState(0);

  const windowSize = Dimensions.get("window");

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
  columnsRef.current = columns;

  const cellByDate = useMemo(
    () => new Map(cells.map((c) => [c.date, c])),
    [cells],
  );

  const cellPx = compact ? 9 : 12;
  const gapPx = compact ? 2 : 4;
  const gridWidth =
    columns.length > 0
      ? columns.length * (cellPx + gapPx) - gapPx
      : 0;
  const lensSize = compact ? LENS_SIZE.compact : LENS_SIZE.full;
  const lensZoom = compact ? LENS_ZOOM.compact : LENS_ZOOM.full;
  const touchLoupeLift = compact
    ? TOUCH_LOUPE_LIFT.compact
    : TOUCH_LOUPE_LIFT.full;

  const ringCell = useMemo(() => focusToRingCell(focusPos), [focusPos]);
  const activeCell = activeDate ? cellByDate.get(activeDate) : null;

  const ringColor = colorScheme === "dark" ? theme.main600 : theme.main500;

  const gridProps: GridProps = {
    columns,
    cellPx,
    gapPx,
    ringCell,
    levelColors,
    futureColor,
    ringColor,
    ringOffsetColor: theme.appBg,
  };

  const measureGridRect = useCallback((cb?: (rect: GridRect) => void) => {
    gridWrapRef.current?.measureInWindow((left, top, width, height) => {
      const rect = { left, top, width, height };
      gridRectRef.current = rect;
      cb?.(rect);
    });
  }, []);

  const scrollToToday = useCallback(() => {
    if (!scrollRef.current || gridWidth <= 0 || clientWidth <= 0) return;
    const x = scrollLeftForToday(
      gridWidth,
      clientWidth,
      columns,
      cellPx,
      gapPx,
    );
    scrollRef.current.scrollTo({ x, animated: false });
  }, [cellPx, clientWidth, columns, gapPx, gridWidth]);

  useEffect(() => {
    scrollToToday();
  }, [scrollToToday, cells.length, compact]);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gridRectRef.current;
      if (!rect) return;
      const { date, focus } = pointerToFocus(
        clientX,
        clientY,
        rect,
        columnsRef.current,
        cellPx,
        gapPx,
      );
      if (focus) setFocusPos(focus);
      if (date) setActiveDate(date);
    },
    [cellPx, gapPx],
  );

  const clearFocus = useCallback(() => {
    touchScrubbingRef.current = false;
    scrollRef.current?.setNativeProps({ scrollEnabled: true });
    setActiveDate(null);
    setFocusPos(null);
    setTouchScrubbing(false);
    setTouchPoint(null);
    setTouchGridRect(null);
    gridRectRef.current = null;
  }, []);

  const activateLoupe = useCallback(
    (clientX: number, clientY: number) => {
      touchScrubbingRef.current = true;
      scrollRef.current?.setNativeProps({ scrollEnabled: false });
      wrapRef.current?.measureInWindow((x, y) => {
        setOverlayOrigin({ x, y });
      });
      measureGridRect((rect) => {
        gridRectRef.current = rect;
        setTouchGridRect(rect);
        setTouchPoint({ x: clientX, y: clientY });
        setTouchScrubbing(true);
        applyPointer(clientX, clientY);
      });
    },
    [applyPointer, measureGridRect],
  );

  const moveLoupe = useCallback(
    (clientX: number, clientY: number) => {
      if (!touchScrubbingRef.current) return;
      setTouchPoint({ x: clientX, y: clientY });
      applyPointer(clientX, clientY);
    },
    [applyPointer],
  );

  const endLoupe = useCallback(() => {
    clearFocus();
  }, [clearFocus]);

  const activateLoupeRef = useRef(activateLoupe);
  const moveLoupeRef = useRef(moveLoupe);
  const endLoupeRef = useRef(endLoupe);
  const onTapRef = useRef(onTap);
  activateLoupeRef.current = activateLoupe;
  moveLoupeRef.current = moveLoupe;
  endLoupeRef.current = endLoupe;
  onTapRef.current = onTap;

  const gridGesture = useMemo(() => {
    const loupePan = Gesture.Pan()
      .activateAfterLongPress(LOUPE_HOLD_MS)
      .shouldCancelWhenOutside(false)
      .onStart((e) => {
        runOnJS(activateLoupeRef.current)(e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        runOnJS(moveLoupeRef.current)(e.absoluteX, e.absoluteY);
      })
      .onFinalize(() => {
        runOnJS(endLoupeRef.current)();
      });

    if (!onTap) return loupePan;

    const tap = Gesture.Tap().onEnd(() => {
      if (onTapRef.current) runOnJS(onTapRef.current)();
    });

    return Gesture.Exclusive(loupePan, tap);
  }, [onTap]);

  function onScrollLayout(e: LayoutChangeEvent) {
    setClientWidth(e.nativeEvent.layout.width);
  }

  return (
    <View ref={wrapRef} style={styles.wrap} collapsable={false}>
      <View style={styles.hintRow}>
        <Text
          style={[
            styles.hintText,
            compact && styles.hintTextCompact,
            !isMainPage && styles.hintTextWithYear,
          ]}
          numberOfLines={2}
        >
          {activeCell
            ? t("progress.heatmap.tooltip", {
                date: formatTooltipDate(activeCell.date, dateLocale),
                count: activeCell.count,
              })
            : t("progress.heatmap.hint")}
        </Text>
        {!isMainPage ? (
          <View style={styles.yearSelectHost}>
            <HeatmapYearSelect
              years={years}
              value={heatmapYear}
              currentYear={currentYear}
              onChange={setHeatmapYear}
            />
          </View>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={onScrollLayout}
        onContentSizeChange={() => scrollToToday()}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="never"
      >
        <GestureDetector gesture={gridGesture}>
          <View ref={gridWrapRef} collapsable={false}>
            <HeatmapGrid
              {...gridProps}
              ringCell={touchScrubbing ? null : ringCell}
            />
          </View>
        </GestureDetector>
      </ScrollView>

      {touchScrubbing && touchPoint && touchGridRect ? (
        <View
          pointerEvents="none"
          style={[
            stylesStatic.loupeOverlay,
            {
              left: -overlayOrigin.x,
              top: -overlayOrigin.y,
              width: windowSize.width,
              height: windowSize.height,
            },
          ]}
        >
          <TouchLoupe
            point={touchPoint}
            gridRect={touchGridRect}
            ringCell={ringCell}
            cellPx={cellPx}
            gapPx={gapPx}
            lensSize={lensSize}
            lensZoom={lensZoom}
            lift={touchLoupeLift}
            gridProps={{ ...gridProps, ringCell }}
            theme={theme}
          />
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>{t("progress.heatmap.less")}</Text>
          {levelColors.map((color, i) => (
            <View
              key={i}
              style={[styles.legendSwatch, { backgroundColor: color }]}
            />
          ))}
          <Text style={styles.legendLabel}>{t("progress.heatmap.more")}</Text>
        </View>
      ) : null}
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  grid: {
    flexDirection: "row",
    overflow: "visible",
  },
  col: {
    flexDirection: "column",
    overflow: "visible",
  },
  colRing: {
    zIndex: 300,
    elevation: 300,
  },
  cellWrap: {
    overflow: "visible",
  },
  cellWrapRing: {
    zIndex: 300,
    elevation: 300,
  },
  loupe: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  loupeOverlay: {
    position: "absolute",
    zIndex: 1000,
    elevation: 1000,
    overflow: "visible",
  },
});

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    wrap: {
      width: "100%",
      position: "relative",
      overflow: "visible",
    },
    hintRow: {
      position: "relative",
      minHeight: 28,
      marginBottom: 8,
      justifyContent: "center",
    },
    hintText: {
      fontSize: 12,
      color: theme.appTextSecondary,
      paddingRight: 0,
    },
    hintTextCompact: {
      fontSize: 10,
    },
    hintTextWithYear: {
      paddingRight: 72,
    },
    yearSelectHost: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    scrollContent: {
      paddingVertical: 2,
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
    },
    legendLabel: {
      fontSize: 10,
      color: theme.appTextMuted,
    },
    legendSwatch: {
      width: 12,
      height: 12,
      borderRadius: 2,
    },
  });
}
