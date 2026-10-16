import { Children, useCallback, useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { t } from "../lib/i18n";
import { SolarIcon } from "./SolarIcon";
import { dotScale, dotWindow, normalizeDots, type SwiperDotsConfig } from "../lib/swiper";

export interface SwiperProps {
  /** Each direct child is one slide. */
  children: React.ReactNode;
  /** Wrap around from the last slide to the first (swiper.js `loop`). Default true. */
  loop?: boolean;
  autoPlay?: boolean;
  /** Autoplay interval in seconds (min 2). */
  interval?: number;
  /** Pause autoplay while the pointer is over the carousel. Default true. */
  pauseOnHover?: boolean;
  /**
   * Pagination. `true`/`false`, or options — all optional, defaults are
   * centred `pill` dots drawn inside the slide:
   * `{ show, style: "pill"|"dot"|"bar"|"fraction", position: "inside"|"outside",
   *    align: "center"|"start"|"end", color, activeColor }`.
   */
  dots?: boolean | Partial<SwiperDotsConfig>;
  /** @deprecated use `dots` — kept so pre-1.13 themes keep compiling. */
  showDots?: boolean;
  /** More slides than this collapse into a moving window of dots (swiper.js dynamic bullets). Default 7. */
  maxDots?: number;
  /** Prev/next buttons (shown on hover for mouse users, always for keyboard focus). Default false. */
  arrows?: boolean;
  /**
   * Width of each slide, any CSS length. Under 100% lets the next slide peek in
   * (swiper.js `slidesPerView: 1.2` ≈ `"83%"`). Default `"100%"`.
   */
  slideSize?: string;
  /** Space between slides in px. Default 0 (12 is a good value with `slideSize` < 100%). */
  gap?: number;
  /** Where a slide settles: `"start"` (default) or `"center"`. */
  align?: "start" | "center";
  /** Glide speed of a snap/arrow/dot move (Embla duration, 20–60). Default 30 — iOS-like. */
  speed?: number;
  /** Free momentum scrolling without snapping to slides (swiper.js `freeMode`). Default false. */
  freeMode?: boolean;
  /** Applied to the outer wrapper (e.g. rounded corners / background). */
  className?: string;
  ariaLabel?: string;
  /** Fires with the new active index. */
  onChange?: (index: number) => void;
}

/**
 * A slide carousel built on **Embla** — the same engine the themes already use
 * for the product gallery — with the good parts of swiper.js on top:
 *
 * - `loop` on/off. With loop off the ends **rubber-band** like iOS (Embla pulls
 *   back with friction) instead of hitting a wall, and autoplay rewinds to the
 *   first slide.
 * - Pagination that is centred by default and fully optional: pill / dot / bar
 *   (progress) / fraction ("2 / 5"), inside the slide or below it, start /
 *   centre / end, any colours. Long sets get a moving window of dots.
 * - Optional arrows, slide peeking (`slideSize` + `gap`), keyboard ←/→,
 *   pause-on-hover and pause while the tab is hidden.
 *
 * Height is intentionally NOT fixed: slides sit in a flex row, so the viewport
 * takes the height of the **tallest** slide and shorter slides are centred.
 * RTL is handled by Embla's `direction`, read from `<html dir>` at mount.
 *
 * Presentation lives in base.css (`.sf-swiper*`) because Tailwind never scans
 * this package — and so a theme can restyle any part of it.
 */
export default function Swiper({
  children,
  loop = true,
  autoPlay = false,
  interval = 4,
  pauseOnHover = true,
  dots,
  showDots,
  maxDots = 7,
  arrows = false,
  slideSize = "100%",
  gap = 0,
  align = "start",
  speed = 30,
  freeMode = false,
  className = "",
  ariaLabel,
  onChange,
}: SwiperProps) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const pagination = normalizeDots(dots, showDots);

  const direction =
    typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "rtl" : "ltr";

  const [viewportRef, embla] = useEmblaCarousel({
    direction,
    loop,
    align,
    duration: Math.min(60, Math.max(20, speed)),
    dragFree: freeMode,
    // Without loop, don't leave empty space after the last slide when slides
    // are narrower than the viewport.
    containScroll: loop ? false : "trimSnaps",
  });

  const [idx, setIdx] = useState(0);
  const [snaps, setSnaps] = useState(count);
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(count > 1);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);

  const sync = useCallback(() => {
    if (!embla) return;
    const i = embla.selectedScrollSnap();
    setIdx(i);
    setSnaps(embla.scrollSnapList().length);
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
    onChange?.(i);
  }, [embla, onChange]);

  const onScroll = useCallback(() => {
    if (embla) setProgress(Math.max(0, Math.min(1, embla.scrollProgress())));
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    sync();
    onScroll();
    const down = () => setDragging(true);
    const up = () => setDragging(false);
    embla
      .on("select", sync)
      .on("reInit", sync)
      .on("scroll", onScroll)
      .on("pointerDown", down)
      .on("pointerUp", up);
    return () => {
      embla
        .off("select", sync)
        .off("reInit", sync)
        .off("scroll", onScroll)
        .off("pointerDown", down)
        .off("pointerUp", up);
    };
  }, [embla, sync, onScroll]);

  // A backgrounded tab should not keep advancing (and then jump on return).
  useEffect(() => {
    if (!autoPlay || typeof document === "undefined") return;
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [autoPlay]);

  const next = useCallback(() => {
    if (!embla) return;
    // Without loop, autoplay rewinds instead of stalling on the last slide.
    if (embla.canScrollNext()) embla.scrollNext();
    else embla.scrollTo(0);
  }, [embla]);

  const paused = dragging || hidden || (pauseOnHover && hovered);

  // Keyed on `idx` so the timer restarts after manual navigation.
  useEffect(() => {
    if (!embla || !autoPlay || paused || count <= 1) return;
    const timer = setInterval(next, Math.max(2, interval) * 1000);
    return () => clearInterval(timer);
  }, [embla, autoPlay, paused, interval, count, idx, next]);

  if (count === 0) return null;
  if (count === 1) {
    return <div className={`sf-swiper ${className}`}>{slides[0]}</div>;
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!embla || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    // In RTL the visual "next" is to the left.
    const forward = (e.key === "ArrowRight") !== (direction === "rtl");
    if (forward) embla.scrollNext();
    else embla.scrollPrev();
  };

  const colors = {
    ...(pagination.color ? { "--sf-swiper-dot": pagination.color } : {}),
    ...(pagination.activeColor ? { "--sf-swiper-dot-active": pagination.activeColor } : {}),
  } as CSSProperties;

  const showPagination = pagination.show && snaps > 1;
  const [winStart, winEnd] = dotWindow(snaps, idx, maxDots);

  const paginationEl = showPagination ? (
    <div
      className={`sf-swiper__dots sf-swiper__dots--${pagination.position} sf-swiper__dots--${pagination.align} sf-swiper__dots--${pagination.style}`}
      style={colors}
    >
      {pagination.style === "fraction" ? (
        <span className="sf-swiper__fraction" aria-live="polite">
          {idx + 1} / {snaps}
        </span>
      ) : pagination.style === "bar" ? (
        <span className="sf-swiper__bar" role="progressbar" aria-valuemin={1} aria-valuemax={snaps} aria-valuenow={idx + 1}>
          <span
            className="sf-swiper__bar-fill"
            // Looping progress jumps at the seam, so it follows the snap index there.
            style={{ width: `${(loop ? (idx + 1) / snaps : Math.max(progress, 1 / snaps)) * 100}%` }}
          />
        </span>
      ) : (
        Array.from({ length: winEnd - winStart }, (_, k) => {
          const i = winStart + k;
          const active = i === idx;
          return (
            <button
              key={i}
              type="button"
              aria-label={t("home.slide", { number: i + 1 })}
              aria-current={active}
              onClick={() => embla?.scrollTo(i)}
              className={`sf-swiper__dot${active ? " is-active" : ""}`}
              style={{ "--sf-swiper-dot-scale": dotScale(i, idx, [winStart, winEnd], snaps) } as CSSProperties}
            />
          );
        })
      )}
    </div>
  ) : null;

  return (
    <div
      className={`sf-swiper${showPagination && pagination.position === "outside" ? " has-outside-dots" : ""} ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="sf-swiper__stage">
        <div ref={viewportRef} className="sf-swiper__viewport">
          {/* Embla suppresses the click that follows a real drag on this
              container itself, so a swipe never opens the slide underneath. */}
          <div className="sf-swiper__track" style={gap ? { marginInlineStart: -gap } : undefined}>
            {slides.map((slide, i) => (
              <div
                key={i}
                className={`sf-swiper__slide${i === idx ? " is-active" : ""}`}
                style={{ flexBasis: slideSize, ...(gap ? { paddingInlineStart: gap } : {}) }}
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${count}`}
              >
                {slide}
              </div>
            ))}
          </div>
        </div>

        {arrows ? (
          <>
            <button
              type="button"
              className="sf-swiper__arrow sf-swiper__arrow--prev"
              aria-label={t("common.previous")}
              onClick={() => embla?.scrollPrev()}
              disabled={!loop && !canPrev}
            >
              <SolarIcon name="alt-arrow-left-linear" />
            </button>
            <button
              type="button"
              className="sf-swiper__arrow sf-swiper__arrow--next"
              aria-label={t("common.next")}
              onClick={() => embla?.scrollNext()}
              disabled={!loop && !canNext}
            >
              <SolarIcon name="alt-arrow-right-linear" />
            </button>
          </>
        ) : null}

        {pagination.position === "inside" ? paginationEl : null}
      </div>

      {pagination.position === "outside" ? paginationEl : null}
    </div>
  );
}
