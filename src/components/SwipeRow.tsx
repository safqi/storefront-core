import type { ReactNode } from "react";
import { useDragScroll } from "../lib/useDragScroll";
import type { DragScrollOptions } from "../lib/useDragScroll";

export interface SwipeRowProps extends DragScrollOptions {
  /** The slides/cards. Give each a fixed width (`w-48 shrink-0`) so the row scrolls. */
  children: ReactNode;
  /** Applied to the scroll container, on top of the base layout classes. */
  className?: string;
  /** Gap utility between items. Default `gap-4`. */
  gap?: string;
  /**
   * Snap each item to the start edge as the row settles. Default true — turn it
   * off for a free-scrolling rail (e.g. gallery thumbnails).
   */
  snap?: boolean;
  /** Hide the horizontal scrollbar. Default true (the drag affordance replaces it). */
  hideScrollbar?: boolean;
  ariaLabel?: string;
}

/**
 * A horizontal rail you can throw with a finger **or** a mouse.
 *
 * This is a thin wrapper over `useDragScroll` for new markup; existing
 * `overflow-x-auto` strips don't need it — attach the hook's ref to what you
 * already have and they gain the same gesture.
 *
 * Scrolling itself stays native, so touch momentum, the wheel, keyboard and CSS
 * scroll-snap all behave exactly as the browser intends; the hook only adds the
 * mouse gesture the platform is missing. See `useDragScroll` for why.
 *
 * ```tsx
 * <SwipeRow ariaLabel={t("home.newArrivals")}>
 *   {products.map((p) => (
 *     <div key={p.id} className="w-48 shrink-0">
 *       <ProductCard product={p} />
 *     </div>
 *   ))}
 * </SwipeRow>
 * ```
 *
 * Snap alignment is applied to the children by the `.sf-swipe-row` rule in
 * base.css (`> * { scroll-snap-align: start }`) rather than by cloning them —
 * so callers never have to remember `snap-start` on every card, and a child can
 * still opt out with its own `scroll-snap-align`.
 */
export default function SwipeRow({
  children,
  className = "",
  gap = "gap-4",
  snap = true,
  hideScrollbar = true,
  ariaLabel,
  ...drag
}: SwipeRowProps) {
  const ref = useDragScroll<HTMLDivElement>(drag);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      // `touch-pan-x` keeps vertical page scrolling working when the gesture
      // starts on the rail — without it a downward swipe on a product shelf
      // traps the page.
      className={[
        "sf-swipe-row flex touch-pan-x overflow-x-auto overscroll-x-contain",
        gap,
        snap ? "snap-x snap-mandatory" : "",
        hideScrollbar ? "sf-no-scrollbar" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
