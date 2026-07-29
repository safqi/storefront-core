/**
 * Machine-readable description of what a storefront theme can consume and
 * render. This is the SINGLE SOURCE that `create-safqi-theme` reads to emit a
 * theme's `THEME-REFERENCE.md` + `capabilities.json`, so those never drift from
 * the runtime. Keep it in sync with the backend contract in
 * `docs/integration-guide.md` and `theme.config.json`.
 */

/** Semver of this core; recorded by themes so drift against basic is detectable. */
export const CORE_VERSION = "1.1.0";

export interface EndpointSpec {
  /** Path relative to the tenant API base (window.appConfig.API_URL, .../api/v1). */
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  summary: string;
  /** Core helper that wraps it, if any. */
  helper?: string;
  /** Requires an authenticated shopper (Sanctum bearer). */
  auth?: boolean;
}

export interface EndpointGroup {
  group: string;
  /** Base namespace: "v1" = /api/v1/*, "app" = /api/apps/{slug}/*. */
  base: "v1" | "app";
  endpoints: EndpointSpec[];
}

/** The full storefront endpoint catalog a theme may call (via the core helpers). */
export const ENDPOINTS: EndpointGroup[] = [
  {
    group: "Bootstrap",
    base: "v1",
    endpoints: [
      { path: "storefront/bootstrap", method: "GET", summary: "Full window.appConfig payload as JSON (API base + tenant profile + theme/homepage/apps/plan). Used by the standalone dev server to hydrate config; the core fetches it automatically in DEV." },
    ],
  },
  {
    group: "Catalog",
    base: "v1",
    endpoints: [
      { path: "products", method: "GET", summary: "Paginated product list (sort/category/brand/attributes filters)", helper: "fetchProducts" },
      { path: "products/{slug}", method: "GET", summary: "Single product detail", helper: "fetchProduct" },
      { path: "categories", method: "GET", summary: "Category tree", helper: "fetchCategories" },
      { path: "brands", method: "GET", summary: "Brand list", helper: "fetchBrands" },
      { path: "filters", method: "GET", summary: "Facets for the filter drawer", helper: "fetchFilters" },
    ],
  },
  {
    group: "Auth (passwordless OTP)",
    base: "v1",
    endpoints: [
      { path: "auth/otp/request", method: "POST", summary: "Send WhatsApp OTP", helper: "requestOtp" },
      { path: "auth/otp/verify", method: "POST", summary: "Verify OTP → Sanctum token", helper: "verifyOtp" },
      { path: "auth/me", method: "GET", summary: "Current shopper", helper: "fetchMe", auth: true },
      { path: "auth/logout", method: "POST", summary: "Revoke token", helper: "logoutRequest", auth: true },
      { path: "account/locale", method: "PATCH", summary: "Persist UI language", helper: "updateLocale", auth: true },
    ],
  },
  {
    group: "Cart & coupons",
    base: "v1",
    endpoints: [
      { path: "cart", method: "GET", summary: "Current cart", helper: "fetchCart" },
      { path: "cart/items", method: "POST", summary: "Add item", helper: "addCartItem" },
      { path: "cart/items/{id}", method: "PATCH", summary: "Update quantity", helper: "updateCartItem" },
      { path: "cart/items/{id}", method: "DELETE", summary: "Remove item", helper: "removeCartItem" },
      { path: "cart", method: "DELETE", summary: "Clear cart", helper: "clearCart" },
      { path: "cart/coupon", method: "POST", summary: "Apply coupon", helper: "applyCoupon" },
      { path: "cart/coupon", method: "DELETE", summary: "Remove coupon", helper: "removeCoupon" },
    ],
  },
  {
    group: "Addresses & geo",
    base: "v1",
    endpoints: [
      { path: "addresses", method: "GET", summary: "List addresses", helper: "fetchAddresses", auth: true },
      { path: "addresses", method: "POST", summary: "Create address", helper: "createAddress", auth: true },
      { path: "addresses/{id}", method: "PATCH", summary: "Update address", helper: "updateAddress", auth: true },
      { path: "addresses/{id}", method: "DELETE", summary: "Delete address", helper: "deleteAddress", auth: true },
      { path: "geo/cities", method: "GET", summary: "Cities", helper: "fetchCities" },
      { path: "geo/districts", method: "GET", summary: "Districts for a city", helper: "fetchDistricts" },
      { path: "geo/resolve", method: "GET", summary: "Resolve lat/lng → city+district", helper: "resolveGeo" },
    ],
  },
  {
    group: "Checkout, shipping & payments",
    base: "v1",
    endpoints: [
      { path: "shipping/options", method: "GET", summary: "Shipping methods for the cart", helper: "fetchShippingOptions", auth: true },
      { path: "payment/methods", method: "GET", summary: "Enabled payment methods", helper: "fetchPaymentMethods" },
      { path: "checkout", method: "POST", summary: "Place order", helper: "checkout", auth: true },
      { path: "orders/{id}/pay", method: "POST", summary: "Pay for an order", helper: "payOrder", auth: true },
    ],
  },
  {
    group: "Orders, downloads & memberships",
    base: "v1",
    endpoints: [
      { path: "orders", method: "GET", summary: "Order history", helper: "fetchOrders", auth: true },
      { path: "orders/{id}", method: "GET", summary: "Order detail", helper: "fetchOrder", auth: true },
      { path: "account/downloads", method: "GET", summary: "Digital deliverables", helper: "fetchDownloads", auth: true },
      { path: "account/memberships", method: "GET", summary: "Fitness/membership grants", helper: "fetchMemberships", auth: true },
    ],
  },
  {
    group: "Installed apps",
    base: "app",
    endpoints: [
      { path: "{slug}/*", method: "GET", summary: "App-owned endpoints (only for apps in window.appConfig.apps — gate with isAppInstalled)" },
    ],
  },
];

/** Design "patterns" a runtime theme ships (folder per pattern under src/patterns). */
export const PATTERNS = [
  { slug: "glass", name: "Glass", description: "Apple-inspired liquid-glass — the default." },
  { slug: "minimal", name: "Minimal", description: "Flat, high-contrast, whisper-tinted neutrals." },
] as const;

/** Homepage section types the theme's SectionRenderer must handle. */
export const SECTION_TYPES = [
  { type: "hero", name: "Hero", description: "Full-width landing banner." },
  { type: "product_grid", name: "Product grid", description: "Responsive grid of products by sort/category/brand." },
  { type: "product_swipe", name: "Product swipe", description: "Horizontal product rail." },
  { type: "categories", name: "Categories", description: "Category strip." },
  { type: "brands", name: "Brands", description: "Brand strip." },
  { type: "banner_grid", name: "Banner grid", description: "Grid of promo banners." },
  { type: "banner_swipe", name: "Banner swipe", description: "Carousel of promo banners." },
] as const;
