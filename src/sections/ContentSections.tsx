import { useEffect, useState } from "react";
import { SmartLink } from "../components/SmartLink";
import { SolarIcon } from "../components/SolarIcon";
import { cfg, gridClass, rows, str } from "./config";
import { ASPECTS, parseVideo } from "./video";
import { pad, parseDeadline, remaining, type Remaining } from "./countdown";
import axios from "axios";
import { t } from "../lib/i18n";

/**
 * Core renderers for the content / trust / commerce section types.
 *
 * They live in the core rather than in each theme because the markup is the
 * same everywhere — a theme restyles them through the `.sf-*` classes and the
 * design tokens, not by forking the component. A theme that genuinely wants a
 * different structure still overrides the type in its own SectionRenderer,
 * which takes precedence over the fallback.
 */

type Props = { section: AppHomepageSection };

/** Section heading. Empty renders nothing — a heading-less block is valid. */
function Heading({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  return <h2 className={`sf-section__title ${className}`}>{text}</h2>;
}

/**
 * Merchant prose. Rendered as plain text with newlines preserved — NOT as HTML.
 * These fields are free text from the admin, and injecting them as markup would
 * make the theme builder an XSS vector for anyone with `themes.manage`.
 */
function Body({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  return <p className={`sf-prose whitespace-pre-line ${className}`}>{text}</p>;
}

// ─── Content blocks ─────────────────────────────────────────────────────────

export function RichTextSection({ section }: Props) {
  const c = section.config;
  const heading = str(c, "heading");
  const body = str(c, "body");

  if (!heading && !body) return null;

  const align = cfg<string>(c, "align", "start") === "center" ? "text-center" : "text-start";

  return (
    <section className={`sf-section sf-rich-text ${align}`}>
      <Heading text={heading} />
      <Body text={body} />
    </section>
  );
}

export function ImageTextSection({ section }: Props) {
  const c = section.config;
  const image = str(c, "image");
  const heading = str(c, "heading");
  const body = str(c, "body");
  const href = str(c, "link");
  const ctaLabel = str(c, "cta_label");

  if (!image && !heading && !body) return null;

  // `image_side: end` puts the image after the text in the DOM as well as
  // visually, so the reading order matches on a screen reader too.
  const imageFirst = cfg<string>(c, "image_side", "start") !== "end";

  const picture = image ? (
    <div className="sf-image-text__media">
      <img src={image} alt={heading} loading="lazy" className="h-full w-full rounded-3xl object-cover" />
    </div>
  ) : null;

  const copy = (
    <div className="sf-image-text__copy">
      <Heading text={heading} />
      <Body text={body} />
      {href && ctaLabel && (
        <SmartLink href={href} className="sf-btn sf-btn--primary mt-2 inline-flex">
          {ctaLabel}
        </SmartLink>
      )}
    </div>
  );

  return (
    <section className="sf-section sf-image-text">
      <div className="grid items-center gap-4 md:grid-cols-2 md:gap-8">
        {imageFirst ? picture : copy}
        {imageFirst ? copy : picture}
      </div>
    </section>
  );
}

export function VideoSection({ section }: Props) {
  const c = section.config;
  const autoplay = cfg<boolean>(c, "autoplay", false);
  const muted = cfg<boolean>(c, "muted", true);
  const source = parseVideo(str(c, "url"), { autoplay, muted });

  // An unparseable URL renders nothing rather than an empty black box.
  if (!source) return null;

  const aspect = ASPECTS[cfg<string>(c, "aspect", "16/9")] ?? ASPECTS["16/9"];

  return (
    <section className="sf-section sf-video">
      <Heading text={str(c, "heading")} />
      <div className={`${aspect} overflow-hidden rounded-3xl bg-surface-2`}>
        {source.kind === "file" ? (
          <video
            src={source.url}
            controls
            autoPlay={autoplay}
            muted={muted || autoplay}
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <iframe
            src={source.embed}
            title={str(c, "heading") || "video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        )}
      </div>
    </section>
  );
}

export function FaqSection({ section }: Props) {
  const c = section.config;
  const items = rows<{ question?: string; answer?: string }>(c, "items").filter((i) => i.question);

  if (items.length === 0) return null;

  return (
    <section className="sf-section sf-faq">
      <Heading text={str(c, "heading")} />
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          // <details> gives us keyboard support, screen-reader semantics and
          // open/close state for free — no JS, no aria wiring to get wrong.
          <details key={i} className="sf-faq__item">
            <summary className="sf-faq__question">
              <span>{item.question}</span>
              <SolarIcon name="alt-arrow-down-linear" className="sf-faq__chevron" />
            </summary>
            <Body text={item.answer ?? ""} className="sf-faq__answer" />
          </details>
        ))}
      </div>
    </section>
  );
}

export function DividerSection({ section }: Props) {
  const c = section.config;
  const size = cfg<string>(c, "size", "md");
  const height = size === "sm" ? "h-4" : size === "lg" ? "h-16" : "h-8";

  if (cfg<string>(c, "style", "line") === "space") {
    return <div className={height} aria-hidden />;
  }

  return (
    <div className={`flex items-center ${height}`} aria-hidden>
      <hr className="w-full border-0 border-t border-divider" />
    </div>
  );
}

// ─── Trust & social proof ───────────────────────────────────────────────────

export function FeaturesStripSection({ section }: Props) {
  const c = section.config;
  const items = rows<{ icon?: string; title?: string; subtitle?: string }>(c, "items").filter(
    (i) => i.title || i.icon,
  );

  if (items.length === 0) return null;

  const grid = gridClass(
    Number(cfg<number>(c, "columns_mobile", 2)),
    Number(cfg<number>(c, "columns_desktop", 4)),
  );

  return (
    <section className="sf-section sf-features">
      <Heading text={str(c, "heading")} />
      <div className={`grid gap-3 ${grid}`}>
        {items.map((item, i) => (
          <div key={i} className="sf-features__item">
            {item.icon && <SolarIcon name={item.icon} className="sf-features__icon" />}
            <span className="sf-features__title">{item.title}</span>
            {item.subtitle && <span className="sf-features__subtitle">{item.subtitle}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const value = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <span className="sf-testimonial__stars" aria-label={`${value}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <SolarIcon key={i} name={i < value ? "star-bold" : "star-linear"} aria-hidden />
      ))}
    </span>
  );
}

export function TestimonialsSection({ section }: Props) {
  const c = section.config;
  const items = rows<{ name?: string; text?: string; rating?: number; avatar?: string }>(
    c,
    "items",
  ).filter((i) => i.text);

  if (items.length === 0) return null;

  const swipe = cfg<string>(c, "layout", "grid") === "swipe";
  const desktop = Number(cfg<number>(c, "columns_desktop", 3));

  const cards = items.map((item, i) => (
    <figure key={i} className="sf-testimonial">
      <Stars rating={Number(item.rating ?? 5)} />
      <blockquote className="sf-testimonial__text">{item.text}</blockquote>
      <figcaption className="sf-testimonial__author">
        {item.avatar && <img src={item.avatar} alt="" loading="lazy" className="sf-testimonial__avatar" />}
        <span>{item.name}</span>
      </figcaption>
    </figure>
  ));

  return (
    <section className="sf-section sf-testimonials">
      <Heading text={str(c, "heading")} />
      {swipe ? (
        <div className="sf-swipe-row sf-no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {cards.map((card, i) => (
            <div key={i} className="w-72 flex-shrink-0">
              {card}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-3 ${gridClass(1, desktop)}`}>{cards}</div>
      )}
    </section>
  );
}

// ─── Commerce blocks ────────────────────────────────────────────────────────

export function CountdownOfferSection({ section }: Props) {
  const c = section.config;
  const deadline = parseDeadline(str(c, "ends_at"));
  const [left, setLeft] = useState<Remaining>(() => remaining(deadline));

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setLeft(remaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // A finished offer removes itself: leaving "00:00:00" on the homepage reads
  // as a broken store, and the merchant may not revisit the builder for weeks.
  if (!deadline || left.expired) return null;

  const href = str(c, "link");
  const ctaLabel = str(c, "cta_label");

  const units: [number, string][] = [
    [left.days, t("countdown.days")],
    [left.hours, t("countdown.hours")],
    [left.minutes, t("countdown.minutes")],
    [left.seconds, t("countdown.seconds")],
  ];

  return (
    <section
      className="sf-section sf-countdown"
      style={
        {
          "--sf-countdown-bg": cfg<string>(c, "bg", "#111827"),
          "--sf-countdown-fg": cfg<string>(c, "fg", "#ffffff"),
        } as React.CSSProperties
      }
    >
      <div className="sf-countdown__box">
        <Heading text={str(c, "heading")} />
        <Body text={str(c, "body")} />

        <div className="sf-countdown__timer" dir="ltr">
          {units.map(([value, label]) => (
            <div key={label} className="sf-countdown__unit">
              <span className="sf-countdown__value">{pad(value)}</span>
              <span className="sf-countdown__label">{label}</span>
            </div>
          ))}
        </div>

        {href && ctaLabel && (
          <SmartLink href={href} className="sf-btn sf-btn--primary inline-flex">
            {ctaLabel}
          </SmartLink>
        )}
      </div>
    </section>
  );
}

export function NewsletterSection({ section }: Props) {
  const c = section.config;
  const channel = cfg<string>(c, "channel", "email") === "phone" ? "phone" : "email";
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || state === "sending") return;

    setState("sending");
    setError("");
    try {
      // axios.defaults.baseURL is set once by bootStorefront, so this is the
      // same /api/v1 base every other core query uses.
      await axios.post("subscribe", { [channel]: value.trim() });
      setState("done");
      setValue("");
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || t("newsletter.error"));
      setState("error");
    }
  };

  return (
    <section className="sf-section sf-newsletter">
      <Heading text={str(c, "heading")} />
      <Body text={str(c, "body")} />

      {state === "done" ? (
        <p className="sf-newsletter__success">{str(c, "success_text") || t("newsletter.success")}</p>
      ) : (
        <form onSubmit={submit} className="sf-newsletter__form">
          <input
            type={channel === "email" ? "email" : "tel"}
            inputMode={channel === "email" ? "email" : "tel"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={channel === "email" ? t("newsletter.email") : t("newsletter.phone")}
            className="sf-input flex-1"
            dir={channel === "email" ? "ltr" : "ltr"}
            required
          />
          <button type="submit" className="sf-btn sf-btn--primary" disabled={state === "sending"}>
            {str(c, "button_label") || t("newsletter.subscribe")}
          </button>
        </form>
      )}

      {error && <p className="sf-newsletter__error">{error}</p>}
    </section>
  );
}

export function MarqueeSection({ section }: Props) {
  const c = section.config;
  const items = rows<{ text?: string }>(c, "items")
    .map((i) => (i.text ?? "").trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  const reverse = cfg<string>(c, "direction", "forward") === "reverse";

  return (
    <div
      className={`sf-announcement sf-announcement--inline ${reverse ? "sf-announcement--reverse" : ""}`}
      style={
        {
          "--sf-announcement-bg": cfg<string>(c, "bg", "#111827"),
          "--sf-announcement-fg": cfg<string>(c, "fg", "#ffffff"),
          "--sf-announcement-speed": `${Math.max(5, Number(cfg<number>(c, "speed", 24)))}s`,
        } as React.CSSProperties
      }
      role="marquee"
      aria-label={items.join(" — ")}
    >
      {/* Two copies so the loop is seamless — see the announcement bar. */}
      <div className="sf-announcement__track">
        {[0, 1].map((copy) => (
          <div className="sf-announcement__group" key={copy} aria-hidden={copy === 1}>
            {items.map((text, i) => (
              <span className="sf-announcement__item" key={`${copy}-${i}`}>
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
