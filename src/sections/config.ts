/**
 * Shared config accessors for the core section renderers.
 *
 * A section's `config` is an untyped bag whose shape is declared server-side in
 * `config/theme_sections.php`, so every read goes through `cfg()` with an
 * explicit fallback — a missing key is normal (an older tenant row predating a
 * new field), never an error.
 */

/** Read a section config value with a fallback. */
export function cfg<T>(config: Record<string, unknown>, key: string, fallback: T): T {
  const v = config[key];
  return v === undefined || v === null ? fallback : (v as T);
}

/** Read a config value as a trimmed string ("" when unset). */
export function str(config: Record<string, unknown>, key: string): string {
  const v = config[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Read a repeater field as an array of rows. */
export function rows<T = Record<string, unknown>>(config: Record<string, unknown>, key: string): T[] {
  const v = config[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Static column-class lookups.
 *
 * Tailwind's JIT scans source text, so `grid-cols-${n}` is never emitted. These
 * maps are the reason a merchant-chosen column count actually renders.
 */
export const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export const DESKTOP_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

export function gridClass(mobile: number, desktop: number): string {
  return `${COLS[mobile] ?? "grid-cols-2"} ${DESKTOP_COLS[desktop] ?? "md:grid-cols-4"}`;
}
