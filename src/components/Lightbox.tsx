import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SolarIcon } from "./SolarIcon";
import { t } from "../lib/i18n";
import { clampPan, keyAction, stepIndex, swipeStep } from "../lib/lightbox";

export interface LightboxProps {
  /** Image sources, in display order. */
  images: string[];
  /** Index to open on. Read when `open` flips true; ignored afterwards. */
  index?: number;
  open: boolean;
  onClose: () => void;
  /** Alt text / accessible name for the photos (usually the product name). */
  alt?: string;
}

const MAX_SCALE = 2.5;

/**
 * Lightweight full-screen photo viewer — the storefront's gallery zoom.
 *
 * Deliberately dependency-free (no embla, no lightbox library): one <img> at a
 * time, paged by swipe / arrow keys / the side buttons, with a tap-to-zoom that
 * pans by drag. Everything it needs is a portal, a transform and three pure
 * helpers from lib/lightbox.
 *
 * Portalled to <body> for the same reason as every other overlay here: an
 * ancestor with backdrop-filter or transform becomes the containing block for
 * `position: fixed`, which would pin the viewer inside the page instead of the
 * viewport.
 *
 * Presentation lives in base.css (`.sf-lightbox*`) rather than Tailwind
 * utilities — Tailwind does not scan node_modules, so a utility class used only
 * inside this package is never generated and the rule silently goes missing in
 * every theme.
 */
export function Lightbox({ images, index = 0, open, onClose, alt = "" }: LightboxProps) {
  const [current, setCurrent] = useState(index);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const moved = useRef(false);

  const count = images.length;
  const dir: "rtl" | "ltr" =
    typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "rtl" : "ltr";

  const resetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (delta: -1 | 1) => {
      resetZoom();
      setCurrent((i) => stepIndex(i, delta, count));
    },
    [count, resetZoom],
  );

  // Opening is the only time `index` is honoured — once the shopper is paging
  // inside the viewer, the parent's "which thumbnail was clicked" is stale.
  // Derived during render (the documented way to react to a prop change without
  // an effect), same idiom as the themes' BottomSheet.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setCurrent(index);
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }

  // The key handler reads the LATEST callbacks through a ref so the effect below
  // can depend on `open` alone. Listing `go`/`onClose` in the deps instead would
  // re-run it on every parent render (both are new functions each time), which
  // re-steals focus to the close button and would make Tab unusable.
  const latest = useRef({ dir, go, onClose });
  latest.current = { dir, go, onClose };

  // Keyboard + scroll lock + initial focus, live only while open.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      const action = keyAction(event.key, latest.current.dir);
      if (!action) return;
      event.preventDefault();
      if (action.type === "close") latest.current.onClose();
      else latest.current.go(action.delta);
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog so a screen reader lands here and Tab stays in
    // range; the arrow/Escape handler is on `document`, so it works regardless.
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || count === 0) return null;

  const zoomed = scale > 1;

  const startDrag = (x: number, y: number) => {
    drag.current = { x, y, panX: pan.x, panY: pan.y };
    moved.current = false;
  };

  const moveDrag = (x: number, y: number) => {
    const start = drag.current;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
    // Panning only applies while zoomed; at 1x the drag is a page gesture and
    // the image must not wander under the finger.
    if (!zoomed) return;
    const frame = frameRef.current;
    setPan({
      x: clampPan(start.panX + dx, frame?.clientWidth ?? 0, scale),
      y: clampPan(start.panY + dy, frame?.clientHeight ?? 0, scale),
    });
  };

  const endDrag = (x: number, y: number) => {
    const start = drag.current;
    drag.current = null;
    if (!start || zoomed) return;
    const step = swipeStep(x - start.x, y - start.y);
    if (step !== 0) go(step);
  };

  const toggleZoom = () => {
    if (moved.current) return; // that tap was the end of a drag
    if (zoomed) resetZoom();
    else setScale(MAX_SCALE);
  };

  return createPortal(
    <div
      className="sf-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t("product.gallery")}
    >
      {/* Backdrop — a click anywhere off the photo closes the viewer. */}
      <div className="sf-lightbox__backdrop" aria-hidden="true" onClick={onClose} />

      <div className="sf-lightbox__bar">
        {count > 1 ? (
          <span className="sf-lightbox__counter" aria-live="polite">
            {current + 1} / {count}
          </span>
        ) : (
          <span />
        )}
        <button
          ref={closeRef}
          type="button"
          className="sf-lightbox__btn"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <SolarIcon name="close-circle-linear" className="text-2xl" />
        </button>
      </div>

      <div
        ref={frameRef}
        className="sf-lightbox__frame"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          startDrag(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => moveDrag(e.clientX, e.clientY)}
        onPointerUp={(e) => endDrag(e.clientX, e.clientY)}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onClick={(e) => {
          // Only a real click on the letterboxing around the photo: the <img> is
          // a child and owns its own click (zoom), and a swipe that happens to
          // lift off the background is a page turn, not a dismissal.
          if (moved.current) return;
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={images[current]}
          alt={alt}
          draggable={false}
          onClick={toggleZoom}
          className={`sf-lightbox__img${zoomed ? " is-zoomed" : ""}`}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        />
      </div>

      {count > 1 ? (
        <>
          {/* Logical properties: `start`/`end` follow the document direction, so
              in Arabic "previous" sits on the right without a second rule. */}
          <button
            type="button"
            className="sf-lightbox__nav sf-lightbox__nav--prev"
            onClick={() => go(-1)}
            aria-label={t("common.previous")}
          >
            <SolarIcon
              name={dir === "rtl" ? "alt-arrow-right-linear" : "alt-arrow-left-linear"}
              className="text-2xl"
            />
          </button>
          <button
            type="button"
            className="sf-lightbox__nav sf-lightbox__nav--next"
            onClick={() => go(1)}
            aria-label={t("common.next")}
          >
            <SolarIcon
              name={dir === "rtl" ? "alt-arrow-left-linear" : "alt-arrow-right-linear"}
              className="text-2xl"
            />
          </button>

          <div className="sf-lightbox__thumbs">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => {
                  resetZoom();
                  setCurrent(i);
                }}
                aria-label={t("product.imageNumber", { number: i + 1 })}
                aria-current={i === current}
                className={`sf-lightbox__thumb${i === current ? " is-active" : ""}`}
              >
                <img src={src} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}

export default Lightbox;
