import { lang, t } from "./i18n";

/**
 * The "sold N times" badge text for a product, or `null` when there is nothing
 * to show.
 *
 * The backend already applies the store's visibility rule (off / always /
 * "only from N sales") and sends `sold_count: null` when the badge is hidden,
 * so a theme only has to render whatever this returns:
 *
 *   const sold = soldCountLabel(product.sold_count);
 *   {sold ? <Badge>{sold}</Badge> : null}
 *
 * Pluralised through `Intl.PluralRules` — Arabic alone needs one/two/few/many
 * ("مرة واحدة" · "مرتين" · "3 مرات" · "11 مرة") — reading the
 * `product.sold.{category}` keys and falling back to `product.sold.other`.
 */
export function soldCountLabel(count: number | null | undefined): string | null {
  if (count == null || !Number.isFinite(count) || count < 1) return null;

  const category = pluralRules().select(count);
  const vars = { count: formatCount(count) };
  const key = `product.sold.${category}`;
  const label = t(key, vars);

  // t() hands back the key itself for a category this locale doesn't define.
  return label === key ? t("product.sold.other", vars) : label;
}

let rules: Intl.PluralRules | undefined;

function pluralRules(): Intl.PluralRules {
  rules ??= new Intl.PluralRules(safeLocale());
  return rules;
}

function formatCount(count: number): string {
  return new Intl.NumberFormat(safeLocale()).format(count);
}

function safeLocale(): string {
  try {
    return Intl.getCanonicalLocales(lang || "ar")[0];
  } catch {
    return "ar";
  }
}
