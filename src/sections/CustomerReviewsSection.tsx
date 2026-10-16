import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchReviews, reviewKeys } from "../lib/reviews";
import { RatingStars } from "../components/RatingStars";
import { ReviewerName } from "../components/ReviewerName";
import { lang, t } from "../lib/i18n";
import { SolarIcon } from "../components/SolarIcon";
import SwipeRow from "../components/SwipeRow";
import type { ReviewFeedQuery, StorefrontReview } from "../types/review";
import { titlePositionAttrs } from "../lib/sectionTitle";
import { cfg, gridClass, str } from "./config";

/** The feed query a section config asks for — exported for tests. */
export function reviewFeedQuery(c: Record<string, unknown>): ReviewFeedQuery {
  const product = cfg<string>(c, "source", "all") === "product" ? str(c, "product") : "";

  return {
    ...(product ? { product } : {}),
    min_rating: Number(cfg<number>(c, "min_rating", 4)) || undefined,
    with_comment: Boolean(cfg<boolean>(c, "with_comment", true)),
    limit: Number(cfg<number>(c, "limit", 8)) || 8,
    sort: cfg<string>(c, "sort", "latest") === "top" ? "top" : "latest",
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function ReviewCard({ review, showProduct, showDate }: { review: StorefrontReview; showProduct: boolean; showDate: boolean }) {
  // A hidden reviewer gets a neutral avatar — never the initial of a real name.
  const initial = review.name_hidden ? "" : review.name.trim().charAt(0);

  return (
    <figure className="sf-review-card">
      <div className="sf-review-card__head">
        <span className={`sf-review-card__avatar${review.name_hidden ? " is-hidden" : ""}`} aria-hidden>
          {initial || <SolarIcon name="user-linear" />}
        </span>
        <div className="sf-review-card__who">
          <ReviewerName review={review} />
          <span className="sf-review-card__verified">
            <SolarIcon name="verified-check-bold" /> {t("reviews.verifiedBuyer")}
          </span>
        </div>
        <SolarIcon name="chat-square-like-linear" className="sf-review-card__quote" />
      </div>

      <div className="sf-review-card__rating">
        <RatingStars value={review.rating} size="md" />
        {showDate && review.created_at ? (
          <span className="sf-review-card__date">{formatDate(review.created_at)}</span>
        ) : null}
      </div>

      {review.comment ? <blockquote className="sf-review-card__text">{review.comment}</blockquote> : null}

      {showProduct && review.product ? (
        <Link to={`/products/${review.product.slug}`} className="sf-review-card__product">
          {review.product.image ? (
            <img src={review.product.image} alt="" loading="lazy" className="sf-review-card__thumb" />
          ) : null}
          <span className="sf-review-card__product-name">{review.product.name}</span>
          <SolarIcon name="alt-arrow-left-linear" className="sf-review-card__chevron" />
        </Link>
      ) : null}
    </figure>
  );
}

/**
 * «تقييمات العملاء» — real, verified-buyer reviews pulled from the store
 * (GET /reviews), not merchant-typed quotes like `testimonials`. A reviewer
 * who hid their name shows as a blurred placeholder. Renders nothing while the
 * store has no matching reviews, so an empty block never sits on the homepage.
 */
export function CustomerReviewsSection({ section }: { section: AppHomepageSection }) {
  const c = section.config;
  const query = reviewFeedQuery(c);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: reviewKeys.feed(query),
    queryFn: () => fetchReviews(query),
  });

  if (isLoading) {
    return (
      <section className="sf-section sf-reviews">
        <div className="sf-skeleton w-full rounded-3xl" style={{ height: "10rem" }} />
      </section>
    );
  }

  if (reviews.length === 0) return null;

  const swipe = cfg<string>(c, "layout", "grid") === "swipe";
  const desktop = Number(cfg<number>(c, "columns_desktop", 3));
  const showProduct = Boolean(cfg<boolean>(c, "show_product", true));
  const showDate = Boolean(cfg<boolean>(c, "show_date", false));
  const heading = str(c, "heading");

  const cards = reviews.map((r) => <ReviewCard key={r.id} review={r} showProduct={showProduct} showDate={showDate} />);

  return (
    <section className="sf-section sf-reviews" {...titlePositionAttrs(c)}>
      {heading ? <h2 className="sf-section__title sf-head">{heading}</h2> : null}
      {swipe ? (
        // Same rail the product shelves use: native scroll + snap, and a mouse
        // can drag/fling it too (SwipeRow → useDragScroll).
        <SwipeRow ariaLabel={heading || t("reviews.title")} gap="gap-3" className="sf-reviews__rail">
          {reviews.map((r) => (
            <div key={r.id} className="sf-reviews__slide">
              <ReviewCard review={r} showProduct={showProduct} showDate={showDate} />
            </div>
          ))}
        </SwipeRow>
      ) : (
        <div className={`grid gap-3 ${gridClass(1, desktop)}`}>{cards}</div>
      )}
    </section>
  );
}

export default CustomerReviewsSection;
