// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (window as any).appConfig = { APP_LANG: "ar" };
});

import axios from "axios";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  fetchProductReviews,
  fetchReviews,
  reportStore,
  starFill,
  submitProductReview,
} from "./reviews";
import { RatingStars } from "../components/RatingStars";
import { ReviewerName } from "../components/ReviewerName";
import { reviewFeedQuery } from "../sections/CustomerReviewsSection";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);
const mockedPost = vi.mocked(axios.post);

afterEach(() => vi.clearAllMocks());

describe("starFill", () => {
  it("snaps to half stars and clamps to 0..5", () => {
    expect(starFill(4.5)).toEqual([1, 1, 1, 1, 0.5]);
    expect(starFill(4.3)).toEqual([1, 1, 1, 1, 0.5]);
    expect(starFill(4.2)).toEqual([1, 1, 1, 1, 0]);
    expect(starFill(7)).toEqual([1, 1, 1, 1, 1]);
    expect(starFill(null)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("fetchProductReviews", () => {
  it("fills safe defaults for a sparse payload", async () => {
    mockedGet.mockResolvedValue({ data: { data: [{ id: 1 }] } });

    const res = await fetchProductReviews("tea", 2);

    expect(mockedGet).toHaveBeenCalledWith("products/tea/reviews", { params: { page: 2 } });
    expect(res.enabled).toBe(false);
    expect(res.can_review).toBe(false);
    expect(res.my_review).toBeNull();
    expect(res.summary.count).toBe(0);
    expect(res.data).toHaveLength(1);
  });
});

describe("fetchReviews", () => {
  it("drops empty params and encodes with_comment as 1", async () => {
    mockedGet.mockResolvedValue({ data: { data: [] } });

    await fetchReviews({ product: "", min_rating: 4, with_comment: true, limit: 6, sort: "top" });

    expect(mockedGet).toHaveBeenCalledWith("reviews", {
      params: { min_rating: 4, with_comment: 1, limit: 6, sort: "top" },
    });
  });
});

describe("writes", () => {
  it("posts a review and a store report to the right paths", async () => {
    mockedPost.mockResolvedValue({ data: { message: "ok" } });

    await submitProductReview("a b", { rating: 5, hide_name: true });
    await reportStore({ reason: "fraud", details: "تفاصيل كافية جداً" });

    expect(mockedPost).toHaveBeenNthCalledWith(1, "products/a%20b/reviews", { rating: 5, hide_name: true });
    expect(mockedPost).toHaveBeenNthCalledWith(2, "store/reports", { reason: "fraud", details: "تفاصيل كافية جداً" });
  });
});

describe("reviewFeedQuery", () => {
  it("only sends a product slug when the source is a single product", () => {
    expect(reviewFeedQuery({ source: "all", product: "tea" })).toEqual({
      min_rating: 4,
      with_comment: true,
      limit: 8,
      sort: "latest",
    });
    expect(reviewFeedQuery({ source: "product", product: "tea", sort: "top", limit: 3, min_rating: 5, with_comment: false })).toEqual({
      product: "tea",
      min_rating: 5,
      with_comment: false,
      limit: 3,
      sort: "top",
    });
  });
});

describe("RatingStars / ReviewerName", () => {
  it("renders nothing without a rating", () => {
    expect(renderToStaticMarkup(createElement(RatingStars, { value: null }))).toBe("");
    expect(renderToStaticMarkup(createElement(RatingStars, { value: 0 }))).toBe("");
  });

  it("renders a count and a half star", () => {
    const html = renderToStaticMarkup(createElement(RatingStars, { value: 3.5, count: 12, showValue: true }));
    expect(html).toContain("sf-stars__half");
    expect(html).toContain("(12)");
    expect(html).toContain("3.5");
  });

  it("blurs a hidden reviewer and hides it from assistive tech", () => {
    const hidden = renderToStaticMarkup(createElement(ReviewerName, { review: { name: "اسم العميل", name_hidden: true } }));
    expect(hidden).toContain("sf-reviewer--hidden");
    expect(hidden).toContain('aria-hidden="true"');

    const shown = renderToStaticMarkup(createElement(ReviewerName, { review: { name: "منى", name_hidden: false } }));
    expect(shown).not.toContain("sf-reviewer--hidden");
  });
});
