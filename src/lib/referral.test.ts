// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildShareUrl, captureReferral, referralFor } from "./referral";

const DAY = 24 * 60 * 60 * 1000;
const loc = (pathname: string, search = "") => ({ pathname, search });

describe("referral attribution", () => {
  beforeEach(() => {
    localStorage.clear();
    (window as any).appConfig = { ...((window as any).appConfig ?? {}), REFERRAL: { attribution_days: 7 } };
  });
  afterEach(() => {
    delete (window as any).appConfig.REFERRAL;
  });

  it("remembers the code against the shared product path only", () => {
    expect(captureReferral(loc("/products/coffee", "?ref=abcd1234"), 0)).toBe("ABCD1234");
    expect(referralFor("coffee", 1)).toBe("ABCD1234");
    expect(referralFor("tea", 1)).toBeUndefined();
  });

  it("expires after the store's attribution window", () => {
    captureReferral(loc("/products/coffee", "?ref=ABCD1234"), 0);
    expect(referralFor("coffee", 6 * DAY)).toBe("ABCD1234");
    expect(referralFor("coffee", 8 * DAY)).toBeUndefined();
  });

  it("last click wins for the same product", () => {
    captureReferral(loc("/products/coffee", "?ref=FIRST111"), 0);
    captureReferral(loc("/products/coffee/", "?ref=SECOND22"), 10);
    expect(referralFor("coffee", 20)).toBe("SECOND22");
  });

  it("ignores malformed codes and a disabled program", () => {
    expect(captureReferral(loc("/products/coffee", "?ref=<script>"), 0)).toBeNull();
    delete (window as any).appConfig.REFERRAL;
    expect(captureReferral(loc("/products/coffee", "?ref=ABCD1234"), 0)).toBeNull();
    expect(referralFor("coffee", 1)).toBeUndefined();
  });

  it("matches Arabic slugs through URL encoding", () => {
    captureReferral(loc("/products/%D9%82%D9%87%D9%88%D8%A9", "?ref=ABCD1234"), 0);
    expect(referralFor("قهوة", 1)).toBe("ABCD1234");
  });

  it("builds a share URL that replaces any existing ref", () => {
    expect(buildShareUrl("https://shop.test/products/x?ref=OLD11111&a=1", "NEW22222")).toBe(
      "https://shop.test/products/x?a=1&ref=NEW22222",
    );
    expect(buildShareUrl("https://shop.test/products/x?ref=OLD11111", null)).toBe("https://shop.test/products/x");
  });
});
