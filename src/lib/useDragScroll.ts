import { useEffect, useRef } from "react";
import { attachDragScroll } from "./dragScroll";
import type { DragScrollOptions } from "./dragScroll";

/**
 * React binding for `attachDragScroll` — see `dragScroll.ts` for the gesture
 * itself, why it layers on native scrolling instead of replacing it, and why it
 * must never call `setPointerCapture`.
 *
 * ```tsx
 * const ref = useDragScroll<HTMLDivElement>();
 * <div ref={ref} className="flex gap-4 overflow-x-auto">…</div>
 * ```
 *
 * @returns a ref to put on the scroll container itself (the element that has
 *          `overflow-x: auto`), not on its inner track.
 */
export function useDragScroll<T extends HTMLElement>(options: DragScrollOptions = {}) {
  const { enabled = true, momentum, friction, threshold } = options;

  const ref = useRef<T>(null);
  // Live options for the listeners, which are bound once and must not be torn
  // down and rebuilt every time a caller passes a new object literal.
  const opts = useRef<DragScrollOptions>({ momentum, friction, threshold });
  opts.current = { momentum, friction, threshold };

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    return attachDragScroll(el, () => opts.current);
  }, [enabled]);

  return ref;
}

// Re-exported so `useDragScroll` stays the one import path callers know, and the
// pure helpers keep their existing module identity for the tests.
export {
  attachDragScroll,
  computeVelocity,
  isCoastFinished,
  isDrag,
  isFlick,
  MIN_COAST_VELOCITY,
  MIN_FLICK_VELOCITY,
  VELOCITY_WINDOW_MS,
} from "./dragScroll";
export type { DragScrollOptions, DragSample } from "./dragScroll";
