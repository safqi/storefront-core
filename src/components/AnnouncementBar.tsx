import { useEffect, useMemo, useState } from "react";
import { getAnnouncement } from "../lib/appConfig";
import { dismissKey, personalize } from "../lib/announcement";
import { useAuth } from "../lib/auth";
import { useMarqueeRepeats } from "../lib/useMarqueeRepeats";
import { SmartLink } from "./SmartLink";
import { SolarIcon } from "./SolarIcon";

/**
 * Site-wide announcement bar — a scrolling marquee of merchant-written
 * messages, pinned to the top or bottom of every storefront page.
 *
 * It lives in the core rather than in each theme because it is the same
 * behaviour everywhere and the styling is entirely merchant-driven (their own
 * bg/fg). Themes render `<AnnouncementBar />` once in their layout shell; the
 * `.sf-announcement*` classes in base.css are restyleable per theme.
 *
 * The bar is cached per tenant + locale server-side, so per-visitor values
 * cannot be baked in. `{{customer_name}}` is therefore left in the text and
 * substituted here — blank for guests, whose messages read as if the token was
 * never there.
 */

export interface AnnouncementBarProps {
  /**
   * Which mount point this is. A theme renders the component twice — once above
   * the header, once below the footer — and each instance bows out unless the
   * merchant picked its slot. Sticking to the bottom of the viewport requires
   * being last in the flow, so one shared mount point cannot serve both.
   */
  slot?: "top" | "bottom";
}

export function AnnouncementBar({ slot }: AnnouncementBarProps = {}) {
  const bar = getAnnouncement();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  const texts = useMemo(() => bar.messages.map((m) => m.text), [bar.messages]);
  const key = useMemo(() => dismissKey(texts), [texts]);

  // Must run before the early returns below — hooks cannot be conditional.
  const [repeats, viewportRef, unitRef] = useMarqueeRepeats([key, user?.name]);

  // Start hidden and reveal after reading localStorage: rendering the bar first
  // and hiding it a tick later flashes it at every visitor who dismissed it.
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
  }, [key]);

  if (!bar.enabled || bar.messages.length === 0 || dismissed) return null;
  if (slot && bar.position !== slot) return null;

  const name = (user?.name ?? "").trim();

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // A blocked localStorage only costs us the memory of the dismissal.
    }
  };

  // The track is TWO identical halves translated by exactly -50%, which is what
  // makes the loop seamless: as half A leaves, half B is already in its place.
  // Each half holds `repeats` natural-width copies so a short message set fills
  // the bar by repeating at its own spacing rather than by stretching two copies
  // (which parks the second copy's text dead centre). See useMarqueeRepeats.
  //
  // It needs its own clipping viewport — as a direct flex child of the bar the
  // track would have to share the row with the close button, and the resulting
  // shrink/grow made 50% of the track stop meaning "one half".
  const copies = repeats * 2;
  const track = (
    <div className="sf-announcement__viewport" ref={viewportRef}>
      <div className="sf-announcement__track" aria-hidden={false}>
        {Array.from({ length: copies }, (_, copy) => (
          <div
            className="sf-announcement__group"
            key={copy}
            ref={copy === 0 ? unitRef : undefined}
            aria-hidden={copy > 0}
          >
            {bar.messages.map((message, i) => {
              const text = personalize(message.text, name);
              if (!text) return null;

              return (
                <span className="sf-announcement__item" key={`${copy}-${i}`}>
                  {message.href ? (
                    <SmartLink href={message.href} className="sf-announcement__link">
                      {text}
                    </SmartLink>
                  ) : (
                    text
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const classes = [
    "sf-announcement",
    `sf-announcement--${bar.position}`,
    bar.position === "bottom" && bar.mobile_sheet ? "sf-announcement--sheet" : "",
    bar.pause_on_hover ? "sf-announcement--pausable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role="region"
      aria-label={texts.join(" — ")}
      style={
        {
          "--sf-announcement-bg": bar.bg,
          "--sf-announcement-fg": bar.fg,
          "--sf-announcement-speed": `${Math.max(5, bar.speed)}s`,
        } as React.CSSProperties
      }
    >
      {track}
      {bar.dismissible && (
        <button type="button" className="sf-announcement__close" onClick={dismiss} aria-label="إغلاق">
          <SolarIcon name="close-circle-linear" />
        </button>
      )}
    </div>
  );
}

export default AnnouncementBar;
