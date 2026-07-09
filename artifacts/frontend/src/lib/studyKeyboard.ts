import { useEffect, useRef } from "react";

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

/** Desktop / trackpad — skip touch-only phones. */
export function isDesktopStudyKeyboard(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

export function useStudySwipeKeys({
  enabled,
  onKnow,
  onDontKnow,
}: {
  enabled: boolean;
  onKnow: () => void;
  onDontKnow: () => void;
}): void {
  const onKnowRef = useRef(onKnow);
  const onDontKnowRef = useRef(onDontKnow);
  onKnowRef.current = onKnow;
  onDontKnowRef.current = onDontKnow;

  useEffect(() => {
    if (!enabled || !isDesktopStudyKeyboard()) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onKnowRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onDontKnowRef.current();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
