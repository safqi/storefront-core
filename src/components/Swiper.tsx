import { Children, useCallback, useEffect, useRef, useState } from "react";
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
 * A tiny, dependency-free slide carousel — a lighter stand-in for swiper.js.
 * Touch/mouse drag, autoplay (paused while dragging), and clickable dots.
 *
 * Height is intentionally NOT fixed: slides sit in a flex row, so the viewport
 * takes the height of the **tallest** slide and shorter slides are centred. Feed
 * it images as `w-full h-auto` and the banner height follows the natural image
 * size (the tallest of the set) instead of a hard-cropped aspect ratio.
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

  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0); // live px offset while dragging
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [rtl, setRtl] = useState(false);

  const viewport = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const widthRef = useRef(1);
  const moved = useRef(false);

  // Resolve the inherited writing direction once mounted. In RTL the slides
  // flow right-to-left, so the transform sign and the swipe gesture both flip.
  useEffect(() => {
    if (viewport.current) {
      setRtl(getComputedStyle(viewport.current).direction === "rtl");
    }
  }, []);

  const goTo = useCallback((i: number) => setIdx(((i % count) + count) % count), [count]);

  // Autoplay — recreated on idx so the timer restarts after manual navigation,
  // and disabled while the user is dragging.
  useEffect(() => {
    if (!autoPlay || paused || count <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), Math.max(2, interval) * 1000);
    return () => clearInterval(t);
  }, [autoPlay, paused, interval, count, idx]);

  if (count === 0) return null;
  if (count === 1) {
    return <div className={`overflow-hidden ${className}`}>{slides[0]}</div>;
  }

  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    widthRef.current = viewport.current?.offsetWidth ?? 1;
    moved.current = false;
    setPaused(true);
    setAnimate(false);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 8) moved.current = true;
    setDrag(d);
  };

  const onUp = () => {
    if (startX.current === null) return;
    const threshold = Math.max(40, widthRef.current * 0.15);
    // LTR: drag left → next. RTL is mirrored: drag right → next.
    const next = rtl ? drag >= threshold : drag <= -threshold;
    const prev = rtl ? drag <= -threshold : drag >= threshold;
    if (next) goTo(idx + 1);
    else if (prev) goTo(idx - 1);
    startX.current = null;
    setDrag(0);
    setAnimate(true);
    setPaused(false);
  };

  // Swallow the click that follows a real drag so a swipe never opens the slide.
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  };

  // RTL flex lays slide 0 at the right with later slides to its left, so the
  // track moves in the opposite direction to reveal the next slide.
  const transform = `translateX(calc(${(rtl ? 1 : -1) * idx * 100}% + ${drag}px))`;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        ref={viewport}
        className={`flex touch-pan-y select-none items-center ${animate ? "transition-transform duration-300 ease-out" : ""}`}
        style={{ transform }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-full shrink-0">
            {slide}
          </div>
        ))}
      </div>

      {showDots ? (
        <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-1.5 rtl:translate-x-1/2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("home.slide", { number: i + 1 })}
              aria-current={i === idx}
              onClick={() => goTo(i)}
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
