// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// i18n resolves the language at module load.
vi.hoisted(() => {
  (window as any).appConfig = { APP_LANG: "en" };
});

import { soldCountLabel } from "./sales";

describe("soldCountLabel", () => {
  it("renders nothing for a hidden, missing or zero count", () => {
    expect(soldCountLabel(null)).toBeNull();
    expect(soldCountLabel(undefined)).toBeNull();
    expect(soldCountLabel(0)).toBeNull();
    expect(soldCountLabel(-3)).toBeNull();
    expect(soldCountLabel(Number.NaN)).toBeNull();
  });

  it("picks the singular form for one sale", () => {
    expect(soldCountLabel(1)).toBe("Sold once");
  });

  it("picks the plural form and formats the number", () => {
    expect(soldCountLabel(10)).toBe("Sold 10 times");
    expect(soldCountLabel(1500)).toBe("Sold 1,500 times");
  });
});
