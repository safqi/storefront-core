/**
 * Catalog facets returned by the storefront API.
 *  - `/api/v1/categories` → a nested tree (roots with recursive `children`),
 *    shaped by `App\Http\Resources\Api\CategoryResource`.
 *  - `/api/v1/brands` → a flat list of active brands (`BrandResource`).
 *
 * `image` is a full URL (or null) — added alongside the storefront catalog
 * pages so category/brand cards can show artwork.
 */
export interface StorefrontCategory {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  children?: StorefrontCategory[];
}

export interface StorefrontBrandFull {
  id: number;
  name: string;
  slug: string;
  image: string | null;
}

/**
 * Filter facets returned by `/api/v1/filters` for the current browsing context.
 *  - `price` — min/max effective price bounds for the slider (decimal strings),
 *    or null when nothing matches.
 *  - `attributes` — only values that occur in the context, each with a product
 *    `count`; color attributes carry a `color` swatch hex.
 */
export interface StorefrontFilterValue {
  id: number;
  value: string;
  color: string | null;
  count: number;
}

export interface StorefrontFilterAttribute {
  id: number;
  name: string;
  is_color: boolean;
  values: StorefrontFilterValue[];
}

export interface StorefrontFilters {
  price: { min: string; max: string } | null;
  attributes: StorefrontFilterAttribute[];
}

/** Flatten a category tree into a single depth-first list. */
export function flattenCategories(
  tree: StorefrontCategory[],
): StorefrontCategory[] {
  const out: StorefrontCategory[] = [];
  const walk = (nodes: StorefrontCategory[]) => {
    for (const node of nodes) {
      out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(tree);
  return out;
}
