export {};

declare global {
  interface AppPlan {
    name: string;
    slug: string;
    features: Record<string, unknown>;
    is_active: boolean;
    is_trial: boolean;
    trial_ends_at: string;
  }

  interface AppTheme {
    slug: string;
    /** Runtime theme whose bundle renders this theme (self for runtime themes,
     *  the extended theme for variants). */
    runtime?: string;
    pattern: string;
    settings: Record<string, unknown>;
    /** URL of a variant's tokens.css overlay; null/absent for runtime themes. */
    tokens_url?: string | null;
    /** Site-wide announcement bar. Absent on an older backend. */
    announcement?: AppAnnouncement;
  }

  interface AppAnnouncementMessage {
    /**
     * Already resolved for the active locale, with the server-scope variables
     * substituted. May still contain client-scope tokens like
     * `{{customer_name}}` — <AnnouncementBar/> fills those per visitor.
     */
    text: string;
    /** Resolved href; "" means the message isn't clickable. */
    href: string;
  }

  interface AppAnnouncement {
    enabled: boolean;
    position: "top" | "bottom";
    /** Seconds for one full marquee loop — higher is slower. */
    speed: number;
    pause_on_hover: boolean;
    dismissible: boolean;
    /** On mobile, a bottom bar floats above the tab bar instead of sticking flush. */
    mobile_sheet: boolean;
    bg: string;
    fg: string;
    messages: AppAnnouncementMessage[];
  }

  interface AppHomepageSection {
    id: number;
    type: string;
    /**
     * The merchant's own title, already resolved for the active locale by the
     * server — null when they never set one. Render `title ?? t(title_key)`.
     */
    title?: string | null;
    /** i18n key for the theme's default title, e.g. "home.featured". */
    title_key?: string | null;
    config: Record<string, unknown>;
  }

  interface AppBottomBarTab {
    key: string;
    /**
     * The merchant's own label, already resolved for the active locale by the
     * server — null when they never overrode the theme default. A theme must
     * render `label ?? t(label_key)`, never `label` alone, or an untranslated
     * string leaks into every language.
     */
    label: string | null;
    /** i18n key for the theme's default label, e.g. "nav.home". */
    label_key?: string | null;
    icon: string;
    icon_linear: string;
    icon_active: string;
    href: string;
    enabled: boolean;
  }

  interface AppHomepage {
    sections: AppHomepageSection[];
    bottomBar: {
      show_labels: boolean;
      tabs: AppBottomBarTab[];
    };
  }

  interface AppLocaleOption {
    code: string;
    /** Native language name, e.g. "English", "کوردی". */
    label: string;
    dir: "ltr" | "rtl";
  }

  /** A storefront nav link an installed app declares in its manifest. */
  interface InstalledAppNav {
    label: string;
    path: string;
    icon: string;
    iconActive?: string | null;
  }

  /** An app installed for this tenant, as exposed to the theme. */
  interface InstalledApp {
    slug: string;
    /** Present only when the app declares a storefront nav entry. */
    nav?: InstalledAppNav;
  }

  interface AppConfig {
    API_URL: string;
    APP_LANG: string;
    APP_DIR: "ltr" | "rtl";
    /** Languages the shopper may switch between (source + tenant-enabled). */
    LOCALES: AppLocaleOption[];
    APP_NAME: string;
    APP_LOGO: string;
    APP_PHONE: string;
    APP_LOCATION?: string | null;
    CURRENCY: string;
    plan: AppPlan;
    theme: AppTheme;
    homepage: AppHomepage;
    /** Apps installed for this tenant; the theme renders/queries only these. */
    apps?: InstalledApp[];
    /** True only when served by the admin theme-builder preview iframe. */
    preview?: boolean;
    [key: string]: unknown;
  }

  interface Window {
    appConfig: AppConfig;
  }
}
