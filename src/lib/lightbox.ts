/**
 * Photo-viewer logic — the framework-free half of `<Lightbox />`.
 *
 * Index stepping, swipe recognition and keyboard mapping live here as pure
 * functions so the interaction rules (including the RTL arrow flip, which is
 * easy to get backwards and invisible in a screenshot) are unit-testable
 * without a DOM. Same split as dragScroll.ts.
 */

/** Minimum horizontal travel, in px, before a drag counts as a swipe. */
export const SWIPE_THRESHOLD = 50;

/**
 * Move `current` by `delta` over `count` images, wrapping at both ends so the
 * viewer loops. Returns 0 for an empty set rather than NaN.
 */
export function stepIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}

/**
 * Classify a finished drag. A gesture only counts when it travelled far enough
 * horizontally AND was more horizontal than vertical — otherwise it was the
 * shopper scrolling/dismissing, not paging.
 *
 * Returns the step to apply (`-1`/`+1` in *visual* terms: a leftward drag
 * advances) or 0 for "not a swipe".
 */
export function swipeStep(dx: number, dy: number, threshold = SWIPE_THRESHOLD): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold) return 0;
  if (Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * Map a keydown to a viewer action. Arrow keys are **direction-aware**: in RTL
 * the next image lives to the LEFT, so ArrowLeft must advance — the mirror of
 * the LTR mapping. Anything else returns null so the handler leaves the event
 * alone.
 */
export function keyAction(
  key: string,
  dir: "rtl" | "ltr",
): { type: "close" } | { type: "step"; delta: -1 | 1 } | null {
  if (key === "Escape") return { type: "close" };

  const rtl = dir === "rtl";
  if (key === "ArrowRight") return { type: "step", delta: rtl ? -1 : 1 };
  if (key === "ArrowLeft") return { type: "step", delta: rtl ? 1 : -1 };

  return null;
}

/**
 * Clamp a pan offset so a zoomed image can never be dragged off its own frame.
 * At scale `s` the image overflows the frame by `(s - 1) / 2` of the frame size
 * on each side, which is exactly how far it may travel.
 */
export function clampPan(offset: number, frameSize: number, scale: number): number {
  const limit = (Math.max(scale, 1) - 1) * frameSize * 0.5;
  const clamped = Math.min(limit, Math.max(-limit, offset));
  // At 1x the limit is 0 and a negative offset clamps to -0; normalise it so
  // callers comparing against 0 behave.
  return clamped === 0 ? 0 : clamped;
}
