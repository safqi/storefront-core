import type { Plugin } from "vite";
import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build-time icon bundling for storefront themes.
 *
 * `@iconify/react` fetches every glyph it hasn't seen from api.iconify.design
 * at runtime — a third-party round trip per batch on every first page view
 * (and a blank icon wherever that host is slow or blocked). This plugin finds
 * the icon names a theme actually uses, pulls just those out of the locally
 * installed `@iconify-json/*` sets, and emits them as one hashed, same-origin
 * chunk per set. The entry registers a custom Iconify loader per set that
 * serves from that chunk, so no icon request ever leaves the store's origin.
 *
 * The data is a SEPARATE chunk on purpose: ~200 Solar glyphs are ~180 kB raw
 * (~60 kB gzip) — inlined, that would sit on the critical path of the main
 * bundle. The chunk import is started the moment the entry evaluates, so it
 * downloads in parallel with the app booting and is long-cache immutable.
 *
 * Detection is by scanning source text, because names are mostly passed as
 * plain strings (`<SolarIcon name="bell-linear" />`, `ICONS.cart`, a ternary,
 * a map). Every token is checked against the real icon set, so a false match
 * costs nothing — only names that exist get bundled. Scanned:
 *   - the theme's `src/`
 *   - this package's own `dist/` (the shared ICONS registry + core components)
 *   - any extra `scan` paths (e.g. the backend's `app/` + `config/` for names
 *     the API sends as data: payment-method, badge, personalization icons)
 *
 * A name that only exists at runtime (typed by a merchant) and isn't found by
 * the scan still works — the loader fetches just that one from the Iconify API.
 */

export interface IconBundleOptions {
  /** Extra files/dirs to scan for icon names (absolute, or relative to the theme). */
  scan?: string[];
  /**
   * Iconify set prefixes to bundle from. Each needs `@iconify-json/{prefix}`
   * installed (this package ships solar, logos and mdi). Missing sets are skipped.
   */
  sets?: string[];
  /** Prefix assumed for bare names (`bell-linear` → `solar:bell-linear`). */
  defaultPrefix?: string;
}

interface IconifyJSON {
  prefix: string;
  icons: Record<string, Record<string, unknown>>;
  aliases?: Record<string, { parent: string } & Record<string, unknown>>;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

const VIRTUAL_ID = "virtual:safqi-icons";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
/** One data module per set: `virtual:safqi-icons/solar`. */
const SET_ID = VIRTUAL_ID + "/";
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".php"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "vendor"]);
const TOKEN = /[a-z0-9]+(?:[-:][a-z0-9]+)*/g;

/** Every file under `path` with a scannable extension. */
function collectFiles(path: string, out: string[] = []): string[] {
  let st;
  try {
    st = statSync(path);
  } catch {
    return out;
  }
  if (st.isFile()) {
    if (SCAN_EXT.has(extname(path))) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    collectFiles(join(path, entry), out);
  }
  return out;
}

/**
 * Pick `names` (plus whatever aliases they point through) out of a full set,
 * keeping the set-level default dimensions. Unknown names are ignored.
 */
