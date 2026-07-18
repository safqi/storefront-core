import { defineConfig, loadEnv, type Plugin, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import laravel from "laravel-vite-plugin";
import { fileURLToPath, URL } from "node:url";
import http from "node:http";
import https from "node:https";

/**
 * Fetch the storefront bootstrap payload (the window.appConfig twin) from a
 * running store, server-side from the Vite dev process. `rejectUnauthorized:
 * false` accepts local self-signed TLS (Herd/Valet `.test` certs Node won't
 * trust) so an HTTPS store origin works out of the box.
 */
function fetchStorefrontConfig(origin: string): Promise<Record<string, unknown>> {
  const url = new URL("/api/v1/storefront/bootstrap", origin);
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      { rejectUnauthorized: false, headers: { Accept: "application/json" } },
      (res) => {
        const status = res.statusCode ?? 500;
        if (status >= 400) {
          res.resume();
          reject(new Error(`GET ${url.href} → ${status}`));
          return;
        }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body) as Record<string, unknown>);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
  });
}

/**
 * Dev-only Vite plugin that injects `window.appConfig` into index.html
 * server-side — exactly what the production Blade shell does — so it exists
 * BEFORE the bundle runs (some modules read it at import time, e.g. the active
 * language). It fetches the payload from VITE_STORE_ORIGIN and rewrites API_URL
 * to the local proxied `/api/v1` so runtime requests stay same-origin (no CORS).
 */
function storefrontConfigInjector(storeOrigin: string): Plugin {
  return {
    name: "safqi:storefront-config-injector",
    apply: "serve",
    transformIndexHtml: {
      order: "pre",
      async handler() {
        try {
          const config = await fetchStorefrontConfig(storeOrigin);
          config.API_URL = "/api/v1";
          return [
            {
              tag: "script",
              children: `window.appConfig=${JSON.stringify(config)};`,
              injectTo: "head-prepend",
            },
          ];
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(
            `[safqi] Could not load window.appConfig from VITE_STORE_ORIGIN=${storeOrigin}. ` +
              `Is that store running and reachable? Cause: ${message}`,
          );
        }
      },
    },
  };
}

export interface ThemeConfigOptions {
  /** Theme slug — sets the Laravel build dir to `build/themes/{slug}`. */
  slug: string;
  /**
   * The theme's `vite.config.ts` `import.meta.url`, so the preset can resolve
   * the theme directory (root + the `@` alias) without hardcoding paths.
   */
  rootUrl: string;
  /** Entry point. Defaults to "src/main.tsx". */
  input?: string;
  /**
   * Where built assets land, relative to the theme dir. Defaults to
   * "../../public" (the Laravel app's public/ when a theme lives in themes/*).
   * A standalone theme repo passes "." so the build stays inside the repo.
   */
  publicDirectory?: string;
  /**
   * Output subfolder under `publicDirectory` (also the manifest's base).
   * Defaults to "build/themes/{slug}" for an in-repo theme. A standalone repo
   * passes "dist" so the marketplace builder finds it via `dist_dirs` and copies
   * its flat contents to public/build/themes/{slug}.
   */
  buildDirectory?: string;
  /** Extra Vite config merged over the preset (plugins are concatenated). */
  extend?: UserConfig;
}

/**
 * The shared Vite preset every Safqi storefront theme builds with. It pins the
 * tailwind + react + laravel plugin wiring and the per-theme `build/themes/{slug}`
 * output in ONE place, so a change to the build contract is a core version bump
 * rather than an edit across every theme repo.
 *
 *   // theme vite.config.ts
 *   import { defineThemeConfig } from "@safqi/storefront-core/vite";
 *   export default defineThemeConfig({ slug: "basic", rootUrl: import.meta.url });
 */
export function defineThemeConfig(opts: ThemeConfigOptions) {
  const {
    slug,
    rootUrl,
    input = "src/main.tsx",
    publicDirectory = "../../public",
    buildDirectory = `build/themes/${slug}`,
    extend,
  } = opts;
  const themeDir = fileURLToPath(new URL(".", rootUrl));
  const extraPlugins = extend?.plugins ?? [];

  return defineConfig(({ mode, command }) => {
    // Standalone dev preview: proxy the storefront API + assets to a running store
    // (VITE_STORE_ORIGIN — a local backend or the hosted demo tenant). The browser
    // only ever talks to localhost, so cross-origin CORS is never exercised. When
    // the env var is unset there is no proxy (and no live data). This is dev-only;
    // production serves the built assets from the platform's public dir. Read via
    // loadEnv (NOT process.env — Vite does not put .env into process.env at config
    // time), so a plain `.env` with VITE_STORE_ORIGIN=… just works.
    const storeOrigin = loadEnv(mode, themeDir, "VITE_")?.VITE_STORE_ORIGIN;
    const devProxy = storeOrigin
      ? {
          proxy: Object.fromEntries(
            ["/api/v1", "/api/apps", "/storage"].map((path) => [
              path,
              // changeOrigin: send the target's Host so ResolveTenant matches the
              // tenant. secure:false: accept local self-signed TLS (Herd/Valet
              // .test certs Node won't trust) so an HTTPS origin still proxies.
              { target: storeOrigin, changeOrigin: true, secure: false },
            ]),
          ),
        }
      : undefined;

    // Standalone preview (VITE_STORE_ORIGIN set + `vite` serve) runs as a plain
    // SPA that serves the theme's own index.html at `/`. The laravel-vite-plugin
    // is DELIBERATELY omitted here: in `serve` it takes over `/` with its "run
    // artisan serve" placeholder (it's built for the in-repo flow where the Laravel
    // backend consumes a hot-file). It IS used for `build` (to emit the manifest
    // the platform loads) and for in-repo hot-file dev (no VITE_STORE_ORIGIN).
    const standalonePreview = command === "serve" && !!storeOrigin;
    const useLaravelPlugin = !standalonePreview;

    return {
    root: themeDir,
    ...extend,
    server: { ...devProxy, ...extend?.server },
    plugins: [
      tailwindcss(),
      react(),
      ...(useLaravelPlugin
        ? [
            laravel({
              input: [input],
              refresh: true,
              publicDirectory,
              buildDirectory,
            }),
          ]
        : []),
      ...(standalonePreview ? [storefrontConfigInjector(storeOrigin!)] : []),
      ...extraPlugins,
    ],
    resolve: {
      ...extend?.resolve,
      // Force a SINGLE copy of React (and the other context-singleton libs) into
      // the bundle. The core ships as a `file:` dependency that is COPIED into the
      // theme with its own nested node_modules — so `react` imported from the core
      // dist would otherwise resolve to a second React and null out the hooks
      // dispatcher at runtime (`Cannot read properties of null (reading
      // 'useContext')`). Deduping pins every request to the theme's own copy.
      dedupe: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        ...(extend?.resolve?.dedupe ?? []),
      ],
      alias: {
        "@": fileURLToPath(new URL("./src", rootUrl)),
        ...(extend?.resolve?.alias as Record<string, string> | undefined),
      },
    },
    };
  });
}
