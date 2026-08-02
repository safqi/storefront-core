/**
 * Drag-to-scroll for any horizontally scrollable element — the missing half of
 * "swipe like swiper.js".
 *
 * ## Why this is a layer on top of native scrolling, not a carousel engine
 *
 * A storefront's horizontal strips (product shelves, category rails, gallery
 * thumbnails) are already `overflow-x: auto` containers, and on a **touch**
 * device they are already perfect: the browser gives momentum, rubber-banding,
 * scroll-snap, and it never drops a frame because the scroll runs off the main
 * thread. Reimplementing that with `transform` — which is what swiper.js and
 * embla do — throws all of it away and buys nothing on mobile.
 *
 * The one thing native scrolling does NOT give you is **mouse drag**: on a
 * desktop the shopper can only reach the rest of the row via a trackpad
 * two-finger swipe, a shift+wheel, or a scrollbar they may not see. So that is
 * the only thing this hook adds — grab-and-throw with inertia for the mouse,
 * while touch, pen, wheel, keyboard, scroll-snap and accessibility all keep
 * their native behaviour untouched.
 *
 * The result is ~1KB of behaviour instead of a carousel dependency, and it
 * attaches to markup you already have:
 *
 * ```tsx
 * const ref = useDragScroll<HTMLDivElement>();
 * <div ref={ref} className="flex gap-4 overflow-x-auto">…</div>
 * ```
 *
 * RTL needs no special-casing: every calculation below is a *delta* against the
 * scroll position captured at pointer-down, so it is correct whether the
 * browser reports `scrollLeft` as negative (the modern RTL convention) or
 * positive.
 *
 * ## Why this never calls `setPointerCapture`
 *
 * It is the obvious way to keep receiving moves after the pointer leaves the
 * rail — and it silently breaks every link inside it. Per Pointer Events L3 the
 * browser dispatches the trailing `click` at the **pointer-capture element**,
 * so with capture on the scroll container a click on a product card is
 * delivered to the container instead: the card's own handler (a react-router
 * `<Link>`, an `<a>`) is never in the event path and the shopper cannot open
 * anything. Verified in Chrome 150 — the click target came back as the rail,
 * with the card's listener never invoked.
 *
 * So the gesture is tracked with `pointermove`/`pointerup` on the **document**
 * for the duration of the press instead. That delivers moves outside the rail
 * just as capture would, while an ordinary click keeps its real target.
 */
export interface DragScrollOptions {
  /** Set false to detach the behaviour (e.g. while a modal owns the pointer). */
  enabled?: boolean;
  /** Throw the row with inertia after a flick. Default true. */
  momentum?: boolean;
  /**
   * Per-frame velocity multiplier while coasting (0–1). Lower stops sooner.
   * Default 0.95, which lands close to the iOS feel at 60fps.
   */
  friction?: number;
  /** Movement in px before a gesture counts as a drag rather than a click. */
  threshold?: number;
}

/** One sampled pointer position, used to derive the release velocity. */
export interface DragSample {
  x: number;
  t: number;
}

/** Only samples from the last this-many ms feed the velocity estimate. */
export const VELOCITY_WINDOW_MS = 100;

/** Below this speed (px/ms) a release is a stop, not a throw. */
export const MIN_FLICK_VELOCITY = 0.05;

/** Coasting ends once the speed decays below this (px/ms). */
export const MIN_COAST_VELOCITY = 0.02;

/**
 * Release velocity in px/ms from the recent pointer trail.
 *
 * Only the tail of the trail counts: a shopper who drags slowly, pauses, then
 * lets go has released at rest, and averaging over the whole gesture would
 * throw the row anyway. Returns 0 when the trail is too short or the samples
 * share a timestamp (which would divide by zero).
 */
export function computeVelocity(samples: DragSample[], windowMs = VELOCITY_WINDOW_MS): number {
  if (samples.length < 2) return 0;

  const last = samples[samples.length - 1];
  const recent = samples.filter((s) => last.t - s.t <= windowMs);
  const first = recent.length >= 2 ? recent[0] : samples[samples.length - 2];

  const dt = last.t - first.t;
  if (dt <= 0) return 0;

  return (last.x - first.x) / dt;
}

