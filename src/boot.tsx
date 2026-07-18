import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import axios from "axios";
import { getApiUrl, getIsPreview } from "./lib/appConfig";
import { applyThemeSettings } from "./lib/themeSettings";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./lib/auth";

export interface BootOptions {
  /**
   * The theme's app tree — typically a `<Routes>…</Routes>` element. It renders
   * inside the core providers (QueryClient → Router → Auth), so route elements
   * and pages can use react-router, react-query, `useAuth`, and the API helpers
   * out of the box.
   */
  children: ReactNode;
  /** DOM node id to mount into. Defaults to "root". */
  rootId?: string;
}

/**
 * Boot a Safqi storefront theme. This is the whole of what every theme's
 * `main.tsx` used to hand-roll, centralised so a fix ships to all themes with a
 * core version bump:
 *
 *  1. point axios at the tenant API base (window.appConfig.API_URL);
 *  2. apply the tenant's theme settings (accent, font, …) before first paint;
 *  3. in the admin theme-builder preview iframe, listen for live-settings
 *     postMessages (same-origin + namespaced) and re-apply them with no reload;
 *  4. mount under StrictMode → QueryClientProvider → Router → AuthProvider,
 *     using MemoryRouter in preview (served off a non-storefront path) and
 *     BrowserRouter live.
 *
 * The theme keeps its own presentation: import "./index.css" and pass its route
 * tree as `children`.
 *
 * `window.appConfig` must exist before the bundle runs (some modules read it at
 * import time, e.g. i18n's active language). In production the Blade shell injects
 * it; in a standalone `npm run dev` the `defineThemeConfig` dev server injects the
 * same object into index.html server-side (fetched from VITE_STORE_ORIGIN), so
 * this function stays a plain synchronous boot in both cases.
 */
export function bootStorefront({ children, rootId = "root" }: BootOptions): void {
  axios.defaults.baseURL = getApiUrl();
  axios.defaults.headers.common.Accept = "application/json";

  applyThemeSettings();

  const preview = getIsPreview();
  if (preview) {
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== "safqi-theme-preview") return;
      if (data.type === "settings" && data.settings) {
        applyThemeSettings(data.settings as Record<string, unknown>);
      }
    });
  }

  const mount = document.getElementById(rootId);
  if (!mount) throw new Error(`bootStorefront: #${rootId} not found`);

  const tree = <AuthProvider>{children}</AuthProvider>;

  createRoot(mount).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {preview ? (
          <MemoryRouter initialEntries={["/"]}>{tree}</MemoryRouter>
        ) : (
          <BrowserRouter>{tree}</BrowserRouter>
        )}
      </QueryClientProvider>
    </StrictMode>,
  );
}
