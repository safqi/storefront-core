# @safqi/storefront-core

The shared, **versioned** core every Safqi storefront theme is built on. It owns
the parts that are the same across every theme, so a fix or a new API field ships
to all themes with a single version bump instead of an N-repo copy-merge.

## What's in the core (behaviour + contract)

- **appConfig reader** — the only reader of `window.appConfig` (`getApiUrl`, `getTheme`, `isAppInstalled`, …).
- **Data / API** — `fetchProducts`, `fetchProduct`, `fetchCategories`, `fetchBrands`, `fetchFilters`, `queryKeys` (catalog) and the whole `commerce` layer (OTP auth, cart, addresses, geo, shipping, payments, orders, downloads, memberships).
- **Auth + cart** — `AuthProvider` / `useAuth`, `useCart`.
- **i18n + formatting + status** — `t`, `formatMoney`, `orderStatusLabel`, `statusTone`.
- **Theme-token engine** — `applyThemeSettings()` (derives the OKLCh accent ramp + font from tenant settings).
- **Icon registry** — `Icon`, `SolarIcon`, `ICONS`, `resolveIcon`.
- **Design-free leaf components** — `Swiper`, `RequireAuth`, `ErrorState`, `EmptyState`.
- **Boot + build glue** — `bootStorefront()` and the `defineThemeConfig()` Vite preset.
- **Capabilities** — `ENDPOINTS`, `PATTERNS`, `SECTION_TYPES`, `CORE_VERSION` (the single source `create-safqi-theme` reads to emit each theme's `THEME-REFERENCE.md`).

A theme owns only its **presentation**: `index.css` tokens, chrome (Header/BottomBar/Footer), `ProductCard`, the pattern engine (`src/patterns/*`), `SectionRenderer` + `sections/*` markup, and pages.

## Using it in a theme

```ts
// vite.config.ts
import { defineThemeConfig } from "@safqi/storefront-core/vite";
export default defineThemeConfig({ slug: "basic", rootUrl: import.meta.url });
```

```tsx
// src/main.tsx
import "./index.css";
import { bootStorefront } from "@safqi/storefront-core";
import { Routes, Route } from "react-router-dom";
// … your pages/layout
bootStorefront({ children: <Routes>{/* your route tree */}</Routes> });
```

```ts
// src/env.d.ts — pull in the ambient window.appConfig contract
/// <reference types="@safqi/storefront-core/global" />
```

## Distribution & versioning

- Consumed only by Vite/React theme builds. Ships `dist/` (ESM + `.d.ts`) built with `tsup`.
- Themes pin a caret range (`"@safqi/storefront-core": "^1"`) and install it from git or a private registry.
- **Upgrade a theme:** `npm update @safqi/storefront-core && npm run build`. Variant themes (zero-build) inherit automatically via their runtime's bundle.
- `CORE_VERSION` (in `capabilities.ts`) is stamped into a theme so drift against the shipped `basic` core is detectable later.

## Develop

```bash
bun install
bun run build      # tsup → dist/ (+ copies the ambient global.d.ts)
bun run dev        # watch
```
