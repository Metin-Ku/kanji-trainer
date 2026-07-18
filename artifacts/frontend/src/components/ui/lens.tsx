import React, { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate } from "motion/react";
import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  /** Visual center of the lens circle. */
  position?: Position;
  /** Point to magnify; defaults to `position`. Use when the glass sits above the touch point. */
  zoomOrigin?: Position;
  defaultPosition?: Position;
  isStatic?: boolean;
  duration?: number;
  lensColor?: string;
  ariaLabel?: string;
  className?: string;
  /** Cut a hole in the base layer so unscaled content does not show through the glass. */
  hideBaseUnderLens?: boolean;
}

export const Lens = React.forwardRef<HTMLDivElement, LensProps>(function Lens(
  {
    children,
    zoomFactor = 1.3,
    lensSize = 170,
    isStatic = false,
    position = { x: 0, y: 0 },
    zoomOrigin,
    defaultPosition,
    duration = 0.1,
    lensColor = "black",
    ariaLabel = "Zoom Area",
    className,
    hideBaseUnderLens = false,
  },
  ref,
) {
  if (zoomFactor < 1) {
    throw new Error("zoomFactor must be greater than 1");
  }
  if (lensSize < 0) {
    throw new Error("lensSize must be greater than 0");
  }

  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState<Position>(position);
  const containerRef = useRef<HTMLDivElement>(null);

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const currentPosition = useMemo(() => {
    if (isStatic) return position;
    if (defaultPosition && !isHovering) return defaultPosition;
    return mousePosition;
  }, [isStatic, position, defaultPosition, isHovering, mousePosition]);

  const currentZoomOrigin = zoomOrigin ?? currentPosition;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") setIsHovering(false);
  }, []);

  const radius = lensSize / 2;

  const maskImage = useMotionTemplate`radial-gradient(circle ${radius}px at ${currentPosition.x}px ${currentPosition.y}px, ${lensColor} 100%, transparent 100%)`;

  const baseMaskStyle = useMemo(() => {
    const { x, y } = currentPosition;
    const gradient = `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 100%, black 100%)`;
    return {
      maskImage: gradient,
      WebkitMaskImage: gradient,
    } as React.CSSProperties;
  }, [currentPosition, radius]);

  const { x: ox, y: oy } = currentZoomOrigin;

  const LensContent = useMemo(() => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.58 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
          zIndex: 500,
        }}
      >
        <div
          className="bg-app-surface absolute inset-0"
          style={{
            transform: `scale(${zoomFactor})`,
            transformOrigin: `${ox}px ${oy}px`,
          }}
        >
          {children}
        </div>
      </motion.div>
    );
  }, [maskImage, zoomFactor, ox, oy, children, duration]);

  const showLens = isStatic || defaultPosition != null;
  const lensVisible = showLens || isHovering;

  const baseLayer =
    hideBaseUnderLens && lensVisible ? (
      <div className="relative" style={baseMaskStyle}>
        {children}
      </div>
    ) : (
      children
    );

  return (
    <div
      ref={setContainerRef}
      className={cn("relative z-20 overflow-hidden rounded-xl", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {baseLayer}
      {showLens ? (
        LensContent
      ) : (
        <AnimatePresence mode="popLayout">
          {isHovering && LensContent}
        </AnimatePresence>
      )}
    </div>
  );
});
