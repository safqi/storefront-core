import { SolarIcon } from "./SolarIcon";
import { starFill } from "../lib/reviews";
import { t } from "../lib/i18n";

export interface RatingStarsProps {
  /** Average 0..5 (halves are drawn). Null/undefined renders nothing. */
  value: number | null | undefined;
  /** Number of ratings, shown as "(12)" after the stars. */
  count?: number | null;
  /** Show the numeric average ("4.5") before the stars. */
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Read-only 5-star rating. Renders nothing for a missing rating, so a theme can
 * drop `<RatingStars value={p.rating_avg} count={p.rating_count}/>` on every
 * card — the API sends `null` whenever the store hides ratings there or the
 * product has none, and the row simply disappears.
 *
 * Presentation lives in base.css (`.sf-stars*`).
 */
export function RatingStars({ value, count, showValue = false, size = "sm", className = "" }: RatingStarsProps) {
  if (value == null || !(Number(value) > 0)) return null;

  const fills = starFill(value);
  const avg = Math.round(Number(value) * 10) / 10;

  return (
    <span
      className={`sf-stars sf-stars--${size} ${className}`.trim()}
      aria-label={t("reviews.ratingAria", { value: avg })}
      role="img"
    >
      {showValue ? <span className="sf-stars__value">{avg.toFixed(1)}</span> : null}
      <span className="sf-stars__row" aria-hidden>
        {fills.map((f, i) =>
          f === 0.5 ? (
            // Half star: an outline with a filled star clipped to its leading
            // half (inline-start, so it reads right in RTL too).
            <span key={i} className="sf-stars__half">
              <SolarIcon name="star-linear" className="sf-stars__on" />
              <span className="sf-stars__half-fill">
                <SolarIcon name="star-bold" className="sf-stars__on" />
              </span>
            </span>
          ) : (
            <SolarIcon
              key={i}
              name={f === 1 ? "star-bold" : "star-linear"}
              className={f === 1 ? "sf-stars__on" : "sf-stars__off"}
            />
          ),
        )}
      </span>
      {count != null && count > 0 ? <span className="sf-stars__count">({count})</span> : null}
    </span>
  );
}

export default RatingStars;
