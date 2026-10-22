import { getInstalledApps } from "./appConfig";

/**
 * Product-page app slots.
 *
 * An installed app can add UI to the product page of EVERY theme without the
 * theme knowing about it. The app declares `storefront.product_slots[]` in its
 * manifest; the server lists them on `window.appConfig.apps[].productSlots`; a
 * theme mounts `<ProductAppSlots position="…" />` once, which fetches the app's
 * server-rendered `{html, css}` and injects it. The app makes that markup
 * interactive with a script it ships in its body.blade.php:
 *
 *   (window.SafqiApps = window.SafqiApps || { _q: [], register(s, h) { this._q.push([s, h]); } })
 *     .register("my-app", { mount(el, ctx) {…}, update(el, ctx) {…}, unmount(el) {…} });
 *
 * That script runs BEFORE the theme bundle, so it registers into a plain queue
 * stub; installAppRegistry() (called by bootStorefront) swaps the stub for the
 * real registry and drains the queue. Registrations after boot work too.
 */

export type ProductSlotPosition = "below_variants" | "below_description";

export interface ProductSlotDecl {
  key: string;
  position: ProductSlotPosition;
  /** A built-in theme block this slot supersedes (e.g. `size_chart`). */
  replaces: string | null;
}

export interface AppSlotContext {
  slug: string;
  key: string;
  product: { id: number; slug: string; name: string };
  /** The currently selected variant, or null for a simple product / no pick yet. */
  variant: { id: number; name?: string | null } | null;
  /** Absolute base of this app's API, e.g. https://shop/api/apps/size-guide */
  apiUrl: string;
  /** The shopper's bearer token, or null when signed out. */
  token: () => string | null;
  lang: string;
}

export interface AppSlotHandler {
  mount: (el: HTMLElement, ctx: AppSlotContext) => void;
  update?: (el: HTMLElement, ctx: AppSlotContext) => void;
  unmount?: (el: HTMLElement, ctx: AppSlotContext) => void;
}

export interface AppRegistry {
  register: (slug: string, handler: AppSlotHandler) => void;
  get: (slug: string) => AppSlotHandler | undefined;
  /** Notified with the slug whenever a handler registers. Returns an unsubscribe. */
  subscribe: (fn: (slug: string) => void) => () => void;
}

interface QueueStub {
  _q?: Array<[string, AppSlotHandler]>;
  register?: unknown;
  get?: unknown;
}

type RegistryHost = { SafqiApps?: AppRegistry | QueueStub };

function isRegistry(value: unknown): value is AppRegistry {
  return !!value && typeof (value as AppRegistry).get === "function" && typeof (value as AppRegistry).subscribe === "function";
}

/**
 * Install (once) the real registry on `host` (window by default), draining any
 * registrations queued by app scripts that ran before the theme booted.
 */
export function installAppRegistry(host: RegistryHost = window as unknown as RegistryHost): AppRegistry {
  if (isRegistry(host.SafqiApps)) return host.SafqiApps;

  const queued = Array.isArray((host.SafqiApps as QueueStub | undefined)?._q)
    ? ((host.SafqiApps as QueueStub)._q as Array<[string, AppSlotHandler]>)
    : [];

  const handlers = new Map<string, AppSlotHandler>();
  const listeners = new Set<(slug: string) => void>();

  const registry: AppRegistry = {
    register(slug, handler) {
      if (!slug || !handler || typeof handler.mount !== "function") return;
      handlers.set(slug, handler);
      listeners.forEach((fn) => fn(slug));
    },
    get: (slug) => handlers.get(slug),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  host.SafqiApps = registry;
  queued.forEach(([slug, handler]) => registry.register(slug, handler));

  return registry;
}

/** The registry, installing it on first use. */
export const getAppRegistry = (): AppRegistry => installAppRegistry();

/** Every installed app's slot at `position`, in install order. */
export function getProductSlots(position: ProductSlotPosition): Array<ProductSlotDecl & { slug: string }> {
  return getInstalledApps().flatMap((app) =>
    (app.productSlots ?? [])
      .filter((slot) => slot.position === position)
      .map((slot) => ({ ...slot, slug: app.slug })),
  );
}

/**
 * Whether an installed app supersedes one of the theme's built-in product
 * blocks (e.g. `size_chart`). Themes wrap that block in `!isProductBlockReplaced(…)`
 * so the shopper never sees it twice.
 */
export const isProductBlockReplaced = (block: string): boolean =>
  getInstalledApps().some((app) => (app.productSlots ?? []).some((slot) => slot.replaces === block));

/**
 * Inject (or refresh) one `<style>` per slot. Keyed so re-mounting the same
 * slot on another product reuses the tag instead of stacking copies.
 */
export function injectSlotStyle(id: string, css: string | null, doc: Document = document): void {
  const selector = `style[data-app-slot="${CSS.escape(id)}"]`;
  let tag = doc.head.querySelector<HTMLStyleElement>(selector);

  if (!css) {
    tag?.remove();
    return;
  }

  if (!tag) {
    tag = doc.createElement("style");
    tag.setAttribute("data-app-slot", id);
    doc.head.appendChild(tag);
  }

  if (tag.textContent !== css) tag.textContent = css;
}
