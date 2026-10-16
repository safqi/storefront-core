/**
 * Framework-free maths behind <Swiper/> and the drag rails — kept pure so it is
 * unit-tested in node, like `dragScroll.ts`.
 */

/**
 * iOS rubber-band: how far content moves when dragged `overscroll` px past an
 * edge of a `dimension`-px viewport. Starts 1:1-ish and asymptotically
 * approaches `dimension` — the "it stretches, then resists" feel of UIScrollView
 * (same constant, 0.55). Signed: the result keeps the sign of the input.
 */
export const RUBBER_BAND_CONSTANT = 0.55;

export function rubberBand(overscroll: number, dimension: number, c = RUBBER_BAND_CONSTANT): number {
  if (!overscroll || dimension <= 0) return 0;
  const x = Math.abs(overscroll);
  const d = (1 - 1 / ((x * c) / dimension + 1)) * dimension;
  return Math.sign(overscroll) * d;
}

/**
 * Which slice of dots to render when there are more slides than `max` dots —
 * swiper.js "dynamic bullets": a window that follows the active slide and is
 * pinned at both ends. Returns `[start, end)` indexes.
 */
export function dotWindow(count: number, active: number, max = 7): [number, number] {
  if (count <= max) return [0, count];
  const half = Math.floor(max / 2);
  const start = Math.min(Math.max(active - half, 0), count - max);
  return [start, start + max];
}

/**
 * Dot scale inside a dynamic window: full size near the active slide, shrinking
 * toward the window edges that still have hidden dots beyond them.
 */
export function dotScale(index: number, active: number, window: [number, number], count: number): number {
  const [start, end] = window;
  if (index === start && start > 0) return 0.5;
  if (index === end - 1 && end < count) return 0.5;
  if (index === start + 1 && start > 0 && index !== active) return 0.75;
  if (index === end - 2 && end < count && index !== active) return 0.75;
  return 1;
}

export type SwiperDotsStyle = "pill" | "dot" | "bar" | "fraction";
export type SwiperDotsPosition = "inside" | "outside";
export type SwiperDotsAlign = "center" | "start" | "end";

/** Normalised dot options — what <Swiper/> actually renders from. */
export interface SwiperDotsConfig {
  show: boolean;
  style: SwiperDotsStyle;
  position: SwiperDotsPosition;
  align: SwiperDotsAlign;
  /** Any CSS colour; empty = the theme default for the position. */
  color: string;
  activeColor: string;
}

const STYLES: SwiperDotsStyle[] = ["pill", "dot", "bar", "fraction"];
const POSITIONS: SwiperDotsPosition[] = ["inside", "outside"];
const ALIGNS: SwiperDotsAlign[] = ["center", "start", "end"];

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/**
 * Read swiper options out of a homepage-section config (`banner_swipe`), so a
 * theme renders `<Swiper {...swiperPropsFromConfig(section.config)}>` and every
 * merchant setting works without the theme knowing the keys. Unknown or missing
 * values fall back to the defaults (centred pill dots, looping).
 */
export function swiperPropsFromConfig(c: Record<string, unknown> = {}) {
  const bool = (key: string, fallback: boolean) =>
    c[key] === undefined || c[key] === null ? fallback : c[key] === true || c[key] === 1 || c[key] === "1" || c[key] === "true";

  const placement = typeof c.dots_placement === "string" && c.dots_placement.includes("-")
    ? c.dots_placement.split("-")
    : [];

  return {
    loop: bool("loop", true),
    autoPlay: bool("auto_play", false),
    interval: Number(c.interval) || 4,
    arrows: bool("arrows", false),
    dots: {
      show: bool("show_dots", true),
      style: pick(c.dots_style, STYLES, "pill"),
      // `dots_placement` ("outside-end") is the builder's single placement
      // picker; the separate `dots_position` / `dots_align` keys still work.
      position: pick(placement[0] ?? c.dots_position, POSITIONS, "inside"),
      align: pick(placement[1] ?? c.dots_align, ALIGNS, "center"),
      color: typeof c.dots_color === "string" ? c.dots_color : "",
      activeColor: typeof c.dots_active_color === "string" ? c.dots_active_color : "",
    } satisfies SwiperDotsConfig,
  };
}

/** Accepts the old `showDots` boolean, a partial object, or nothing. */
export function normalizeDots(dots: boolean | Partial<SwiperDotsConfig> | undefined, showDots?: boolean): SwiperDotsConfig {
  const base: SwiperDotsConfig = {
    show: showDots ?? true,
    style: "pill",
    position: "inside",
    align: "center",
    color: "",
    activeColor: "",
  };
  if (typeof dots === "boolean") return { ...base, show: dots };
  if (!dots) return base;
  return {
    show: dots.show ?? base.show,
    style: pick(dots.style, STYLES, "pill"),
    position: pick(dots.position, POSITIONS, "inside"),
    align: pick(dots.align, ALIGNS, "center"),
    color: dots.color ?? "",
    activeColor: dots.activeColor ?? "",
  };
}
