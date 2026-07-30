/**
 * Pure helpers for the announcement bar, kept out of the component so they can
 * be tested without a DOM.
 */

/** localStorage key prefix for a dismissed bar. */
export const DISMISS_PREFIX = "sf_announcement_dismissed:";

/**
 * Stable id for a set of messages.
 *
 * Dismissal is remembered against this rather than a fixed key, so editing the
 * copy re-shows the bar to everyone — otherwise a merchant's new announcement
 * would be invisible to every visitor who ever closed the old one.
 */
export function fingerprint(texts: string[]): string {
  let hash = 0;
  const joined = texts.join("|");
  for (let i = 0; i < joined.length; i++) {
    hash = (hash << 5) - hash + joined.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Fill the client-scope variables the server deliberately left in the text.
 *
 * The bar is cached per tenant + locale, so anything per-visitor has to be
 * substituted here. A guest gets an empty string, and the surrounding
 * whitespace is collapsed so the message doesn't read with a hole in it.
 */
export function personalize(text: string, customerName: string): string {
  return text
    .replace(/\{\{\s*customer_name\s*\}\}/gi, customerName)
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** The dismissal key for a set of messages. */
export function dismissKey(texts: string[]): string {
  return DISMISS_PREFIX + fingerprint(texts);
}
