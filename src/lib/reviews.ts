import axios from "axios";
import type {
  ReviewFeedQuery,
  StorefrontProductReviews,
  StorefrontReview,
  StoreReportReason,
} from "../types/review";

/**
 * Verified-buyer product reviews + «الإبلاغ عن المتجر».
 *
 * Reading is public. Writing a review needs a signed-in customer whose order
 * containing the product was delivered (`can_review`); re-submitting edits the
 * existing review. Reports go to the PLATFORM, never to the merchant.
 */

export const reviewKeys = {
  product: (slug: string, page = 1) => ["product-reviews", slug, page] as const,
  productAll: (slug: string) => ["product-reviews", slug] as const,
  feed: (params: ReviewFeedQuery = {}) => ["reviews-feed", params] as const,
};

export async function fetchProductReviews(
  slug: string,
  page = 1,
): Promise<StorefrontProductReviews> {
  const { data } = await axios.get(`products/${encodeURIComponent(slug)}/reviews`, {
    params: { page },
  });
  return {
    enabled: data?.enabled ?? false,
    summary: data?.summary ?? { avg: null, count: 0, distribution: {} },
    can_review: data?.can_review ?? false,
    my_review: data?.my_review ?? null,
    data: data?.data ?? [],
    meta: data?.meta ?? { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  };
}

export interface ReviewInput {
  rating: number;
  comment?: string;
  /** Hide my name on the storefront (the merchant still sees it). */
  hide_name?: boolean;
}

/** Create or update the signed-in customer's review. */
export async function submitProductReview(
  slug: string,
  body: ReviewInput,
): Promise<{ message: string; data: StorefrontReview }> {
  const { data } = await axios.post(`products/${encodeURIComponent(slug)}/reviews`, body);
  return data;
}

export async function deleteProductReview(slug: string): Promise<{ message: string }> {
  const { data } = await axios.delete(`products/${encodeURIComponent(slug)}/reviews`);
  return data;
}

/** Store-wide published reviews (the «تقييمات العملاء» section). */
export async function fetchReviews(params: ReviewFeedQuery = {}): Promise<StorefrontReview[]> {
  const clean: Record<string, string | number> = {};
  if (params.product) clean.product = params.product;
  if (params.min_rating) clean.min_rating = params.min_rating;
  if (params.with_comment) clean.with_comment = 1;
  if (params.limit) clean.limit = params.limit;
  if (params.sort) clean.sort = params.sort;

  const { data } = await axios.get("reviews", { params: clean });
  return data?.data ?? [];
}

/** Clamp to [0,5] and snap to the nearest half star — what a star row can draw. */
export function starFill(value: number | null | undefined): number[] {
  const v = Math.min(5, Math.max(0, Math.round((Number(value) || 0) * 2) / 2));
  return [1, 2, 3, 4, 5].map((i) => (v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0));
}

// ─── Store reports ──────────────────────────────────────────────────────────

export const STORE_REPORT_REASONS: StoreReportReason[] = [
  "fraud",
  "not_delivered",
  "fake_products",
  "misleading_info",
  "other",
];

export interface StoreReportInput {
  reason: StoreReportReason;
  /** At least 10 characters. */
  details: string;
  /** Optional — must be one of the reporter's own orders in this store. */
  order_number?: string;
}

/** Report this store to the platform. 409 = an open report already exists. */
export async function reportStore(body: StoreReportInput): Promise<{ message: string }> {
  const { data } = await axios.post("store/reports", body);
  return data;
}
