/**
 * Scroll-to-top-on-navigation — the framework-free half.
 *
 * `<BrowserRouter>` + `<Routes>` is not a data router, so react-router's own
 * `<ScrollRestoration>` is unavailable here; the storefront hand-rolls the
 * behaviour in `<ScrollToTop />` and keeps the decision itself in this pure
 * function so it can be tested without a DOM (same split as dragScroll.ts).
 */

export type NavigationKind = "PUSH" | "REPLACE" | "POP";

export interface ScrollDecision {
  /** Pathname the shopper is leaving (undefined on the very first render). */
  from: string | undefined;
  /** Pathname now being rendered. */
  to: string;
  /** `location.hash`, including the leading "#" (empty when there is none). */
  hash: string;
  /** react-router's navigation type for this transition. */
  navigationType: NavigationKind;
}

/**
 * Should this navigation jump the window back to the top?
 *
 * Yes for an ordinary forward navigation to a different page. No when:
 *
 *  - it is a **POP** (back/forward) — the browser restores the previous offset
 *    itself via `history.scrollRestoration`, and stomping it is exactly the
 *    "lost my place in the list" bug;
 *  - the URL carries a **hash** — the shopper asked for an in-page anchor;
 *  - the **pathname did not change** — a query-string edit (filters, sort,
 *    pagination, a currency switch) leaves the shopper on the same screen, and
 *    yanking them upward mid-interaction is worse than staying put;
 *  - it is the **first render** (`from === undefined`) — the document has only
 *    just loaded, and a reload's restored offset is the browser's to own.
 */
export function shouldScrollToTop({ from, to, hash, navigationType }: ScrollDecision): boolean {
  if (navigationType === "POP") return false;
  if (hash) return false;
  if (from === undefined) return false;
  return from !== to;
}
