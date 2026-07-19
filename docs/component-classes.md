# Storefront component classes (`.sf-*`)

`@safqi/storefront-core` ships **`base.css`** — the shared, overridable component-class
layer that gives the storefront one visual language. Themes import it; apps reference the
same class names. Change the design in one place and it propagates to the theme **and**
every app that uses the classes.

```css
/* a theme's index.css */
@import "tailwindcss";
@import "@safqi/storefront-core/base.css";
/* …then your own token :root {} and any overrides… */
```

## Why

Styling used to live as inline Tailwind utility clusters on every element, so a redesign
meant editing every component, and apps (which inject plain HTML) couldn't inherit the look.
`base.css` is the single source of truth instead.

**Guarantees**
- **Raw CSS + `var()` tokens** — no Tailwind needed at the consumer, so an app's plain
  `body.blade.php` HTML using `class="sf-btn sf-btn--primary"` is styled by the active theme.
- **Always emitted** — plain rules, never purged.
- **Token-driven** — colours/surfaces come from theme tokens (`--surface`, `--accent`, …);
  radii/padding from component tokens (below). Override either to reskin.

## Component tokens (override in a theme `:root`)

| Token | Default | Controls |
|-------|---------|----------|
| `--sf-radius-btn` / `--sf-radius-btn-sm` | `1rem` / `0.75rem` | button corner |
| `--sf-radius-card` / `--sf-radius-card-sm` | `1.5rem` / `1rem` | card/panel corner |
| `--sf-radius-field` | `1.6rem` | input corner |
| `--sf-radius-chip` | `9999px` | chip/pill corner |
| `--sf-pad-card` | `1.25rem` | `.sf-card--pad` inner padding |
| `--sf-gap` | `0.5rem` | button content gap |

Example reskin — flatter corners everywhere, one edit:

```css
:root { --sf-radius-card: 0.5rem; --sf-radius-btn: 0.5rem; }
```

## Classes

| Class | Role |
|-------|------|
| `.sf-btn` + `--primary` / `--tonal` / `--ghost` / `--soft`, `--sm` / `--lg`, `--block`, `--pill` | buttons |
| `.sf-card` + `--sm` / `--pad`, `.sf-panel` (tonal) + `--sm` / `--pad`, `.sf-divider` | surfaces |
| `.sf-chip` + `--accent` / `--success` / `--danger` / `--warning` | pill labels |
| `.sf-input`, `.sf-textarea`, `.sf-label` (+ legacy alias `.field`) | form fields |
| `.sf-product-card` + `__media` / `__body` / `__title` / `__price` / `__badge` | product tile |
| `.sf-section` + `__head` / `__title` / `__action` | titled block |
| `.sf-header`, `.sf-bottombar` + `__item` (`.is-active`) | chrome shells (generic defaults) |
| `.sf-title`, `.sf-price`, `.sf-muted` | text roles |
| `.glass`, `.glass-dark`, `.glass-badge`, `.glass-button`, `.accent-gradient` | liquid-glass effects |
| `.rich-text` | server-sanitized HTML (descriptions) |

Modifiers stack: `class="sf-btn sf-btn--primary sf-btn--lg sf-btn--block"`.

## For theme authors

- Style with `.sf-*` — **don't re-implement utility clusters**. To make it look different,
  override a component token or redefine the class **after** the `@import` in your theme CSS.
- Genuinely one-off layout (grid columns, a specific margin) stays inline as utilities.
- Tokens (`--surface`, `--accent`, the accent ramp) remain **theme-owned** in your `index.css`
  and are recomputed per-tenant — `base.css` only references them.

## For app authors (storefront UI)

Use the `.sf-*` classes in your app's storefront HTML/components. The active theme's `base.css`
(or its overrides) styles them — no Tailwind, no per-app design, and your app matches whatever
theme the merchant runs, including themes that weren't in your demo.

```html
<div class="sf-card sf-card--pad">
  <p class="sf-title">…</p>
  <button class="sf-btn sf-btn--primary">…</button>
</div>
```
