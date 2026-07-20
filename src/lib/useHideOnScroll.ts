import { useEffect, useRef, useState } from "react";

/** Upward travel (px) that brings the bar back — deliberately tiny. */
const REVEAL_AFTER = 6;
/** Scroll offset (px) under which the bar is always shown. */
const ALWAYS_VISIBLE_ABOVE = 8;

/**
 * Smart hide-on-scroll for the sticky header.
 *
 * Travel is accumulated per direction and the accumulator resets the moment the
 * direction flips, so the two gestures are judged independently and
 * asymmetrically: hiding needs `threshold`px of *continuous* downward scroll,
 * revealing needs only a few px upward — anywhere on the page, not just back at
 * the top. That asymmetry is the whole point; with a symmetric threshold (the
 * previous behaviour) the bar felt stuck away, because every momentum wobble on
 * the way up re-based the anchor before the reveal distance was reached.
 *
 * Returns `true` when the bar should be hidden.
 */
export function useHideOnScroll(threshold = 20): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  /** Signed travel since the last direction change (+ down, − up). */
  const travel = useRef(0);

  useEffect(() => {
    lastY.current = Math.max(0, window.scrollY);
    let ticking = false;

    const update = () => {
      ticking = false;

      // Clamp: iOS rubber-banding reports negative / overscrolled positions,
      // whose bogus deltas would otherwise flip the bar at both page ends.
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY.current;
      lastY.current = y;
      if (delta === 0) return;

      // Direction flip → start measuring the new gesture from scratch.
      if (delta > 0 !== travel.current > 0) travel.current = 0;
      travel.current += delta;

      if (y <= ALWAYS_VISIBLE_ABOVE) {
        setHidden(false);
        return;
      }

      if (travel.current > threshold) setHidden(true);
      else if (travel.current < -REVEAL_AFTER) setHidden(false);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
