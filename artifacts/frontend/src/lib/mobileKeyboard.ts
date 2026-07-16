/**
 * Mobile browsers (esp. iOS) only open the software keyboard from a
 * synchronous user-gesture focus(). After await/navigation that chain breaks.
 * Warm a hidden input during the tap that starts the study session; the study
 * page then steals focus while the keyboard is already open.
 */

let ghost: HTMLInputElement | null = null;

export function warmMobileKeyboard(): void {
  if (typeof document === "undefined") return;
  if (ghost && document.activeElement === ghost) return;

  if (!ghost) {
    ghost = document.createElement("input");
    ghost.type = "text";
    ghost.inputMode = "text";
    ghost.autocomplete = "off";
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      border: "none",
      padding: "0",
      margin: "0",
      caretColor: "transparent",
      zIndex: "-1",
      pointerEvents: "none",
    });
    document.body.appendChild(ghost);
  }

  try {
    ghost.focus({ preventScroll: true });
  } catch {
    ghost.focus();
  }
}

/** Move focus to the real answer input and remove the ghost warmer. */
export function consumeWarmedKeyboard(target: HTMLInputElement): boolean {
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }

  if (ghost) {
    ghost.blur();
    ghost.remove();
    ghost = null;
  }

  return document.activeElement === target;
}
