// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProductSlots,
  injectSlotStyle,
  installAppRegistry,
  isProductBlockReplaced,
  type AppSlotHandler,
} from "./appSlots";

const handler = (): AppSlotHandler => ({ mount: vi.fn(), update: vi.fn(), unmount: vi.fn() });

function setApps(apps: unknown[]) {
  (window as unknown as { appConfig: unknown }).appConfig = { API_URL: "https://shop.test/api/v1", apps };
}

describe("installAppRegistry", () => {
  it("drains registrations queued by app scripts before boot", () => {
    const early = handler();
    const host: Record<string, unknown> = {
      SafqiApps: { _q: [["size-guide", early]], register() {} },
    };

    const registry = installAppRegistry(host);

    expect(registry.get("size-guide")).toBe(early);
    expect(host.SafqiApps).toBe(registry);
  });

  it("accepts registrations after boot and notifies subscribers", () => {
    const registry = installAppRegistry({});
    const seen: string[] = [];
    const off = registry.subscribe((slug) => seen.push(slug));

    const late = handler();
    registry.register("late-app", late);
    off();
    registry.register("other", handler());

    expect(registry.get("late-app")).toBe(late);
    expect(seen).toEqual(["late-app"]);
  });

  it("is idempotent — a second install returns the same registry", () => {
    const host = {};
    expect(installAppRegistry(host)).toBe(installAppRegistry(host));
  });

  it("ignores a registration without a mount function", () => {
    const registry = installAppRegistry({});
    registry.register("broken", {} as AppSlotHandler);
    expect(registry.get("broken")).toBeUndefined();
  });
});

describe("product slot declarations", () => {
  beforeEach(() =>
    setApps([
      { slug: "size-guide", productSlots: [{ key: "size_guide", position: "below_variants", replaces: "size_chart" }] },
      { slug: "reviews-plus", productSlots: [{ key: "badges", position: "below_description", replaces: null }] },
      { slug: "google-analytics" },
    ]),
  );

  it("lists slots for a position, tagged with their app", () => {
    expect(getProductSlots("below_variants")).toEqual([
      { slug: "size-guide", key: "size_guide", position: "below_variants", replaces: "size_chart" },
    ]);
    expect(getProductSlots("below_description").map((s) => s.slug)).toEqual(["reviews-plus"]);
  });

  it("knows which built-in blocks an app replaces", () => {
    expect(isProductBlockReplaced("size_chart")).toBe(true);
    expect(isProductBlockReplaced("specifications")).toBe(false);
  });

  it("is empty when no app declares slots", () => {
    setApps([{ slug: "google-analytics" }]);
    expect(getProductSlots("below_variants")).toEqual([]);
    expect(isProductBlockReplaced("size_chart")).toBe(false);
  });
});

describe("injectSlotStyle", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("creates one tag per slot and updates it in place", () => {
    injectSlotStyle("size-guide:size_guide", ".a{}");
    injectSlotStyle("size-guide:size_guide", ".b{}");

    const tags = document.head.querySelectorAll('style[data-app-slot="size-guide:size_guide"]');
    expect(tags).toHaveLength(1);
    expect(tags[0].textContent).toBe(".b{}");
  });

  it("removes the tag when the slot sends no css", () => {
    injectSlotStyle("x:y", ".a{}");
    injectSlotStyle("x:y", null);
    expect(document.head.querySelector('style[data-app-slot="x:y"]')).toBeNull();
  });
});
