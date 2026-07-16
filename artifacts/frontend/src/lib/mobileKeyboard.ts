/**
 * Mobile browsers (esp. iOS) only open the software keyboard from a
 * synchronous user-gesture focus(). After await/navigation that chain breaks.
 *
 * Flow:
 * 1. On deck tap (pointerdown): warmMobileKeyboard() focuses a real-sized ghost input.
 * 2. Study page mounts: consumeWarmedKeyboard(realInput) steals focus WITHOUT blurring
 *    the ghost first (ghost.blur() dismisses the keyboard on iOS).
 * 3. While studying, never set input readOnly/disabled and keep pointerdown
 *    preventDefault on action buttons so the keyboard never closes.
 */

let ghost: HTMLInputElement | null = null;

function ensureGhost(): HTMLInputElement {
  if (ghost && document.body.contains(ghost)) return ghost;

  ghost = document.createElement("input");
  ghost.type = "text";
  ghost.inputMode = "text";
  ghost.autocomplete = "off";
  ghost.autocapitalize = "off";
  ghost.spellcheck = false;
  ghost.setAttribute("aria-hidden", "true");
  ghost.tabIndex = -1;
  // Must be in-viewport and ≥16px font or iOS drops the keyboard during await.
  Object.assign(ghost.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "0",
    width: "100%",
    height: "48px",
    margin: "0",
    padding: "12px",
    border: "none",
    outline: "none",
    opacity: "0.02",
    fontSize: "16px",
    lineHeight: "24px",
    background: "transparent",
    color: "transparent",
    caretColor: "transparent",
    zIndex: "2147483646",
    transform: "translateZ(0)",
  });
  document.body.appendChild(ghost);
  return ghost;
}

/** Call synchronously inside pointerdown/click that starts example study. */
export function warmMobileKeyboard(): void {
  if (typeof document === "undefined") return;
  const el = ensureGhost();
  try {
    el.focus();
  } catch {
    /* ignore */
  }
}

export function isKeyboardWarmed(): boolean {
  return !!ghost && document.activeElement === ghost;
}

/**
 * Move focus to the real answer input.
 * Never call ghost.blur() — that closes the software keyboard on iOS.
 */
export function consumeWarmedKeyboard(target: HTMLInputElement): boolean {
  try {
    target.focus();
  } catch {
    try {
      target.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  try {
    const len = target.value.length;
    target.setSelectionRange(len, len);
  } catch {
    /* some input types reject selection */
  }

  if (ghost) {
    const g = ghost;
    ghost = null;
    // Remove after focus has settled on the target — do not blur first.
    requestAnimationFrame(() => {
      try {
        g.remove();
      } catch {
        /* ignore */
      }
    });
  }

  return document.activeElement === target;
}

export function discardWarmedKeyboard(): void {
  if (!ghost) return;
  const g = ghost;
  ghost = null;
  try {
    g.remove();
  } catch {
    /* ignore */
  }
}
