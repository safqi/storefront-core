import { Children, useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { t } from "../lib/i18n";

interface SwiperProps {
  /** Each direct child is one slide. */
  children: React.ReactNode;
  autoPlay?: boolean;
  /** Autoplay interval in seconds (min 2). */
  interval?: number;
  showDots?: boolean;
  /** Applied to the clipping viewport (e.g. rounded corners). */
  className?: string;
  ariaLabel?: string;
}

/**
 * A slide carousel built on **Embla** — the same engine the themes already use
 * for the product gallery. Touch/mouse drag with real momentum, looping,
 * autoplay (paused while the user is interacting), and clickable dots.
 *
 * Height is intentionally NOT fixed: slides sit in a flex row, so the viewport
 * takes the height of the **tallest** slide and shorter slides are centred. Feed
 * it images as `w-full h-auto` and the banner height follows the natural image
 * size (the tallest of the set) instead of a hard-cropped aspect ratio.
 *
 * RTL is handled by Embla's `direction` option, read from `<html dir>` at mount.
 */
export default function Swiper({
  children,
  autoPlay = false,
  interval = 4,
  showDots = true,
  className = "",
  ariaLabel,
}: SwiperProps) {
  const slides = Children.toArray(children);
  const count = slides.length;

  const direction =
    typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "rtl" : "ltr";

  const [viewportRef, embla] = useEmblaCarousel({ direction, loop: true, align: "start" });

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const onSelect = useCallback(() => {
    if (embla) setIdx(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    const pause = () => setPaused(true);
    const resume = () => setPaused(false);
    embla.on("select", onSelect).on("reInit", onSelect).on("pointerDown", pause).on("pointerUp", resume);
    return () => {
      embla.off("select", onSelect).off("reInit", onSelect).off("pointerDown", pause).off("pointerUp", resume);
    };
  }, [embla, onSelect]);

  // Autoplay — keyed on `idx` so the timer restarts after manual navigation,
  // and suspended while the user is dragging.
  useEffect(() => {
    if (!embla || !autoPlay || paused || count <= 1) return;
    const timer = setInterval(() => embla.scrollNext(), Math.max(2, interval) * 1000);
    return () => clearInterval(timer);
  }, [embla, autoPlay, paused, interval, count, idx]);

  if (count === 0) return null;
  if (count === 1) {
    return <div className={`overflow-hidden ${className}`}>{slides[0]}</div>;
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div ref={viewportRef} className="overflow-hidden">
        {/* Embla suppresses the click that follows a real drag on this
            container itself, so a swipe never opens the slide underneath. */}
        <div className="flex touch-pan-y select-none items-center">
          {slides.map((slide, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {showDots ? (
        <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-1.5 rtl:translate-x-1/2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("home.slide", { number: i + 1 })}
              aria-current={i === idx}
              onClick={() => embla?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
