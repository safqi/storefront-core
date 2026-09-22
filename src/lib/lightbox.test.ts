import { describe, expect, it } from "vitest";
import { clampPan, keyAction, stepIndex, swipeStep, SWIPE_THRESHOLD } from "./lightbox";

describe("stepIndex", () => {
  it("steps forward and backward", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(1, -1, 3)).toBe(0);
  });

  it("wraps at both ends", () => {
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });

  it("returns 0 for an empty set instead of NaN", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
    expect(stepIndex(3, -1, 0)).toBe(0);
  });
});

describe("swipeStep", () => {
  it("advances on a leftward drag and goes back on a rightward one", () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(80, 5)).toBe(-1);
  });

  it("ignores a drag shorter than the threshold", () => {
    expect(swipeStep(SWIPE_THRESHOLD - 1, 0)).toBe(0);
  });

  it("ignores a mostly-vertical drag — that was a scroll, not a page turn", () => {
    expect(swipeStep(60, 90)).toBe(0);
    expect(swipeStep(-60, 60)).toBe(0);
  });
});

describe("keyAction", () => {
  it("closes on Escape in either direction", () => {
    expect(keyAction("Escape", "rtl")).toEqual({ type: "close" });
    expect(keyAction("Escape", "ltr")).toEqual({ type: "close" });
  });

  it("maps arrows to visual direction in LTR", () => {
    expect(keyAction("ArrowRight", "ltr")).toEqual({ type: "step", delta: 1 });
    expect(keyAction("ArrowLeft", "ltr")).toEqual({ type: "step", delta: -1 });
  });

  it("flips the arrows in RTL — the next photo is to the LEFT in Arabic", () => {
    expect(keyAction("ArrowRight", "rtl")).toEqual({ type: "step", delta: -1 });
    expect(keyAction("ArrowLeft", "rtl")).toEqual({ type: "step", delta: 1 });
  });

  it("leaves unrelated keys alone", () => {
    expect(keyAction("a", "rtl")).toBeNull();
    expect(keyAction("Enter", "ltr")).toBeNull();
  });
});

describe("clampPan", () => {
  it("allows no travel at 1x — nothing overflows the frame", () => {
    expect(clampPan(120, 400, 1)).toBe(0);
    expect(clampPan(-120, 400, 1)).toBe(0);
  });

  it("caps travel at half the overflow on each side", () => {
    // 400px frame at 2.5x overflows by 600px total → 300px each way.
    expect(clampPan(1000, 400, 2.5)).toBe(300);
    expect(clampPan(-1000, 400, 2.5)).toBe(-300);
    expect(clampPan(50, 400, 2.5)).toBe(50);
  });

  it("treats a sub-1 scale as 1 rather than inverting the limit", () => {
    expect(clampPan(40, 400, 0.5)).toBe(0);
  });
});
