/**
 * Types for the authenticated storefront surface: account, cart, addresses and
 * orders. Shapes mirror the `/api/v1/*` resources (see docs/api-guide.md).
 */

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  phone_verified?: boolean;
  type: string;
  /** Preferred storefront language code (e.g. "ar", "en"). */
  locale?: string | null;
}

/** A buyer-supplied custom input value snapshotted on a cart/order line. */
export interface LinePersonalization {
  key: string;
  label: string;
  icon: string | null;
  value: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  product_variant_id: number | null;
  name: string;
  image: string | null;
  price: string;
  quantity: number;
  total: string;
  available_quantity: number;
  /** Chosen fitness membership package label, when the line has one. */
  package: string | null;
  /** Buyer-supplied custom input values, when the line has any. */
  personalization: LinePersonalization[] | null;
}

/** An automatic discount applied to the cart (no code required). */
export interface CartDiscount {
  label: string;
  reward_type: string;
  amount: string;
}

/** One rung on the "spend X more to unlock" ladder. */
export interface ProgressRung {
  label: string;
  threshold: string;
  reward_label: string;
  unlocked: boolean;
}

/** The progress-bar state toward the next reward tier. */
export interface CartProgress {
  active: boolean;
  current?: string;
  next_threshold?: string | null;
  remaining?: string;
  percent?: number;
  next_reward_label?: string | null;
  unlocked?: string[];
  rungs?: ProgressRung[];
}

/** A coupon the customer applied in the cart, re-validated on every read. */
export interface CartCoupon {
  code: string;
  valid: boolean;
  error: string | null;
  discount: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal: string;
  item_count: number;
  discounts?: CartDiscount[];
  coupon?: CartCoupon | null;
  discount_total?: string;
  subtotal_after_discount?: string;
  progress?: CartProgress;
  /**
   * False for a fully-virtual cart (all digital/fitness lines) — checkout then
   * hides the address + shipping steps and omits the address. Defaults to true
   * when absent.
   */
  requires_shipping?: boolean;
}

export interface Address {
  id: number;
  name: string;
  phone: string;
  city: { id: number; name: string } | null;
  city_id: number | null;
  district: { id: number; name: string } | null;
  district_id: number | null;
  line1: string;
  line2: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export interface OrderItem {
  product_name: string;
  quantity: number;
  price: string;
  total: string;
  /** Chosen fitness membership package label, when the line has one. */
  package: string | null;
  /** Buyer-supplied custom input values, when the line has any. */
  personalization: LinePersonalization[] | null;
}

export interface OrderAddress {
  id: number;
  name: string;
  phone: string;
  city: string | null;
  line1: string;
  line2: string | null;
}

/** One shipping choice from an installed provider app (see /checkout/shipping-options). */
export interface ShippingOption {
  app: string;
  method: string;
  label: string;
  cost: string;
  eta: string | null;
}

/**
 * One payment choice for the current cart (see /checkout/payment-methods).
 * `method` is 'cod' or an online gateway slug (e.g. 'aps'); COD is offered only
 * for physical carts while the merchant keeps it enabled.
 */
/**
 * One of the merchant's own bank accounts, offered under the `bank_transfer`
 * payment method. The customer transfers the money externally, then submits the
 * reference and/or a receipt image with the order.
 */
export interface BankAccountOption {
  id: number;
  name: string;
  bank_name: string | null;
  account_holder: string;
  account_number: string;
  iban: string | null;
  logo: string | null;
  instructions: string | null;
}

export interface PaymentMethodOption {
  method: string;
  type: "cod" | "bank_transfer" | "online";
  label: string;
  logo: string | null;
  /** True when the method collects a transfer reference / receipt at checkout. */
  requires_proof?: boolean;
  /** Non-empty only for `bank_transfer` — the accounts to choose between. */
  accounts?: BankAccountOption[];
}

/**
 * One submitted bank transfer as the customer sees it. `pending` is awaiting the
 * merchant's review; `failed` carries the `rejection_reason` and means the
 * customer may resubmit via `submitTransfer`.
 */
export interface BankTransferAttempt {
  id: number;
  status: "pending" | "paid" | "failed";
  sender_name: string | null;
  transfer_reference: string | null;
  receipt_url: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

/** The proof a customer submits for a manual bank transfer. */
export interface BankTransferProof {
  bank_account_id: number;
  sender_name?: string | null;
  transfer_reference?: string | null;
  /** Receipt image. Its presence switches the request to multipart. */
  transfer_receipt?: File | null;
}

/**
 * A digital deliverable granted to the customer once an order is paid. Either a
 * downloadable `file` (an image file also carries `preview_url`) or an inline
 * `text` code/key whose `content` is revealed while available.
 */
export interface DigitalDownload {
  id: number;
  kind: "file" | "text";
  name: string;
  mime: string | null;
  is_image: boolean;
  size: number;
  content: string | null;
  downloads_count: number;
  max_downloads: number | null;
  expires_at: string | null;
  is_available: boolean;
  /** Tokenized download URL (file kind); null for text. */
  url: string | null;
  /** Inline image stream that does not consume the download quota. */
  preview_url: string | null;
}

/** A fitness membership grant (one-time multi-month package). */
export interface Membership {
  id: number;
  order_id: number | null;
  product: string | null;
  label: string;
  months: number;
  /** Member-card / check-in code shown to the customer. */
  code: string;
  starts_at: string | null;
  ends_at: string | null;
  status: "active" | "frozen" | "expired";
  is_active: boolean;
  days_remaining: number;
}

export interface Order {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  /**
   * 'cod', 'bank_transfer', or the online gateway slug chosen at checkout
   * (null for legacy orders).
   */
  payment_method?: string | null;
  /**
   * Manual bank-transfer attempts, newest first. Present only when
   * `payment_method === "bank_transfer"`.
   */
  bank_transfer?: BankTransferAttempt[];
  /** Goods total after discount (excludes shipping). */
  amount: string;
  discount?: string;
  discounts?: CartDiscount[];
  /** Loyalty points spent on this order (their currency value is in `amount`). */
  points_redeemed?: number;
  /** Loyalty points earned once the order reaches the earning status. */
  points_earned?: number;
  shipping_app?: string | null;
  shipping_method?: string | null;
  shipping_cost?: string;
  /** Payable total: amount + shipping_cost. */
  total?: string;
  item_count?: number;
  items?: OrderItem[];
  downloads?: DigitalDownload[];
  memberships?: Membership[];
  address?: OrderAddress | null;
  created_at: string | null;
}

/** Forward/reverse geocoding result (OpenStreetMap). */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}
