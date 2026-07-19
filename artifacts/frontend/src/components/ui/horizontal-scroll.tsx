import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

type HorizontalScrollProps = ComponentPropsWithoutRef<"div"> & {
  /** Re-run scroll positioning when these values change. */
  scrollDeps?: unknown[];
  /** `end` = far right; function = custom scrollLeft (e.g. anchor on today). */
  scrollTo?: "end" | ((el: HTMLDivElement) => number);
  /** Whether the scroll is touchable. */
  isTouchable?: boolean;
  /** `auto` shows a track on touch/coarse pointers (iOS/Android). */
  showTrack?: boolean | "auto";
  /** Allow dragging / tapping the mobile track to scroll. */
  interactiveTrack?: boolean;
};

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return coarse;
}

export const HorizontalScroll = forwardRef<
  HTMLDivElement,
  HorizontalScrollProps
>(function HorizontalScroll(
  {
    children,
    className,
    scrollDeps = [],
    scrollTo = "end",
    isTouchable = false,
    showTrack = "auto",
    interactiveTrack = true,
    ...props
  },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackDragRef = useRef(false);
  const coarse = useCoarsePointer();
  const [track, setTrack] = useState({
    visible: false,
    left: 0,
    width: 100,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const updateTrack = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    if (!overflow) {
      setTrack({ visible: false, left: 0, width: 100 });
      return;
    }
    const ratio = el.clientWidth / el.scrollWidth;
    const widthPct = ratio * 100;
    const maxLeft = 100 - widthPct;
    const scrollRange = el.scrollWidth - el.clientWidth;
    const leftPct =
      scrollRange > 0 ? (el.scrollLeft / scrollRange) * maxLeft : 0;
    setTrack({ visible: true, left: leftPct, width: widthPct });
  }, []);

  const applyScroll = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    if (typeof scrollTo === "function") {
      el.scrollLeft = scrollTo(el);
    } else {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    }
  }, [scrollTo]);

  const scrollFromClientX = useCallback(
    (clientX: number) => {
      const el = innerRef.current;
      const trackEl = trackRef.current;
      if (!el || !trackEl) return;

      const rect = trackEl.getBoundingClientRect();
      const scrollRange = el.scrollWidth - el.clientWidth;
      if (scrollRange <= 0) return;

      const thumbWidthPx = (track.width / 100) * rect.width;
      const travel = Math.max(1, rect.width - thumbWidthPx);
      const x = clientX - rect.left - thumbWidthPx / 2;
      const ratio = Math.max(0, Math.min(1, x / travel));
      el.scrollLeft = ratio * scrollRange;
    },
    [track.width],
  );

  const handleTrackPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactiveTrack) return;
      e.preventDefault();
      e.stopPropagation();
      trackDragRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      scrollFromClientX(e.clientX);
    },
    [interactiveTrack, scrollFromClientX],
  );

  const handleTrackPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!trackDragRef.current) return;
      e.preventDefault();
      scrollFromClientX(e.clientX);
    },
    [scrollFromClientX],
  );

  const handleTrackPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      trackDragRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  useEffect(() => {
    applyScroll();
    const raf = requestAnimationFrame(applyScroll);

    const el = innerRef.current;
    if (!el) return () => cancelAnimationFrame(raf);

    updateTrack();
    el.addEventListener("scroll", updateTrack, { passive: true });

    const ro = new ResizeObserver(() => {
      applyScroll();
      updateTrack();
    });
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateTrack);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollDeps is intentional
  }, [applyScroll, updateTrack, ...scrollDeps]);

  const trackEnabled = showTrack === true || (showTrack === "auto" && coarse);

  return (
    <div className="w-full max-w-full min-w-0">
      <div
        ref={setRefs}
        className={cn(
          "app-scroll-x w-full max-w-full min-w-0 overscroll-x-contain",
          isTouchable ? "" : "touch-none",
          className,
        )}
        {...props}
      >
        {children}
      </div>
      {trackEnabled && track.visible && (
        <div
          ref={trackRef}
          className={cn(
            "mt-1.5 touch-none pb-2 select-none",
            isTouchable ? "pt-2" : "pt-3",
            interactiveTrack && "cursor-pointer",
          )}
          aria-hidden={!interactiveTrack}
          role={interactiveTrack ? "scrollbar" : undefined}
          aria-orientation={interactiveTrack ? "horizontal" : undefined}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
        >
          <div className="bg-app-muted relative h-1.5 rounded-full">
            <div
              className="bg-app-border-strong absolute top-0 h-full rounded-full"
              style={{
                width: `${track.width}%`,
                left: `${track.left}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});
