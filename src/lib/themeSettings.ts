import { getThemePattern, getThemeSettings } from "./appConfig";

/**
 * Static metadata describing how each *non-derived* theme setting maps to a CSS
 * custom property. Mirrors the `settings[].css_var` block of `theme.config.json`
 * — the two MUST stay in sync (the JSON is the source of truth; PHP + this TS
 * copy both consume it).
 *
 * `accent_color` is intentionally NOT here: it drives a whole derived ramp
 * (hover / strong / soft / auto-contrast foreground / gradient) plus, in the
 * minimal pattern, a whisper of accent mixed into the neutral backgrounds.
 * That logic lives in buildAccentRamp() / buildMinimalSurfaces() below.
 */
interface SettingMeta {
  css_var: string;
  /** For select settings: maps the option value → the raw CSS value. */
  css_var_map?: Record<string, string>;
}

const SETTING_META: Record<string, SettingMeta> = {
  font_family: {
    css_var: "--font-sans",
    css_var_map: {
      "ibm-plex-arabic": '"IBM Plex Sans Arabic", system-ui, sans-serif',
      tajawal: "Tajawal, system-ui, sans-serif",
      cairo: "Cairo, system-ui, sans-serif",
      almarai: "Almarai, system-ui, sans-serif",
      rubik: "Rubik, system-ui, sans-serif",
      "noto-kufi": '"Noto Kufi Arabic", system-ui, sans-serif',
      "noto-sans-arabic": '"Noto Sans Arabic", system-ui, sans-serif',
      estedad: "Estedad, system-ui, sans-serif",
      vazirmatn: "Vazirmatn, system-ui, sans-serif",
    },
  },
};

const DEFAULT_ACCENT = "#0a6ef0";
const STYLE_EL_ID = "tenant-theme-vars";

// ─── Color math (sRGB ↔ OKLab ↔ OKLCh, Björn Ottosson) ─────────────────────
// We work in OKLCh so the derived ramp stays perceptually even regardless of
// the accent hue — a yellow accent and a navy accent both yield a pleasant,
// readable set of shades instead of the muddy results sRGB lerping gives.

type Rgb = [number, number, number];
type Oklch = { L: number; C: number; h: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function parseHex(hex: string): Rgb | null {
  const t = hex.trim().replace(/^#/, "");
  let r: string, g: string, b: string;
  if (t.length === 3) {
    r = t[0] + t[0];
    g = t[1] + t[1];
    b = t[2] + t[2];
  } else if (t.length === 6) {
    r = t.slice(0, 2);
    g = t.slice(2, 4);
    b = t.slice(4, 6);
  } else {
    return null;
  }
  const n = (h: string) => parseInt(h, 16);
  if ([r, g, b].some((h) => Number.isNaN(n(h)))) return null;
  return [n(r), n(g), n(b)];
}

const srgbToLinear = (c: number) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const linearToSrgb = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(clamp(v, 0, 1) * 255);
};

function rgbToOklch([r, g, b]: Rgb): Oklch {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C: Math.hypot(a, bb), h };
}