export function subsetCollection(data: IconifyJSON, names: Iterable<string>): IconifyJSON | null {
  const icons: IconifyJSON["icons"] = {};
  const aliases: NonNullable<IconifyJSON["aliases"]> = {};
  const add = (name: string, depth = 0): boolean => {
    if (depth > 8) return false;
    if (data.icons[name]) {
      icons[name] = data.icons[name];
      return true;
    }
    const alias = data.aliases?.[name];
    if (alias && add(alias.parent, depth + 1)) {
      aliases[name] = alias;
      return true;
    }
    return false;
  };
  for (const name of names) add(name);
  if (Object.keys(icons).length === 0) return null;

  const out: IconifyJSON = { prefix: data.prefix, icons };
  if (Object.keys(aliases).length) out.aliases = aliases;
  for (const key of ["width", "height", "left", "top"] as const) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

/**
 * Bucket every token in `text` by set: `prefix:name` goes to that set, a bare
 * token to `defaultPrefix`. Existence is checked later against the set itself.
 */
export function extractIconNames(
  text: string,
  prefixes: Set<string>,
  defaultPrefix: string,
  into: Map<string, Set<string>> = new Map(),
): Map<string, Set<string>> {
  const bucket = (prefix: string) => {
    let set = into.get(prefix);
    if (!set) into.set(prefix, (set = new Set()));
    return set;
  };
  for (const token of text.match(TOKEN) ?? []) {
    const colon = token.indexOf(":");
    if (colon === -1) {
      if (prefixes.has(defaultPrefix)) bucket(defaultPrefix).add(token);
      continue;
    }
    const prefix = token.slice(0, colon);
    const name = token.slice(colon + 1);
    if (prefixes.has(prefix) && !name.includes(":")) bucket(prefix).add(name);
  }
  return into;
}

export function safqiIcons(opts: {
  themeDir: string;
  entry: string;
  options?: IconBundleOptions;
}): Plugin {
  const { themeDir, entry, options = {} } = opts;
  const { scan = [], sets = ["solar", "logos", "mdi"], defaultPrefix = "solar" } = options;
  const entryPath = resolve(themeDir, entry);
  // vite.js lives in this package's dist/, next to the bundled core — scanning
  // it picks up the ICONS registry and every icon the core components use.
  const coreDist = fileURLToPath(new URL(".", import.meta.url));
  // Resolve sets from the theme first (a theme may add its own), then from here.
  const requirers = [createRequire(join(themeDir, "package.json")), createRequire(import.meta.url)];

  const loadSet = (prefix: string): IconifyJSON | null => {
    for (const req of requirers) {
      try {
        return req(`@iconify-json/${prefix}/icons.json`) as IconifyJSON;
      } catch {
        // try the next location
      }
    }
    return null;
  };

  let isBuild = false;
  let subsets: Map<string, IconifyJSON> | null = null;

  const collect = (log: (msg: string) => void): Map<string, IconifyJSON> => {
    const loaded = new Map<string, IconifyJSON>();
    for (const prefix of sets) {
      const data = loadSet(prefix);
      if (data) loaded.set(prefix, data);
      else log(`[safqi:icons] @iconify-json/${prefix} not installed — "${prefix}:" icons load from the Iconify API`);
    }

    const names = new Map<string, Set<string>>();
    const prefixes = new Set(loaded.keys());
    const roots = [join(themeDir, "src"), coreDist, ...scan.map((p) => resolve(themeDir, p))];
    for (const root of roots) {
      for (const file of collectFiles(root)) {
        extractIconNames(readFileSync(file, "utf8"), prefixes, defaultPrefix, names);
      }
    }

    const out = new Map<string, IconifyJSON>();
    const counts: string[] = [];
    for (const [prefix, data] of loaded) {
      const subset = subsetCollection(data, names.get(prefix) ?? []);
      if (!subset) continue;
      out.set(prefix, subset);
      counts.push(`${prefix} ${Object.keys(subset.icons).length + Object.keys(subset.aliases ?? {}).length}`);
    }
    log(`[safqi:icons] bundled ${counts.join(", ") || "no icons"}`);
    return out;
  };

  const getSubsets = (log: (msg: string) => void) => {
    // Re-scan on every dev load (cheap) so new icons show up after a reload;
    // a build scans exactly once.
    if (!isBuild || subsets === null) subsets = collect(log);
    return subsets;
  };

  return {
    name: "safqi:icons",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    resolveId(id) {
      return id === VIRTUAL_ID || id.startsWith(SET_ID) ? "\0" + id : null;
    },
    load(id) {
      if (!id.startsWith(RESOLVED_ID)) return null;
      const log = (msg: string) => (isBuild ? this.info(msg) : undefined);

      if (id.startsWith("\0" + SET_ID)) {
        const subset = getSubsets(log).get(id.slice(SET_ID.length + 1));
        return `export default ${JSON.stringify(subset ?? null)};`;
      }

      const prefixes = [...getSubsets(log).keys()];
      return registerModule(prefixes);
    },
    transform(code, id) {
      // Register before anything renders: the import goes first in the entry.
      if (id.split("?")[0] !== entryPath) return null;
      return { code: `import "${VIRTUAL_ID}";\n${code}`, map: null };
    },
  };
}

/**
 * The entry-side module: per bundled set, start loading its chunk NOW and
 * point Iconify's loader for that prefix at it. Iconify hands the loader the
 * names it needs; we return the whole subset (so later icons are already in
 * memory and the loader isn't asked again) and fetch from the public API only
 * the names the build-time scan never saw.
 */
function registerModule(prefixes: string[]): string {
  return `import { setCustomIconsLoader } from "@iconify/react";

const API = "https://api.iconify.design";

function register(prefix, pending) {
  setCustomIconsLoader(async (names) => {
    const data = (await pending.catch(() => null))?.default ?? { prefix, icons: {} };
    const missing = names.filter((n) => !data.icons[n] && !data.aliases?.[n]);
    if (!missing.length) return data;
    try {
      const res = await fetch(API + "/" + prefix + ".json?icons=" + missing.join(","));
      const extra = await res.json();
      return {
        ...data,
        icons: { ...data.icons, ...extra.icons },
        aliases: { ...data.aliases, ...extra.aliases },
      };
    } catch {
      return data;
    }
  }, prefix);
}

${prefixes
  .map((p) => `register(${JSON.stringify(p)}, import(${JSON.stringify(SET_ID + p)}));`)
  .join("\n")}
`;
}
