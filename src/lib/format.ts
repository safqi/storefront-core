import { getCurrency, getAppLang } from "./appConfig";

/** Active currency code, falling back to empty string if appConfig is absent. */
export function safeCurrency(): string {
  try {
    return getCurrency();
  } catch {
    return "";
  }
}

/** Locale-aware number formatting, defaulting to Arabic when config is missing. */
export function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  let lang = "ar";
  try {
    lang = getAppLang() || "ar";
  } catch {
    /* fall back to ar */
  }
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(n);
}
