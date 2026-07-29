import { describe, expect, it } from "vitest";
import {
    computeVelocity,
    isCoastFinished,
    isDrag,
    isFlick,
    MIN_COAST_VELOCITY,
    MIN_FLICK_VELOCITY,
    VELOCITY_WINDOW_MS,
    type DragSample,
} from "./useDragScroll";

/**
 * The hook's DOM wiring needs a browser, but the decisions that make a drag
 * feel right or wrong are pure arithmetic — so they live as exported functions
 * and are tested here, in the package's node-environment vitest setup.
 */

describe("computeVelocity", () => {
    it("returns 0 for a trail too short to measure", () => {
        expect(computeVelocity([])).toBe(0);
        expect(computeVelocity([{ x: 10, t: 0 }])).toBe(0);
    });

    it("measures px/ms across the trail", () => {
        const samples: DragSample[] = [
            { x: 0, t: 0 },
            { x: 50, t: 50 },
        ];
        expect(computeVelocity(samples)).toBeCloseTo(1);
    });

    it("is signed — a leftward drag reports negative velocity", () => {
        const samples: DragSample[] = [
            { x: 200, t: 0 },
            { x: 100, t: 50 },
        ];
        expect(computeVelocity(samples)).toBeCloseTo(-2);
    });

    /**
     * The behaviour that makes a drag feel correct: a shopper who drags across
     * the row, pauses on an item, then lets go has released at REST. Averaging
     * over the whole gesture would report the fast opening movement and throw
     * the row out from under them.
     */
    it("ignores movement older than the window, so a pause before release stops the row", () => {
        const samples: DragSample[] = [
            { x: 0, t: 0 },
            { x: 300, t: 100 }, // a fast opening drag…
            { x: 302, t: 400 }, // …then 300ms of near-stillness
            { x: 303, t: 500 },
        ];
        const v = computeVelocity(samples, VELOCITY_WINDOW_MS);
        expect(Math.abs(v)).toBeLessThan(MIN_FLICK_VELOCITY);
        expect(isFlick(v)).toBe(false);
    });

    it("falls back to the last pair when every sample is older than the window", () => {
        const samples: DragSample[] = [
            { x: 0, t: 0 },
            { x: 100, t: 1000 },
            { x: 200, t: 2000 },
        ];
        // Nothing is within 100ms of the last sample, so the final pair is used.
        expect(computeVelocity(samples)).toBeCloseTo(0.1);
    });

    it("returns 0 rather than dividing by zero on duplicate timestamps", () => {
        const samples: DragSample[] = [
            { x: 0, t: 5 },
            { x: 80, t: 5 },
        ];
        expect(computeVelocity(samples)).toBe(0);
        expect(Number.isFinite(computeVelocity(samples))).toBe(true);
    });
});

describe("isFlick", () => {
    it("treats a slow release as a stop", () => {
        expect(isFlick(0)).toBe(false);
        expect(isFlick(MIN_FLICK_VELOCITY / 2)).toBe(false);
    });

    it("treats a fast release as a throw, in either direction", () => {
        expect(isFlick(1.2)).toBe(true);
        expect(isFlick(-1.2)).toBe(true);
    });

    it("is inclusive at the threshold", () => {
        expect(isFlick(MIN_FLICK_VELOCITY)).toBe(true);
    });
});

describe("isCoastFinished", () => {
    it("keeps coasting while the row still has speed", () => {
        expect(isCoastFinished(0.5)).toBe(false);
        expect(isCoastFinished(-0.5)).toBe(false);
    });

    it("stops once decayed below the floor", () => {
        expect(isCoastFinished(MIN_COAST_VELOCITY / 2)).toBe(true);
        expect(isCoastFinished(0)).toBe(true);
    });

    /**
     * Guards the friction contract: whatever decay factor a caller passes, the
     * coast must terminate. A friction of 1 would spin forever, so the default
     * must remain < 1 and the floor must be reachable from a plausible flick.
     */
    it("terminates from a hard flick under the default friction", () => {
        let v = 5; // a very fast throw
        let frames = 0;
        while (!isCoastFinished(v) && frames < 10_000) {
            v *= 0.95;
            frames++;
        }
        expect(isCoastFinished(v)).toBe(true);
        expect(frames).toBeLessThan(200); // ~3s at 60fps, not an endless glide
    });
});

describe("isDrag", () => {
    it("treats a still pointer as a click, so cards stay clickable", () => {
        expect(isDrag(0, 0, 5)).toBe(false);
        expect(isDrag(3, 3, 5)).toBe(false); // hypot ≈ 4.24
    });

    it("treats real travel as a drag, so the click is swallowed", () => {
        expect(isDrag(40, 0, 5)).toBe(true);
        expect(isDrag(-40, 0, 5)).toBe(true);
    });

    /**
     * Diagonal movement counts: a shopper dragging a shelf while their hand
     * drifts vertically is still dragging, and tapping through to the product
     * would be wrong.
     */
    it("measures diagonal distance, not just the horizontal axis", () => {
        expect(isDrag(4, 4, 5)).toBe(true); // hypot ≈ 5.66
        expect(isDrag(0, 40, 5)).toBe(true);
    });
});
