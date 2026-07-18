/**
 * @safqi/storefront-core — the shared, versioned core every Safqi storefront
 * theme is built on. It owns the *behavior* (data/API client, auth, cart,
 * i18n, formatting, the theme-token engine) and the *contract* (the API +
 * window.appConfig types), plus a handful of design-free leaf components and
 * the boot/build glue. A theme depends on this package and owns only its
 * presentation (tokens, chrome, cards, section markup, pages).
 *
 * Bump this package's version to fix/extend the core once; every theme floats
 * on `^1` and picks it up with `npm update && npm run build`.
 */

// --- boot + build ---
export { bootStorefront } from "./boot";
export type { BootOptions } from "./boot";

// --- capabilities (single source for the generated THEME-REFERENCE) ---
export { ENDPOINTS, PATTERNS, SECTION_TYPES, CORE_VERSION } from "./capabilities";
export type { EndpointGroup, EndpointSpec } from "./capabilities";

// --- appConfig reader (the only reader of window.appConfig) ---
export * from "./lib/appConfig";

// --- data / API ---
export * from "./lib/api";
export * from "./lib/commerce";
export { queryClient } from "./lib/queryClient";

// --- auth + cart ---
export { AuthProvider, useAuth } from "./lib/auth";
export { useCart } from "./lib/useCart";

// --- i18n + formatting + status ---
export { t, lang } from "./lib/i18n";
export type { Dict } from "./lib/i18n";
export { formatMoney, safeCurrency } from "./lib/format";
export { orderStatusLabel, paymentStatusLabel, statusTone } from "./lib/orderStatus";

// --- theme token engine ---
export { applyThemeSettings } from "./lib/themeSettings";

// --- generic hooks ---
export { useTheme } from "./lib/useTheme";
export type { Theme } from "./lib/useTheme";
export { useHideOnScroll } from "./lib/useHideOnScroll";

// --- icon registry ---
export { ICONS, resolveIcon } from "./lib/iconMap";
export type { IconName } from "./lib/iconMap";

// --- design-free leaf components ---
export { Icon } from "./components/Icon";
export { SolarIcon } from "./components/SolarIcon";
export { ErrorState, EmptyState } from "./components/States";
export type { ErrorStateProps, EmptyStateProps } from "./components/States";
export { default as Swiper } from "./components/Swiper";
export { default as RequireAuth } from "./components/RequireAuth";

// --- types (API + storefront contract) ---
export * from "./types/product";
export * from "./types/catalog";
export * from "./types/commerce";
