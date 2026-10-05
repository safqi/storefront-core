import { describe, expect, it } from "vitest";
import { extractIconNames, subsetCollection } from "./icons";

const SOLAR = {
  prefix: "solar",
  width: 24,
  height: 24,
  icons: {
    "bell-linear": { body: "<path d='bell'/>" },
    "cart-large-2-linear": { body: "<path d='cart'/>" },
    "unused-linear": { body: "<path d='x'/>" },
  },
  aliases: {
    "bell-alias": { parent: "bell-linear" },
    "alias-of-alias": { parent: "bell-alias", hFlip: true },
    "broken-alias": { parent: "missing" },
  },
};

describe("extractIconNames", () => {
  const prefixes = new Set(["solar", "logos"]);

  it("buckets prefixed ids by set and bare names under the default prefix", () => {
    const names = extractIconNames(
      `<SolarIcon name="bell-linear" /> cart: "solar:cart-large-2-linear", brand: 'logos:visa'`,
      prefixes,
      "solar",
    );
    expect([...names.get("solar")!]).toEqual(
      expect.arrayContaining(["bell-linear", "cart-large-2-linear"]),
    );
    expect([...names.get("logos")!]).toEqual(["visa"]);
  });

  it("ignores prefixes that are not loaded", () => {
    const names = extractIconNames(`"mdi:home"`, prefixes, "solar");
    expect(names.get("mdi")).toBeUndefined();
  });

  it("collects bare names only when the default set is loaded", () => {
    const names = extractIconNames(`"bell-linear"`, new Set(["logos"]), "solar");
    expect(names.size).toBe(0);
  });
});

describe("subsetCollection", () => {
  it("keeps only the requested icons and the set dimensions", () => {
    const out = subsetCollection(SOLAR, ["bell-linear", "not-an-icon"])!;
    expect(Object.keys(out.icons)).toEqual(["bell-linear"]);
    expect(out.aliases).toBeUndefined();
    expect(out).toMatchObject({ prefix: "solar", width: 24, height: 24 });
  });

  it("follows alias chains and includes their parents", () => {
    const out = subsetCollection(SOLAR, ["alias-of-alias"])!;
    expect(Object.keys(out.icons)).toEqual(["bell-linear"]);
    expect(Object.keys(out.aliases!).sort()).toEqual(["alias-of-alias", "bell-alias"]);
  });

  it("drops aliases whose parent does not exist", () => {
    expect(subsetCollection(SOLAR, ["broken-alias"])).toBeNull();
  });

  it("returns null when nothing matched", () => {
    expect(subsetCollection(SOLAR, ["foo", "bar"])).toBeNull();
  });
});
