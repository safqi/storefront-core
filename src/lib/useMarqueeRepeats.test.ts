import { describe, expect, it } from "vitest";
import { MAX_MARQUEE_REPEATS, marqueeRepeats } from "./useMarqueeRepeats";

describe("marqueeRepeats", () => {
  it("uses a single copy when one copy already covers the bar", () => {
    expect(marqueeRepeats(800, 800)).toBe(1);
    expect(marqueeRepeats(800, 2400)).toBe(1);
  });

  it("repeats enough times to cover the bar", () => {
    // 200px copy in an 800px bar: 4 copies per half, so the half never leaves a
    // stretched gap and the strip reads as one continuous stream.
    expect(marqueeRepeats(800, 200)).toBe(4);
    expect(marqueeRepeats(868, 202.4)).toBe(5);
  });

  it("rounds up, never leaving the tail of the bar uncovered", () => {
    expect(marqueeRepeats(800, 300)).toBe(3);
    expect(marqueeRepeats(801, 800)).toBe(2);
  });

  it("caps the copy count so a tiny message cannot flood the DOM", () => {
    expect(marqueeRepeats(4000, 1)).toBe(MAX_MARQUEE_REPEATS);
  });

  it("falls back to one copy for anything unmeasurable", () => {
    // A pre-layout frame reports zeros; rendering the plain two-copy track then
    // is right, and the ResizeObserver corrects it once widths are real.
    expect(marqueeRepeats(0, 0)).toBe(1);
    expect(marqueeRepeats(800, 0)).toBe(1);
    expect(marqueeRepeats(0, 200)).toBe(1);
    expect(marqueeRepeats(-100, 200)).toBe(1);
    expect(marqueeRepeats(Number.NaN, 200)).toBe(1);
    expect(marqueeRepeats(800, Number.POSITIVE_INFINITY)).toBe(1);
  });
});
