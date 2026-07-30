import { describe, expect, it } from "vitest";
import { parseAppSectionType } from "./AppSection";

describe("parseAppSectionType", () => {
  it("splits a well-formed app section type", () => {
    expect(parseAppSectionType("app:brew-specs:featured_recipes")).toEqual({
      slug: "brew-specs",
      key: "featured_recipes",
    });
  });

  it("keeps colons that belong to the key", () => {
    // The key is whatever the app declared; only the first two segments are
    // structural.
    expect(parseAppSectionType("app:my-app:group:sub")).toEqual({
      slug: "my-app",
      key: "group:sub",
    });
  });

  it.each([
    ["a core type", "product_grid"],
    ["a theme type", "hero"],
    ["the bare prefix", "app:"],
    ["a slug with no key", "app:brew-specs"],
    ["a key with no slug", "app::featured"],
    ["empty", ""],
  ])("returns null for %s", (_label, type) => {
    expect(parseAppSectionType(type)).toBeNull();
  });
});
