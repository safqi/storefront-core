import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { fetchProductReviews, reviewKeys, submitProductReview } from "../lib/reviews";
import { queryKeys } from "../lib/api";
import { t } from "../lib/i18n";
import { RatingStars } from "./RatingStars";
import { ReviewerName } from "./ReviewerName";
import { SolarIcon } from "./SolarIcon";

/** Clickable 1..5 picker for the review form. */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="sf-star-picker" role="radiogroup" aria-label={t("reviews.yourRating")} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("reviews.starsAria", { count: n })}
          className={`sf-star-picker__star${n <= shown ? " is-on" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <SolarIcon name={n <= shown ? "star-bold" : "star-linear"} />
        </button>
      ))}
    </div>
  );
}

/**
 * The product page's reviews block: rating summary + star distribution, the
 * published reviews, and — for a signed-in customer whose order containing the
 * product was delivered (`can_review`) — the write/edit form with a «إخفاء
 * اسمي» option. Reviews publish immediately.
 *
 * Render it only when `product.reviews_enabled`. Needs an <AuthProvider/> and a
 * react-query client above it (every theme has both). Presentation lives in
 * base.css (`.sf-reviews-block*`).
 */
export function ProductReviews({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hideName, setHideName] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: reviewKeys.product(slug, page),
    queryFn: () => fetchProductReviews(slug, page),
    enabled: slug.length > 0,
  });

  const mine = data?.my_review ?? null;

  // Arriving from an order's «قيّم المنتج» link (…#reviews): once the block
  // has content, bring it into view — the router's scroll-to-top ran first.
  useEffect(() => {
    if (!data || typeof window === "undefined" || window.location.hash !== "#reviews") return;
    document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [Boolean(data)]);

  // Prefill the form from the customer's existing review.
  useEffect(() => {
    if (!mine) return;
    setRating(mine.rating);
    setComment(mine.comment ?? "");
    setHideName(mine.hide_name);
  }, [mine?.rating, mine?.comment, mine?.hide_name]);

  const save = useMutation({
    mutationFn: () => submitProductReview(slug, { rating, comment: comment.trim() || undefined, hide_name: hideName }),
    onSuccess: (res) => {
      setNotice({ ok: true, text: res.message });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: reviewKeys.productAll(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(slug) });
    },
    onError: (err) => {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      setNotice({ ok: false, text: msg || t("reviews.failed") });
    },
  });

  if (!data && !isLoading) return null;
  if (data && !data.enabled) return null;

  const summary = data?.summary;
  const total = summary?.count ?? 0;
  const showForm = Boolean(data?.can_review) && (!mine || editing);

  return (
    <section className="sf-reviews-block" id="reviews">
      <h2 className="sf-reviews-block__title">
        <SolarIcon name="star-linear" className="sf-reviews-block__title-icon" />
        {t("reviews.title")}
        {total > 0 ? <span className="sf-reviews-block__total">({total})</span> : null}
      </h2>

      {isLoading ? (
        <div className="sf-skeleton w-full rounded-3xl" style={{ height: "8rem" }} />
      ) : (
        <>
          {total > 0 && summary ? (
            <div className="sf-reviews-block__summary sf-panel">
              <div className="sf-reviews-block__avg">
                <span className="sf-reviews-block__avg-value">{summary.avg?.toFixed(1)}</span>
                <RatingStars value={summary.avg} size="md" />
                <span className="sf-reviews-block__avg-count">{t("reviews.basedOn", { count: total })}</span>
              </div>
              <ul className="sf-reviews-block__bars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary.distribution[String(star)] ?? 0;
                  return (
                    <li key={star} className="sf-reviews-block__bar">
                      <span className="sf-reviews-block__bar-label">{star}</span>
                      <span className="sf-reviews-block__bar-track">
                        <span className="sf-reviews-block__bar-fill" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                      </span>
                      <span className="sf-reviews-block__bar-count">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {mine && !editing ? (
            <div className="sf-reviews-block__mine sf-panel">
              <div>
                <p className="sf-reviews-block__mine-title">{t("reviews.yourReview")}</p>
                <RatingStars value={mine.rating} />
                {mine.status === "hidden" ? <p className="sf-reviews-block__muted">{t("reviews.hiddenByStore")}</p> : null}
              </div>
              <button type="button" className="sf-btn sf-btn--tonal sf-btn--sm" onClick={() => setEditing(true)}>
                {t("reviews.edit")}
              </button>
            </div>
          ) : null}

          {showForm ? (
            <form
              className="sf-reviews-block__form sf-card sf-card--pad"
              onSubmit={(e) => {
                e.preventDefault();
                if (rating < 1 || save.isPending) return;
                setNotice(null);
                save.mutate();
              }}
            >
              <span className="sf-reviews-block__label">{t("reviews.yourRating")}</span>
              <StarPicker value={rating} onChange={setRating} />
              <textarea
                className="sf-input sf-reviews-block__textarea"
                rows={3}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("reviews.commentPlaceholder")}
              />
              <label className="sf-reviews-block__check">
                <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} />
                <span>
                  {t("reviews.hideName")}
                  <small className="sf-reviews-block__muted">{t("reviews.hideNameHint")}</small>
                </span>
              </label>
              <button type="submit" className="sf-btn sf-btn--primary" disabled={rating < 1 || save.isPending}>
                {save.isPending ? t("reviews.sending") : mine ? t("reviews.update") : t("reviews.submit")}
              </button>
            </form>
          ) : null}

          {notice ? (
            <p className={`sf-reviews-block__notice${notice.ok ? " is-ok" : " is-error"}`}>{notice.text}</p>
          ) : null}

          {data && data.data.length > 0 ? (
            <ul className="sf-reviews-block__list">
              {data.data.map((r) => (
                <li key={r.id} className="sf-reviews-block__item sf-card sf-card--pad">
                  <div className="sf-reviews-block__item-head">
                    <ReviewerName review={r} />
                    <RatingStars value={r.rating} />
                  </div>
                  {r.comment ? <p className="sf-reviews-block__comment">{r.comment}</p> : null}
                  <span className="sf-reviews-block__badge">
                    <SolarIcon name="verified-check-linear" /> {t("reviews.verifiedBuyer")}
                  </span>
                </li>
              ))}
            </ul>
          ) : total === 0 ? (
            <p className="sf-reviews-block__empty sf-card sf-card--pad">{t("reviews.empty")}</p>
          ) : null}

          {data && data.meta.last_page > 1 ? (
            <div className="sf-reviews-block__pager">
              <button type="button" className="sf-btn sf-btn--tonal sf-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t("reviews.prev")}
              </button>
              <span className="sf-reviews-block__muted">
                {page} / {data.meta.last_page}
              </span>
              <button
                type="button"
                className="sf-btn sf-btn--tonal sf-btn--sm"
                disabled={page >= data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("reviews.next")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default ProductReviews;