/** Is this release a throw, or did the shopper simply stop and let go? */
export function isFlick(velocity: number, min = MIN_FLICK_VELOCITY): boolean {
  return Math.abs(velocity) >= min;
}

/** Has a coast decayed far enough to stop and hand back to CSS scroll-snap? */
export function isCoastFinished(velocity: number, min = MIN_COAST_VELOCITY): boolean {
  return Math.abs(velocity) < min;
}

/** Did the pointer travel far enough that the following click should be eaten? */
export function isDrag(dx: number, dy: number, threshold: number): boolean {
  return Math.hypot(dx, dy) > threshold;
}

/**
 * Attach drag-to-scroll to a horizontally scrollable element.
 *
 * Framework-free on purpose: the whole gesture is DOM work, so keeping it out of
 * a hook means it can be driven by a real browser in a test (and reused outside
 * React) instead of only ever running inside a component.
 *
 * @param el      the scroll container itself (the element with `overflow-x: auto`),
 *                not its inner track.
 * @param options either a fixed set, or a function read on every gesture so a
 *                caller whose props change does not have to re-attach.
 * @returns a detach function that removes every listener and restores the styles.
 */
export function attachDragScroll(
  el: HTMLElement,
  options: DragScrollOptions | (() => DragScrollOptions) = {},
): () => void {
  const read = (): Required<Omit<DragScrollOptions, "enabled">> => {
    const o = typeof options === "function" ? options() : options;
    return { momentum: o.momentum ?? true, friction: o.friction ?? 0.95, threshold: o.threshold ?? 5 };
  };

  const doc = el.ownerDocument;

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startScroll = 0;
  let samples: DragSample[] = [];
  // Past the threshold: the row is currently following the pointer.
  let dragging = false;
  // This gesture WAS a drag, so the trailing click must be eaten. Outlives
  // `dragging`, because the click arrives after pointerup.
  let dragged = false;
  let raf = 0;
  // The container's own snap setting, restored on release. Manually writing
  // scrollLeft against an active `scroll-snap-type` makes the browser yank the
  // row back to the nearest snap point on every frame — the drag feels stuck.
  let snapBefore = "";

  const stopCoasting = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const coast = (velocity: number) => {
    const reduceMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!read().momentum || reduceMotion || !isFlick(velocity)) {
      el.style.scrollSnapType = snapBefore;
      return;
    }

    let v = velocity;
    let last = performance.now();

    const step = () => {
      const now = performance.now();
      // Normalised to a 60fps frame so the decay feels identical on a 120Hz
      // display, where twice as many frames would otherwise stop it twice as fast.
      const frames = Math.min((now - last) / 16.667, 4);
      last = now;

      el.scrollLeft -= v * 16.667 * frames;
      v *= Math.pow(read().friction, frames);

      if (isCoastFinished(v)) {
        // Handing snap back at rest lets the browser settle on the nearest
        // item for us — no snap maths in this hook at all.
        el.style.scrollSnapType = snapBefore;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
  };

  // Everything that must not happen on a plain click lives here, and runs on
  // the first move past the threshold rather than on pointerdown: suppressing
  // snap, the grabbing cursor and killing text selection are all invisible to
  // a shopper who is only clicking, and doing them eagerly made every press
  // flicker through a drag that never happened.
  const beginDrag = () => {
    dragging = true;
    dragged = true;

    snapBefore = el.style.scrollSnapType;
    el.style.scrollSnapType = "none";
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
    // The press already anchored a text selection; without this the drag
    // paints a growing highlight across the cards it passes over.
    doc.getSelection()?.removeAllRanges();
  };

  const onPointerDown = (e: PointerEvent) => {
    // Cleared before the guards below, never after: a gesture that bailed out
    // early must not leave the click-eating latch armed for the next click.
    dragged = false;

    // Touch and pen already scroll natively, and far better than we could —
    // momentum, rubber-band and off-main-thread scrolling all come free.
    // Hijacking them is how a hand-rolled carousel starts feeling worse than
    // the browser. Mouse is the only pointer type missing a drag gesture.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    // Nothing to drag if the content fits.
    if (el.scrollWidth <= el.clientWidth) return;

    stopCoasting();
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startScroll = el.scrollLeft;
    samples = [{ x: e.clientX, t: performance.now() }];
    dragging = false;

    // Bound on the document, not the element, so the row keeps following a
    // pointer that has wandered off it — the job `setPointerCapture` would do
    // if it did not also steal the click. Released in endDrag.
    doc.addEventListener("pointermove", onPointerMove);
    doc.addEventListener("pointerup", endDrag);
    doc.addEventListener("pointercancel", endDrag);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId === null || e.pointerId !== pointerId) return;

    const dx = e.clientX - startX;
    if (!dragging && isDrag(dx, e.clientY - startY, read().threshold)) beginDrag();

    // Sub-threshold jitter is a click, not a nudge — moving the row by the
    // couple of pixels a hand shakes on mousedown would only blur it.
    if (dragging) el.scrollLeft = startScroll - dx;

    samples.push({ x: e.clientX, t: performance.now() });
    if (samples.length > 12) samples.shift();
  };

  const endDrag = (e: PointerEvent) => {
    if (pointerId === null || e.pointerId !== pointerId) return;

    const wasDragging = dragging;

    pointerId = null;
    dragging = false;
    unbindGesture();
    el.style.userSelect = "";
    syncCursor();

    // A press that never became a drag left no styles to restore and has no
    // velocity to spend — it is a click, so leave the row completely alone.
    if (wasDragging) coast(computeVelocity(samples));
  };

  const unbindGesture = () => {
    doc.removeEventListener("pointermove", onPointerMove);
    doc.removeEventListener("pointerup", endDrag);
    doc.removeEventListener("pointercancel", endDrag);
  };

  // A drag that ends on a product card must not also open that product. The
  // click fires after pointerup, so it is caught here in the CAPTURE phase —
  // before it reaches the card's own handler — and only when the pointer
  // actually travelled.
  const onClickCapture = (e: MouseEvent) => {
    if (!dragged) return;
    e.preventDefault();
    e.stopPropagation();
    dragged = false;
  };

  // Browsers start a native image/link drag from a mousedown on those
  // elements, which cancels our pointer stream mid-gesture.
  const onDragStart = (e: Event) => e.preventDefault();

  // A wheel or trackpad scroll during a coast should take over immediately.
  const onWheel = () => {
    if (raf) {
      stopCoasting();
      el.style.scrollSnapType = snapBefore;
    }
  };

  // The grab cursor is an affordance and must not appear on a row whose
  // content already fits — there would be nothing to drag. CSS can't ask
  // whether an element overflows, so the measurement lives here, and is
  // repeated on resize because the answer changes with the viewport (a
  // 4-across grid on desktop can be a scrolling rail on a phone).
  const syncCursor = () => {
    if (pointerId !== null) return; // mid-drag: grabbing wins
    el.style.cursor = el.scrollWidth > el.clientWidth ? "grab" : "";
  };

  syncCursor();
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(syncCursor) : null;
  observer?.observe(el);

  // Only pointerdown is bound to the element; the move/up pair is bound to the
  // document for the length of a press (see onPointerDown).
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("click", onClickCapture, true);
  el.addEventListener("dragstart", onDragStart);
  el.addEventListener("wheel", onWheel, { passive: true });

  return () => {
    stopCoasting();
    observer?.disconnect();
    // Unmounting mid-gesture would otherwise leave the document listeners
    // scrolling a detached element for the rest of the session.
    unbindGesture();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("click", onClickCapture, true);
    el.removeEventListener("dragstart", onDragStart);
    el.removeEventListener("wheel", onWheel);
    el.style.cursor = "";
    el.style.userSelect = "";
    el.style.scrollSnapType = snapBefore;
  };

}
