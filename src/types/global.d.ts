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
  }

  interface AppHomepageSection {
    id: number;
    type: string;
    title?: string | null;
    config: Record<string, unknown>;
  }

  interface AppBottomBarTab {
    key: string;
    label: string;
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
