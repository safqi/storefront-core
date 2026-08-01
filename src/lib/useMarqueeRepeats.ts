import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * How many times the message list must be repeated to fill one half of a
 * seamless marquee track.
 *
 * A CSS marquee loops by rendering the message list TWICE and translating the
 * track by exactly -50%: the moment copy A leaves, copy B is sitting where it
 * started. That works perfectly while the list is wider than the bar — but when
 * a merchant writes one or two short messages, two copies cannot fill the bar
 * between them, and something has to give:
 *
 *   - let the slack pool at the end of the track and the strip blanks out for
 *     half of every cycle;
 *   - stretch each copy to 50% of the track and the gaps become even, but the
 *     second copy's text now begins at exactly the middle of the bar, reading
 *     as a duplicate rather than as a ticker.
 *
 * The fix is to stop stretching and start repeating: fill each half with as
 * many natural-width copies as it takes to cover the bar. Every copy keeps its
 * own spacing, so the result is one uniform stream of messages with no stretched
 * gap and no copy landing on a conspicuous boundary — while the track still
 * consists of two identical halves, so -50% remains exactly one half and the
 * loop stays seamless.
 *
 * The count depends only on the viewport width and ONE copy's natural width,
 * neither of which depends on the count — so this cannot feed back on itself.
 *
 * @param deps values that change the rendered text (messages, locale, name)
 * @returns `[repeats, viewportRef, unitRef]` — put the refs on the clipping
 *          viewport and on any single copy, then render `repeats` copies per half.
 */
/** Hard ceiling on copies — a one-character message must not mint hundreds of nodes. */
export const MAX_MARQUEE_REPEATS = 24;

/**
 * Copies needed per half to cover `available` px with a copy `one` px wide.
 * Returns 1 for any unmeasurable input, so a not-yet-laid-out bar renders the
 * plain two-copy track rather than nothing.
 */
export function marqueeRepeats(available: number, one: number): number {
  if (!Number.isFinite(available) || !Number.isFinite(one)) return 1;
  if (available <= 0 || one <= 0) return 1;
  return Math.min(Math.max(1, Math.ceil(available / one)), MAX_MARQUEE_REPEATS);
}

export function useMarqueeRepeats<
  V extends HTMLElement = HTMLDivElement,
  U extends HTMLElement = HTMLDivElement,
>(deps: unknown[] = []): [number, React.RefObject<V | null>, React.RefObject<U | null>] {
  const viewportRef = useRef<V | null>(null);
  const unitRef = useRef<U | null>(null);
  const [repeats, setRepeats] = useState(1);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const unit = unitRef.current;
    if (!viewport || !unit) return;

    const available = viewport.getBoundingClientRect().width;
    const one = unit.getBoundingClientRect().width;

    // A zero-width copy means fonts/layout have not landed yet; a later
    // ResizeObserver callback will bring the real number.
    if (!(available > 0) || !(one > 0)) return;

    setRepeats(marqueeRepeats(available, one));
  }, []);

  useLayoutEffect(() => {
    measure();

    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    // Watch the viewport (bar resizes / orientation changes) AND the copy
    // itself, which changes width when a webfont finally swaps in.
    const observer = new ResizeObserver(() => measure());
    observer.observe(viewport);
    if (unitRef.current) observer.observe(unitRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  return [repeats, viewportRef, unitRef];
}