function oklchToRgb({ L, C, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** "R G B" — the channel triple the :root vars expect (so `rgb(var(--x) / a)`). */
const channels = (rgb: Rgb) => rgb.join(" ");

// ─── Derivations ────────────────────────────────────────────────────────────

/**
 * Canonical shade scale (Tailwind-style 50→950), expressed as OKLCh lightness
 * targets + a chroma multiplier curve. The tenant's single accent_color only
 * contributes hue + a peak-chroma anchor; the lightness of every slot comes
 * from here, so a *light* pick (e.g. #FBEFEF) still yields a deep, saturated
 * mid-tone accent instead of a washed-out button. See buildAccentScale().
 */
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
type Shade = (typeof SHADES)[number];

/** Perceptual lightness (OKLCh L) per slot — approximates Tailwind's ramp. */
const SHADE_L: Record<Shade, number> = {
  50: 0.971, 100: 0.936, 200: 0.885, 300: 0.808, 400: 0.704,
  500: 0.637, 600: 0.577, 700: 0.505, 800: 0.444, 900: 0.396, 950: 0.258,
};

/** Chroma multiplier per slot — peaks at 600, tapers toward both ends. */
const SHADE_C: Record<Shade, number> = {
  50: 0.1, 100: 0.2, 200: 0.38, 300: 0.58, 400: 0.8,
  500: 0.95, 600: 1.0, 700: 0.95, 800: 0.82, 900: 0.7, 950: 0.55,
};

/** Hard cap on peak chroma so a hyper-saturated pick can't blow out the ramp. */
const MAX_PEAK_CHROMA = 0.3;

type Scale = Record<Shade, Rgb>;

/**
 * Build the full 50→950 accent scale from one base color, perceptually in
 * OKLCh. Strategy:
 *   1. Detect which slot the picked color sits in (nearest lightness).
 *   2. Back out a "peak chroma" so the picked color's saturation is honored at
 *      its slot, then spread it across the curve (capped, near-0 for grays).
 *   3. Generate every slot at the canonical lightness + curved chroma + picked
 *      hue. linearToSrgb() already gamut-clamps each channel.
 *   4. Pin the detected slot to the exact picked RGB — brand fidelity: the
 *      tenant's chosen color appears verbatim at its natural position.
 */
function buildAccentScale(base: Oklch): Scale {
  const detected = SHADES.reduce((best, s) =>
    Math.abs(SHADE_L[s] - base.L) < Math.abs(SHADE_L[best] - base.L) ? s : best,
  );
  const peakChroma = Math.min(base.C / SHADE_C[detected], MAX_PEAK_CHROMA);
  const scale = {} as Scale;
  for (const s of SHADES) {
    scale[s] = oklchToRgb({ L: SHADE_L[s], C: peakChroma * SHADE_C[s], h: base.h });
  }
  scale[detected] = oklchToRgb(base); // pin picked color verbatim at its slot
  return scale;
}

interface Ramp {
  /** Full scale as CSS-var declarations: `--accent-50: R G B;` … */
  scaleVars: string[];
  accent: string;
  accentForeground: string;
  accentSoft: string;
  accentHover: string;
  accentStrong: string;
  /** Full `linear-gradient(...)` value for --accent-gradient. */
  gradient: string;
}

/** Slot→token mapping. Light mode uses deep mid-tones so buttons read clearly;
 *  dark mode shifts lighter so the accent lifts off a black page. */
const TOKEN_SLOTS = {
  light: { accent: 600, hover: 700, strong: 800, soft: 50, gradFrom: 600, gradTo: 800 },
  dark: { accent: 500, hover: 400, strong: 300, soft: 900, gradFrom: 500, gradTo: 300 },
} as const;

/** Map a generated scale to the semantic accent tokens for one color mode. */
function buildAccentRamp(scale: Scale, mode: "light" | "dark"): Ramp {
  const m = TOKEN_SLOTS[mode];
  const accent = scale[m.accent as Shade];
  // Auto-contrast label against the accent slot: light accents → near-black.
  const accentL = rgbToOklch(accent).L;
  const foreground: Rgb = accentL > 0.62 ? [17, 17, 19] : [255, 255, 255];
  return {
    scaleVars: SHADES.map((s) => `--accent-${s}: ${channels(scale[s])};`),
    accent: channels(accent),
    accentForeground: channels(foreground),
    accentSoft: channels(scale[m.soft as Shade]),
    accentHover: channels(scale[m.hover as Shade]),
    accentStrong: channels(scale[m.strong as Shade]),
    gradient: `linear-gradient(135deg, rgb(${channels(scale[m.gradFrom as Shade])}), rgb(${channels(scale[m.gradTo as Shade])}))`,
  };
}

interface Surfaces {
  background: string;
  surface: string;
  surface2: string;
  surface3: string;
  divider: string;
}

/**
 * Whisper-tinted neutrals for the minimal pattern — the accent hue bled into
 * the surfaces at a tiny chroma so the page reads warm/cool rather than
 * colored (à la the reference store). Crucially the tokens keep a *clear
 * lightness ladder* so cards read as distinct panels: the page (`background`)
 * carries the tint while cards (`surface`) stay crisp near-white and lift off
 * it — matching the proven glass-pattern gap (bg≈243 / surface≈255), not the
 * old near-flat wash where surface (L .998) ≈ background (L .985) and nothing
 * popped. `dark` flips the scale; chroma stays tiny so text contrast holds.
 */
function buildMinimalSurfaces(base: Oklch, dark: boolean): Surfaces {
  const c = Math.min(base.C, 0.018); // cap chroma so it never reads "colored"
  const at = (L: number, cc = c) => channels(oklchToRgb({ L, C: cc, h: base.h }));
  return dark
    ? {
        background: at(0.07),
        surface: at(0.145), // lift cards clearly off the black page
        surface2: at(0.195),
        surface3: at(0.245),
        divider: at(0.26),
      }
    : {
        background: at(0.962), // softly-tinted page (≈ the glass default)
        surface: at(0.999, c * 0.3), // crisp near-white cards — clear step up
        surface2: at(0.945), // recessed fills (inputs, secondary chips)
        surface3: at(0.915),
        divider: at(0.9),
      };
}

// ─── Apply ──────────────────────────────────────────────────────────────────

/**
 * Build a tenant-theme stylesheet and inject it into <head>. Selectors are
 * `html:root` / `html.dark` (specificity 0,1,1) so they win over the pattern
 * token files (`:root` / `.dark`, 0,1,0) regardless of import order — yet still
 * keep light/dark backgrounds independent (an inline :root style on <html>
 * would clobber dark mode). Called once before first paint.
 */
export function applyThemeSettings(settings?: Record<string, unknown>): void {
  const resolved = settings ?? safeGetSettings();
  if (!resolved) return;

  const light: string[] = [];
  const dark: string[] = [];

  // 1) Plain mapped settings (font, …).
  for (const [key, meta] of Object.entries(SETTING_META)) {
    if (!(key in resolved)) continue;
    const raw = resolved[key];
    if (raw == null || raw === "") continue;
    const value = meta.css_var_map ? meta.css_var_map[String(raw)] : String(raw);
    if (!value) continue;
    light.push(`${meta.css_var}: ${value};`);
  }

  // 2) Smart accent ramp — a full 50→950 scale derived from the single
  //    accent_color, with the semantic tokens aliased to proper slots (deep
  //    mid-tones in light, lifted shades in dark).
  const hex = typeof resolved.accent_color === "string" ? resolved.accent_color : DEFAULT_ACCENT;
  const rgb = parseHex(hex) ?? parseHex(DEFAULT_ACCENT)!;
  const base = rgbToOklch(rgb);
  const scale = buildAccentScale(base);
  // The 50→950 scale colors are mode-independent — emit them once (light).
  // Only the semantic token→slot mapping differs between light and dark.
  const emitTokens = (into: string[], ramp: Ramp, withScale: boolean) => {
    if (withScale) into.push(...ramp.scaleVars);
    into.push(
      `--accent: ${ramp.accent};`,
      `--accent-foreground: ${ramp.accentForeground};`,
      `--accent-soft: ${ramp.accentSoft};`,
      `--accent-hover: ${ramp.accentHover};`,
      `--accent-strong: ${ramp.accentStrong};`,
      `--accent-gradient: ${ramp.gradient};`,
    );
  };
  emitTokens(light, buildAccentRamp(scale, "light"), true);
  emitTokens(dark, buildAccentRamp(scale, "dark"), false);

  // 3) Minimal pattern only: whisper-tint the neutral surfaces with the accent.
  if (safeGetPattern() === "minimal") {
    const sl = buildMinimalSurfaces(base, false);
    const sd = buildMinimalSurfaces(base, true);
    light.push(
      `--background: ${sl.background};`,
      `--surface: ${sl.surface};`,
      `--surface-2: ${sl.surface2};`,
      `--surface-3: ${sl.surface3};`,
      `--divider: ${sl.divider};`,
    );
    dark.push(
      `--background: ${sd.background};`,
      `--surface: ${sd.surface};`,
      `--surface-2: ${sd.surface2};`,
      `--surface-3: ${sd.surface3};`,
      `--divider: ${sd.divider};`,
    );
  }

  const css =
    `html:root{${light.join("")}}` + (dark.length ? `html.dark{${dark.join("")}}` : "");

  let el = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_EL_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function safeGetSettings(): Record<string, unknown> | undefined {
  try {
    return getThemeSettings();
  } catch {
    return undefined;
  }
}

function safeGetPattern(): string {
  try {
    return getThemePattern();
  } catch {
    return "glass";
  }
}
