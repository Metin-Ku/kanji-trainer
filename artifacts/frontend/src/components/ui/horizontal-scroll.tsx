import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { cn } from "@/lib/utils";

type HorizontalScrollProps = ComponentPropsWithoutRef<"div"> & {
  /** Re-run scroll-to-end when these values change. */
  scrollDeps?: unknown[];
  /** `auto` shows a track on touch/coarse pointers (iOS/Android). */
  showTrack?: boolean | "auto";
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

export const HorizontalScroll = forwardRef<HTMLDivElement, HorizontalScrollProps>(
  function HorizontalScroll(
    {
      children,
      className,
      scrollDeps = [],
      showTrack = "auto",
      ...props
    },
    ref,
  ) {
    const innerRef = useRef<HTMLDivElement>(null);
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

    const scrollToEnd = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    }, []);

    useEffect(() => {
      scrollToEnd();
      const raf = requestAnimationFrame(scrollToEnd);

      const el = innerRef.current;
      if (!el) return () => cancelAnimationFrame(raf);

      updateTrack();
      el.addEventListener("scroll", updateTrack, { passive: true });

      const ro = new ResizeObserver(() => {
        scrollToEnd();
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
    }, [scrollToEnd, updateTrack, ...scrollDeps]);

    const trackEnabled =
      showTrack === true || (showTrack === "auto" && coarse);

    return (
      <div className="min-w-0 w-full max-w-full">
        <div
          ref={setRefs}
          className={cn(
            "app-scroll-x w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain",
            className,
          )}
          {...props}
        >
          {children}
        </div>
        {trackEnabled && track.visible && (
          <div
            className="mt-1.5 h-1.5 rounded-full bg-app-muted"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-app-border-strong"
              style={{
                width: `${track.width}%`,
                marginLeft: `${track.left}%`,
              }}
            />
          </div>
        )}
      </div>
    );
  },
);
