import axios from "axios";
import { getCurrencies, getCurrencyMeta } from "./appConfig";

/**
 * Storefront currency switching.
 *
 * Amounts are STORED in the store's own currency and converted by the server on
 * the way out — nothing here changes a price, it only changes which currency
 * the next response is denominated in.
 *
 * Two channels, and both are needed:
 *
 *  • `X-Currency` on every XHR. This is the reliable one. A cookie is NOT sent
 *    on a cross-origin XHR unless credentials are enabled, so a theme served
 *    from another origin would silently get store prices without this header.
 *  • the `sf_currency` cookie, set by the server on PUT /currencies. This is
 *    what makes the NEXT full page load boot already converted, instead of
 *    rendering store prices and visibly re-pricing once the SPA hydrates.
 */

const STORAGE_KEY = "sf_currency";

export interface StorefrontCurrency {
  code: string;
  symbol: string;
  decimals: number;
  name_ar: string;
}

/** Everything this store offers. Fewer than two = nothing to switch. */
export function availableCurrencies(): StorefrontCurrency[] {
  try {
    return getCurrencies();
  } catch {
    return [];
  }
}

export function canSwitchCurrency(): boolean {
  return availableCurrencies().length > 1;
}

/** The currency the current page was rendered in. */
export function activeCurrency(): string {
  try {
    return getCurrencyMeta().code;
  } catch {
    return "";
  }
}

/**
 * Attach the stored choice to every subsequent request. Call once at boot,
 * BEFORE the first query — a later call cannot un-fetch data already requested
 * in the wrong currency.
 */
export function initCurrency(): void {
  const stored = readStored();

  if (stored && stored !== activeCurrency()) {
    applyHeader(stored);
  }
}

/**
 * Switch, then reload so the server re-renders every price at once.
 *
 * A reload rather than a refetch on purpose: prices appear in the shell, in
 * cached queries and in components that never refetch, so patching them
 * piecemeal leaves a page showing two currencies at the same time.
 */
export async function switchCurrency(code: string): Promise<void> {
  const allowed = availableCurrencies().some((c) => c.code === code);

  // A code the merchant does not offer would be rejected by the API anyway;
  // failing here keeps the UI honest instead of flashing the wrong symbol.
  if (!allowed || code === activeCurrency()) return;

  applyHeader(code);
  writeStored(code);

  try {
    // Sets the sf_currency cookie so the reload below already boots converted.
    await axios.put("/currencies", { currency: code }, { withCredentials: true });
  } catch {
    // The header + storage still carry the choice for XHRs, so a failed cookie
    // write degrades to "works until the next full page load" rather than
    // leaving the shopper stuck.
  }

  window.location.reload();
}

function applyHeader(code: string): void {
  axios.defaults.headers.common["X-Currency"] = code;
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(code: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode / blocked storage — the cookie still carries it */
  }
}
