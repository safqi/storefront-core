import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { shouldScrollToTop, type NavigationKind } from "../lib/scrollTop";

/**
 * Resets the window scroll on every forward route change.
 *
 * Without this a client-side navigation keeps the previous page's scroll
 * offset, so tapping a product half-way down a category listing opens the
 * product page already scrolled past its own gallery. The browser only resets
 * the offset for real document loads; an SPA has none.
 *
 * Mounted by `bootStorefront()` inside the Router, so every theme — including
 * external marketplace ones — gets it with no code of its own. `behavior:
 * "instant"` is mandatory, not a style choice: every theme sets
 * `scroll-behavior: smooth` on <html>, which would otherwise turn each
 * navigation into a visible seconds-long scroll animation up the old page.
 *
 * See `shouldScrollToTop` for when it deliberately stays put (back/forward,
 * in-page anchors, query-string-only changes).
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType() as NavigationKind;
  // Undefined until the first effect runs, which is how the initial render is
  // recognised and skipped — a reload's restored offset belongs to the browser.
  const previous = useRef<string | undefined>(undefined);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;

    if (!shouldScrollToTop({ from, to: pathname, hash, navigationType })) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}

export default ScrollToTop;
