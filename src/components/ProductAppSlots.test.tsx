// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => ({ default: { get, defaults: { headers: { common: {} } } } }));

import { ProductAppSlots } from "./ProductAppSlots";
import { installAppRegistry } from "../lib/appSlots";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = { id: 7, slug: "shirt", name: "قميص" };
let container: HTMLDivElement;
let root: Root;

function setApps(apps: unknown[]) {
  (window as unknown as { appConfig: unknown }).appConfig = {
    API_URL: "https://shop.test/api/v1",
    APP_LANG: "ar",
    apps,
  };
}

async function render(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  });
  // let the query resolve and effects flush
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  get.mockReset();
  delete (window as unknown as { SafqiApps?: unknown }).SafqiApps;
  document.head.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const sizeGuide = {
  slug: "size-guide",
  productSlots: [{ key: "size_guide", position: "below_variants", replaces: "size_chart" }],
};

describe("ProductAppSlots", () => {
  it("fires no request when no app declares a slot there", async () => {
    setApps([{ slug: "google-analytics" }, sizeGuide]);

    await render(<ProductAppSlots product={product} position="below_description" />);

    expect(get).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe("");
  });

  it("injects the html + css and mounts the app's handler with context", async () => {
    setApps([sizeGuide]);
    const mount = vi.fn();
    installAppRegistry().register("size-guide", { mount });
    get.mockResolvedValue({ status: 200, data: { html: "<button data-x>دليل</button>", css: ".x{}" } });

    await render(<ProductAppSlots product={product} position="below_variants" />);

    expect(get).toHaveBeenCalledWith("https://shop.test/api/apps/size-guide/product-slots/size_guide", {
      params: { product: "shirt" },
    });
    const slot = container.querySelector('[data-app-slot="size-guide:size_guide"]') as HTMLElement;
    expect(slot.querySelector("[data-x]")?.textContent).toBe("دليل");
    expect(document.head.querySelector('style[data-app-slot="size-guide:size_guide"]')?.textContent).toBe(".x{}");
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount.mock.calls[0][0]).toBe(slot);
    expect(mount.mock.calls[0][1]).toMatchObject({
      slug: "size-guide",
      key: "size_guide",
      product,
      variant: null,
      apiUrl: "https://shop.test/api/apps/size-guide",
      lang: "ar",
    });
  });

  it("renders nothing on 204", async () => {
    setApps([sizeGuide]);
    get.mockResolvedValue({ status: 204, data: "" });

    await render(<ProductAppSlots product={product} position="below_variants" />);

    expect(container.querySelector("[data-app-slot]")).toBeNull();
  });

  it("mounts a handler that registers after the html arrived", async () => {
    setApps([sizeGuide]);
    get.mockResolvedValue({ status: 200, data: { html: "<p>x</p>", css: null } });

    await render(<ProductAppSlots product={product} position="below_variants" />);

    const mount = vi.fn();
    await act(async () => installAppRegistry().register("size-guide", { mount }));

    expect(mount).toHaveBeenCalledTimes(1);
  });

  it("calls update on variant change and unmount on teardown", async () => {
    setApps([sizeGuide]);
    const h = { mount: vi.fn(), update: vi.fn(), unmount: vi.fn() };
    installAppRegistry().register("size-guide", h);
    get.mockResolvedValue({ status: 200, data: { html: "<p>x</p>", css: null } });

    await render(<ProductAppSlots product={product} position="below_variants" variant={null} />);
    h.update.mockClear();

    await render(<ProductAppSlots product={product} position="below_variants" variant={{ id: 3, name: "M" }} />);
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.update.mock.calls[0][1].variant).toEqual({ id: 3, name: "M" });

    act(() => root.unmount());
    expect(h.unmount).toHaveBeenCalled();
    root = createRoot(container);
  });

  it("survives a handler that throws", async () => {
    setApps([sizeGuide]);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    installAppRegistry().register("size-guide", {
      mount: () => {
        throw new Error("boom");
      },
    });
    get.mockResolvedValue({ status: 200, data: { html: "<p>ok</p>", css: null } });

    await render(<ProductAppSlots product={product} position="below_variants" />);

    expect(container.textContent).toBe("ok");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
