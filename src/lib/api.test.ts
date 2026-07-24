import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { fetchProductsPage, fetchProducts } from "./api";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

afterEach(() => vi.clearAllMocks());

describe("fetchProductsPage (cursor listing)", () => {
  it("unwraps `data` and maps meta.next_cursor → nextCursor", async () => {
    mockedGet.mockResolvedValue({
      data: {
        data: [{ id: 1 }, { id: 2 }],
        meta: { next_cursor: "eyJpZCI6Mn0" },
        links: {},
      },
    });

    const page = await fetchProductsPage({ sort: "price_asc" });

    expect(page.data).toHaveLength(2);
    expect(page.nextCursor).toBe("eyJpZCI6Mn0");
  });

  it("returns nextCursor=null on the last page", async () => {
    mockedGet.mockResolvedValue({
      data: { data: [{ id: 9 }], meta: { next_cursor: null }, links: {} },
    });

    const page = await fetchProductsPage();
    expect(page.nextCursor).toBeNull();
  });

  it("forwards the cursor token as a query param only when present", async () => {
    mockedGet.mockResolvedValue({ data: { data: [], meta: { next_cursor: null } } });

    await fetchProductsPage({ sort: "latest", brand: "" }, "CURSOR123");

    const [, config] = mockedGet.mock.calls[0];
    expect(config?.params).toMatchObject({ sort: "latest", cursor: "CURSOR123" });
    // Empty filter values are cleaned out.
    expect(config?.params).not.toHaveProperty("brand");
  });

  it("omits the cursor param on the first page", async () => {
    mockedGet.mockResolvedValue({ data: { data: [], meta: {} } });

    await fetchProductsPage({ sort: "latest" });

    const [, config] = mockedGet.mock.calls[0];
    expect(config?.params).not.toHaveProperty("cursor");
  });
});

describe("fetchProducts (one-shot, unchanged)", () => {
  it("still returns the bare data array", async () => {
    mockedGet.mockResolvedValue({ data: { data: [{ id: 1 }] } });
    expect(await fetchProducts()).toEqual([{ id: 1 }]);
  });
});
