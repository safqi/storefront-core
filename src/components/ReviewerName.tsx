import type { StorefrontReview } from "../types/review";

/**
 * A reviewer's name. When the reviewer chose «إخفاء الاسم» the API sends only a
 * placeholder (`name_hidden: true`) — never the real name — and it is drawn
 * blurred, so the card still reads "a person wrote this" without exposing who.
 */
export function ReviewerName({ review, className = "" }: { review: Pick<StorefrontReview, "name" | "name_hidden">; className?: string }) {
  return review.name_hidden ? (
    <span className={`sf-reviewer sf-reviewer--hidden ${className}`.trim()} aria-hidden>
      {review.name}
    </span>
  ) : (
    <span className={`sf-reviewer ${className}`.trim()}>{review.name}</span>
  );
}

export default ReviewerName;
