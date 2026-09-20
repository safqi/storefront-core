import { getCurrency, getAppLang, getCurrencyMeta } from "./appConfig";

/** Active currency code, falling back to empty string if appConfig is absent. */
export function safeCurrency(): string {
  try {
    return getCurrency();
  } catch {
    return "";
  }
}

/** The active currency's symbol (e.g. "﷼"), falling back to its code. */
export function currencySymbol(): string {
  try {
    return getCurrencyMeta().symbol;
  } catch {
    return safeCurrency();
  }
}

/**
 * Locale-aware number formatting, defaulting to Arabic when config is missing.
 *
 * Returns the NUMBER ONLY — call sites append the currency themselves, and
 * have done since this was written. Use `formatPrice` for number + symbol.
 */
export function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  let lang = "ar";
  try {
    lang = getAppLang() || "ar";
  } catch {
    /* fall back to ar */
  }
  let decimals = 2;
  try {
    decimals = getCurrencyMeta().decimals ?? 2;
  } catch {
    /* fall back to 2 */
  }
  return new Intl.NumberFormat(lang, { maximumFractionDigits: decimals }).format(n);
}

/**
 * Number + the active currency's SYMBOL, e.g. "1,500 ﷼".
 *
 * Prefer this over `formatMoney(x) + " " + safeCurrency()`, which renders the
 * raw code ("1,500 YER") because appConfig.CURRENCY is a code, not a symbol.
 */
export function formatPrice(value: string | number): string {
  const symbol = currencySymbol();
  const amount = formatMoney(value);

  return symbol ? `${amount} ${symbol}` : amount;
}
