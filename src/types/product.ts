/**
 * A product as returned by the storefront listing endpoint
 * (`/api/v1/products`, shaped by `App\Http\Resources\Api\ProductListResource`).
 *
 * `promotion` is optional: the list resource does not expose it yet, so the
 * card renders the promo badge only when a value is present.
 */
export interface StorefrontBrand {
  id: number;
  name: string;
  /** Present on the product-detail resource (BrandResource) — used to link to the brand's listing. */
  slug?: string;
  image?: string | null;
}

export interface StorefrontPriceRange {
  min: string;
  max: string;
}

export interface StorefrontProduct {
  id: number;
  name: string;
  slug: string;
  price: string;
  sale_price: string | null;
  has_variants: boolean;
  /** Product classifier (`App\Enums\ProductType`); defaults to "general". */
  type?: string;
  price_range: StorefrontPriceRange | null;
  brand: StorefrontBrand | null;
  image: string | null;
  in_stock: boolean;
  promotion?: string | null;
}

// ─── Product detail (`/api/v1/products/{slug}`) ──────────────────────────────
// Shaped by `App\Http\Resources\Api\ProductDetailResource`.

export interface StorefrontProductImage {
  id: number;
  url: string;
  position: number;
}

export interface StorefrontCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface StorefrontOptionValue {
  id: number;
  value: string;
  /** Present only for color attributes (`is_color`). */
  color?: string | null;
}

export interface StorefrontOption {
  id: number;
  name: string;
  is_color: boolean;
  values: StorefrontOptionValue[];
}

/** A resolved free-from / claim badge (`App\Enums\FreeFromBadge`). */
export interface StorefrontFreeFromBadge {
  key: string;
  label: string;
  icon: string;
}

/** A key/value product specification row (electronics). */
export interface StorefrontSpecification {
  key: string;
  value: string;
}

/** Clothing size chart: header columns + rows of cells. */
export interface StorefrontSizeChart {
  columns: string[];
  rows: string[][];
}

/** A one-time multi-month membership package (fitness products). */
export interface StorefrontFitnessPackage {
  key: string;
  label: string;
  months: number;
  price: string;
}

/** A merchant-defined custom input the buyer fills at purchase. */
export interface StorefrontPersonalizationField {
  key: string;
  label: string;
  icon: string | null;
  type: "text" | "textarea" | "number";
  required: boolean;
  max_length: number | null;
}

/** Per-type structured payload (`Product.type_data`). */
export interface StorefrontTypeData {
  size_chart?: StorefrontSizeChart;
  fitness_packages?: StorefrontFitnessPackage[];
  personalization_fields?: StorefrontPersonalizationField[];
}

export interface StorefrontVariant {
  id: number;
  sku: string | null;
  price: string;
  sale_price: string | null;
  /** AttributeValue ids that identify this variant across the option axes. */
  option_value_ids: number[];
  available_quantity: number;
  in_stock: boolean;
}

export interface StorefrontProductDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  ingredients: string | null;
  free_from: StorefrontFreeFromBadge[];
  /** Product classifier (`App\Enums\ProductType`); defaults to "general". */
  type: string;
  /** Per-type structured payload (clothing size chart, …). */
  type_data: StorefrontTypeData | null;
  /** Fitness membership packages (empty for non-fitness products). */
  fitness_packages: StorefrontFitnessPackage[];
  /** Cheapest package price ("starting at"); null when no packages. */
  fitness_from_price: string | null;
  /** Custom input fields the buyer fills at purchase (empty when none). */
  personalization_fields: StorefrontPersonalizationField[];
  /** Key/value specifications (electronics). */
  specifications: StorefrontSpecification[];
  price: string;
  sale_price: string | null;
  has_variants: boolean;
  is_digital: boolean;
  in_stock: boolean;
  price_range: StorefrontPriceRange | null;
  brand: StorefrontBrand | null;
  categories: StorefrontCategoryRef[];
  images: StorefrontProductImage[];
  options: StorefrontOption[];
  variants: StorefrontVariant[];
}
