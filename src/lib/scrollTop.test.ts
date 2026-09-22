import { describe, expect, it } from "vitest";
import { shouldScrollToTop, type ScrollDecision } from "./scrollTop";

const decision = (over: Partial<ScrollDecision> = {}): ScrollDecision => ({
  from: "/",
  to: "/products/coffee",
  hash: "",
  navigationType: "PUSH",
  ...over,
});

describe("shouldScrollToTop", () => {
  it("scrolls on a forward navigation to another page", () => {
    expect(shouldScrollToTop(decision())).toBe(true);
    expect(shouldScrollToTop(decision({ navigationType: "REPLACE" }))).toBe(true);
  });

  it("leaves back/forward alone so the browser can restore the offset", () => {
    expect(shouldScrollToTop(decision({ navigationType: "POP" }))).toBe(false);
  });

  it("respects an in-page anchor", () => {
    expect(shouldScrollToTop(decision({ hash: "#reviews" }))).toBe(false);
  });

  it("stays put when only the query string changed", () => {
    // Filter/sort/pagination edits keep the shopper on the same screen.
    expect(shouldScrollToTop(decision({ from: "/search", to: "/search" }))).toBe(false);
  });

  it("does nothing on the first render", () => {
    expect(shouldScrollToTop(decision({ from: undefined }))).toBe(false);
  });

  it("navigating to the same path from a different one still scrolls", () => {
    // Product → related product: the classic "opens half-way down" bug.
    expect(
      shouldScrollToTop(decision({ from: "/products/a", to: "/products/b" })),
    ).toBe(true);
  });
});
