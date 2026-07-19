import axios from "axios";
import type {
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductQuestions,
} from "../types/product";
import type {
  StorefrontBrandFull,
  StorefrontCategory,
  StorefrontFilters,
} from "../types/catalog";

/**
 * Storefront data layer — thin query functions over the public `/api/v1/*`
 * endpoints. `axios.defaults.baseURL` is set once in `main.tsx`, so paths are
 * relative here. Each endpoint may return either a bare payload or a Laravel
 * resource wrapper (`{ data: ... }`); we unwrap defensively.
 */

export type ProductSort = "latest" | "price_asc" | "price_desc" | "popular";

/** Filters accepted by the products listing endpoint. */
export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  sort?: ProductSort;
  in_stock?: boolean;
  min_price?: string;
  max_price?: string;
  /** CSV of attribute_value ids, e.g. "5,8,20". */
  attributes?: string;
}

/** The context the filter facets are computed for — listing params minus sort/price/attributes. */
export type FilterContext = Pick<
  ProductQuery,
  "search" | "category" | "brand" | "in_stock"
>;

/** Drop empty/undefined params so query keys stay stable and URLs stay clean. */
function clean(params: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

/** Query keys — keep them centralized so invalidation stays consistent. */
export const queryKeys = {
  products: (params: ProductQuery = {}) => ["products", clean(params)] as const,
  product: (slug: string) => ["product", slug] as const,
  productQuestions: (slug: string) => ["product-questions", slug] as const,
  categories: ["categories"] as const,
  brands: ["brands"] as const,
  filters: (params: FilterContext = {}) => ["filters", clean(params)] as const,
};

export async function fetchProducts(
  params: ProductQuery = {},
): Promise<StorefrontProduct[]> {
  const { data } = await axios.get("products", { params: clean(params) });
  return data?.data ?? data ?? [];
}

export async function fetchProduct(
  slug: string,
): Promise<StorefrontProductDetail> {
  const { data } = await axios.get(`products/${encodeURIComponent(slug)}`);
  return data?.data ?? data;
}

/** Public product Q&A — the answered questions shown on the product page. */
export async function fetchProductQuestions(
  slug: string,
): Promise<StorefrontProductQuestions> {
  const { data } = await axios.get(
    `products/${encodeURIComponent(slug)}/questions`,
  );
  return {
    enabled: data?.enabled ?? false,
    data: data?.data ?? [],
  };
}

/** Submit a new question on a product (guest allowed; `name` required for guests). */
export async function askProductQuestion(
  slug: string,
  body: { question: string; name?: string },
): Promise<{ message: string }> {
  const { data } = await axios.post(
    `products/${encodeURIComponent(slug)}/questions`,
    body,
  );
  return data;
}

export async function fetchCategories(): Promise<StorefrontCategory[]> {
  const { data } = await axios.get("categories");
  return data?.data ?? data ?? [];
}

export async function fetchBrands(): Promise<StorefrontBrandFull[]> {
  const { data } = await axios.get("brands");
  return data?.data ?? data ?? [];
}

/** Price bounds + available attribute values (with counts) for the filter panel. */
export async function fetchFilters(
  params: FilterContext = {},
): Promise<StorefrontFilters> {
  const { data } = await axios.get("filters", { params: clean(params) });
  const payload = data?.data ?? data ?? {};
  return { price: payload.price ?? null, attributes: payload.attributes ?? [] };
}
