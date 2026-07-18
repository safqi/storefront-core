import { getAppLang } from "./appConfig";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import { ku } from "./locales/ku";
import { fr } from "./locales/fr";
import { tr } from "./locales/tr";

/**
 * Tiny storefront i18n. UI copy lives in per-locale dictionaries keyed by dot
 * paths (e.g. "cart.empty"); `t()` reads the active language injected by the
 * server into window.appConfig (APP_LANG) and falls back gracefully so a
 * missing key never renders blank:
 *
 *   active locale → English → Arabic (source) → the key itself.
 *
 * There is no runtime switch — the whole SPA is served in one language per
 * page load (the shopper picks it on the profile page, which reloads). So the
 * active locale is resolved once at module load.
 */

export type Dict = Record<string, string>;

const DICTS: Record<string, Dict> = { ar, en, ku, fr, tr };

// Resolved once — a language change is a full reload (see AccountPage chooser).
const LANG = getAppLang();

/** Ordered dictionaries to consult for a key: active → en → ar. */
const CHAIN: Dict[] = [
  DICTS[LANG] ?? {},
  DICTS.en,
  DICTS.ar,
];

/**
 * Translate a dot-keyed string. Interpolates `{name}` placeholders from `vars`.
 * Unknown keys return the key itself (visible in dev, harmless in prod).
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let template: string | undefined;
  for (const dict of CHAIN) {
    if (key in dict) {
      template = dict[key];
      break;
    }
  }

  const out = template ?? key;

  if (!vars) return out;

  return out.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** The active storefront language code (e.g. "ar", "en"). */
export const lang = LANG;
