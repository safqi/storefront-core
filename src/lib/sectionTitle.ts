/**
 * Section title position — the merchant's «موضع العنوان» choice
 * (`config.title_position`: `top|bottom` × `start|center|end`, or "" = the
 * theme's own design).
 *
 * The position is expressed as two data attributes on the `<section>` and the
 * class `sf-head` on its head element; base.css does the rest (order, flex
 * direction, alignment). That keeps it theme-agnostic: a theme only spreads
 * `titlePositionAttrs(config)` on its section wrapper and marks its head —
 * every theme (and marketplace themes) gets all six positions for free.
 */

export type TitleVertical = "top" | "bottom";
export type TitleAlign = "start" | "center" | "end";

export interface TitlePosition {
  vertical: TitleVertical;
  align: TitleAlign;
}

const VERTICALS: TitleVertical[] = ["top", "bottom"];
const ALIGNS: TitleAlign[] = ["start", "center", "end"];

/** Parse `"bottom-center"`; null for "" / unknown (= follow the theme). */
export function parseTitlePosition(value: unknown): TitlePosition | null {
  if (typeof value !== "string" || !value.includes("-")) return null;
  const [vertical, align] = value.split("-") as [TitleVertical, TitleAlign];
  return VERTICALS.includes(vertical) && ALIGNS.includes(align) ? { vertical, align } : null;
}

/**
 * Attributes to spread on a section's root element. Empty when the merchant
 * left it on «تلقائي», so the theme's own head design is untouched.
 */
export function titlePositionAttrs(
  config: Record<string, unknown> | string | null | undefined,
): { "data-title-v"?: TitleVertical; "data-title-align"?: TitleAlign } {
  const raw = typeof config === "string" || config == null ? config : config.title_position;
  const pos = parseTitlePosition(raw);
  return pos ? { "data-title-v": pos.vertical, "data-title-align": pos.align } : {};
}
