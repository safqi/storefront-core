import { describe, expect, it } from "vitest";
import { redeemablePreview } from "./commerce";

const program = (attrs: Partial<Parameters<typeof redeemablePreview>[0] & object> = {}) => ({
  earn_points_per_unit: 1,
  redeem_point_value: 0.01,
  redeem_max_percent: 50,
  min_redeem_points: 0,
  ...attrs,
});

describe("redeemablePreview", () => {
  it("caps points by the share of the subtotal and values them", () => {
    expect(redeemablePreview(program(), 10_000, 40)).toEqual({ points: 2000, value: 20 });
    expect(redeemablePreview(program(), 500, 40)).toEqual({ points: 500, value: 5 });
  });

  it("is zero without a program, below the minimum, or with a zero point value", () => {
    expect(redeemablePreview(null, 100, 40)).toEqual({ points: 0, value: 0 });
    expect(redeemablePreview(program({ min_redeem_points: 200 }), 100, 40)).toEqual({ points: 0, value: 0 });
    expect(redeemablePreview(program({ redeem_point_value: 0 }), 100, 40)).toEqual({ points: 0, value: 0 });
  });

  it("does not drop a point to float error on a converted point value", () => {
    // A point worth 1 IQD seen in USD is $0.0008; 0.18 / 0.0008 is 224.99999…
    expect(redeemablePreview(program({ redeem_point_value: 0.0008, redeem_max_percent: 100 }), 10_000, 0.18)).toEqual({
      points: 225,
      value: 0.18,
    });
  });
});
