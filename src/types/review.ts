// ─── Product reviews (`/api/v1/products/{slug}/reviews`, `/api/v1/reviews`) ──
// Shaped by `App\Http\Resources\Api\ProductReviewResource`.

/** One published, verified-buyer review. */
export interface StorefrontReview {
  id: number;
  /** 1..5 */
  rating: number;
  comment: string | null;
  /**
   * Reviewer display name. When `name_hidden` is true this is a fixed
   * placeholder — the real name never leaves the server. Render it blurred
   * (see `<ReviewerName/>`).
   */
  name: string;
  name_hidden: boolean;
  created_at: string | null;
  /** Present on the store-wide feed (`fetchReviews`) only. */
  product?: { name: string; slug: string; image: string | null } | null;
}

export interface StorefrontReviewSummary {
  /** Average of published reviews, 1 decimal; null when there are none. */
  avg: number | null;
  count: number;
  /** Count per star, keyed "5".."1". */
  distribution: Record<string, number>;
}

/** The caller's own review (signed-in customers only). */
export interface StorefrontMyReview {
  rating: number;
  comment: string | null;
  hide_name: boolean;
  status: "published" | "hidden";
}

export interface StorefrontProductReviews {
  /** Whether the store accepts reviews at all. */
  enabled: boolean;
  summary: StorefrontReviewSummary;
  /** True when the signed-in customer received this product (delivered order). */
  can_review: boolean;
  my_review: StorefrontMyReview | null;
  data: StorefrontReview[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

/** Filters for the store-wide feed behind the «تقييمات العملاء» section. */
export interface ReviewFeedQuery {
  product?: string;
  min_rating?: number;
  with_comment?: boolean;
  limit?: number;
  sort?: "latest" | "top";
}

export type StoreReportReason =
  | "fraud"
  | "not_delivered"
  | "fake_products"
  | "misleading_info"
  | "other";
