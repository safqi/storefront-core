import { useEffect, useRef, useState } from "react";

/**
 * Smart hide-on-scroll. Hides the bar when scrolling down and reveals it when
 * scrolling up — but only after the scroll moves more than `threshold` pixels
 * in one direction, so small jitters don't flip it. The same threshold means
 * scrolling back up has to travel ~`threshold`px before the bar reappears.
 *
 * Returns `true` when the bar should be hidden.
 */
export function useHideOnScroll(threshold = 20): boolean {
  const [hidden, setHidden] = useState(false);
  const anchorY = useRef(0);

  useEffect(() => {
    anchorY.current = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - anchorY.current;

      // Wait until the scroll has accumulated `threshold`px before reacting.
      if (Math.abs(delta) < threshold) return;

      setHidden(delta > 0 && y > threshold); // down → hide, up → show
      anchorY.current = y;
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
