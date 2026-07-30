/**
 * Returns the full appConfig object injected by the server into window.appConfig.
 * Throws in development if window.appConfig is missing.
 */
export function getAppConfig(): AppConfig {
  if (!window.appConfig) {
    throw new Error(
      "[appConfig] window.appConfig is not defined. Make sure the Blade template injects it before the app loads."
    );
  }
  return window.appConfig;
}

// ─── Individual field helpers ─────────────────────────────────────────────────

/** Base URL for all API requests, e.g. "https://tenant.example.com/api/v1" */
export const getApiUrl = (): string => getAppConfig().API_URL;

/**
 * Absolute URL for an installed app's endpoint.
 *
 * App routes live at `/api/apps/{slug}/…`, a SIBLING of the versioned catalog
 * base (`/api/v1`) that axios.defaults.baseURL points at — so a relative path
 * would resolve under `/api/v1` and 404.
 */
export const getAppApiUrl = (slug: string, path = ""): string => {
  const base = getApiUrl().replace(/\/v\d+\/?$/, "");
  const tail = path.replace(/^\/+/, "");

  return `${base}/apps/${slug}${tail ? `/${tail}` : ""}`;
};

/**
 * True only when the storefront is rendered inside the admin theme-builder
 * preview iframe (served from /admin/theme/preview). Used to pick a URL-agnostic
 * router so the SPA boots at the homepage instead of 404-ing on the admin path.
 */
export const getIsPreview = (): boolean => getAppConfig().preview === true;

/** Active locale code, e.g. "ar" or "en" */
export const getAppLang = (): string => getAppConfig().APP_LANG;

/** Document direction driven by locale */
export const getAppDir = (): "ltr" | "rtl" => getAppConfig().APP_DIR;

/** Languages the shopper may switch between (source + tenant-enabled targets). */
export const getLocaleOptions = (): AppLocaleOption[] => getAppConfig().LOCALES ?? [];

/** Tenant display name */
export const getAppName = (): string => getAppConfig().APP_NAME;

/** Tenant logo image URL */
export const getAppLogo = (): string => getAppConfig().APP_LOGO;

/** Tenant phone number (may be empty string) */
export const getAppPhone = (): string => getAppConfig().APP_PHONE;

/** Tenant textual address (may be empty/null) */
export const getAppLocation = (): string => getAppConfig().APP_LOCATION ?? "";

/** Active currency code, e.g. "YER" */
export const getCurrency = (): string => getAppConfig().CURRENCY;

/** Active plan info injected by the server */
export const getPlan = (): AppPlan => getAppConfig().plan;

/** Active storefront theme (slug + pattern + tenant settings) */
export const getTheme = (): AppTheme => getAppConfig().theme;

/** Active pattern slug, e.g. "glass" or "minimal" */
export const getThemePattern = (): string => getTheme().pattern ?? "glass";

/** Tenant theme settings map (already merged with manifest defaults server-side) */
export const getThemeSettings = (): Record<string, unknown> => getTheme().settings ?? {};

/** Read one theme setting with a fallback when unset. */
export const getThemeSetting = <T>(key: string, fallback: T): T => {
  const value = getThemeSettings()[key];
  return (value === undefined || value === null ? fallback : value) as T;
};

/**
 * Site-wide announcement bar. Disabled by default so an older backend (which
 * ships no `announcement` key) simply renders nothing.
 */
export const getAnnouncement = (): AppAnnouncement =>
  getTheme().announcement ?? {
    enabled: false,
    position: "top",
    speed: 24,
    pause_on_hover: true,
    dismissible: true,
    mobile_sheet: true,
    bg: "#111827",
    fg: "#ffffff",
    messages: [],
  };

/** Homepage sections (ordered, enabled) + bottom-bar config. */
export const getHomepage = (): AppHomepage => getAppConfig().homepage;

/** Ordered enabled homepage sections. */
export const getHomepageSections = (): AppHomepageSection[] => getAppConfig().homepage?.sections ?? [];

/** Bottom-bar config (tabs + show_labels). */
export const getBottomBar = (): AppHomepage["bottomBar"] =>
  getAppConfig().homepage?.bottomBar ?? { show_labels: true, tabs: [] };

// ─── Installed apps ───────────────────────────────────────────────────────────

/** Apps installed for this tenant (server-injected). Empty when none. */
export const getInstalledApps = (): InstalledApp[] => getAppConfig().apps ?? [];

/**
 * Whether an app is installed for this tenant. Themes gate every app surface
 * (data fetches, routes, nav) on this so uninstalled apps fire zero requests —
 * the app's storefront endpoints 404 when not installed, so never probe them.
 */
export const isAppInstalled = (slug: string): boolean =>
  getInstalledApps().some((app) => app.slug === slug);

/**
 * Storefront nav entries declared by installed apps, rendered generically by the
 * header — no per-app hardcoding. Only apps that declare a `nav` appear.
 */
export const getAppNavEntries = (): Array<InstalledAppNav & { slug: string }> =>
  getInstalledApps()
    .filter((app): app is InstalledApp & { nav: InstalledAppNav } => !!app.nav)
    .map((app) => ({ slug: app.slug, ...app.nav }));
