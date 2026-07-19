import axios from "axios";
import type {
  Address,
  Cart,
  Customer,
  DigitalDownload,
  GeocodeResult,
  Membership,
  Order,
  PaymentMethodOption,
  ShippingOption,
} from "../types/commerce";

/**
 * Data layer for the authenticated storefront surface — auth (OTP), cart,
 * addresses and orders. Thin wrappers over `/api/v1/*`; the bearer token is
 * attached globally by the axios interceptor set up in lib/auth.tsx.
 *
 * Resources are returned bare (no `data` wrapper) per the API contract, except
 * paginated lists which carry `{ data, meta, links }` — unwrapped defensively.
 */

function unwrap<T>(data: any): T {
  return (data?.data ?? data) as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  user: Customer;
}

/**
 * Password sign-up. The storefront collects name + phone + password (phone is
 * the identity; email is optional). Returns a bearer token + the new customer.
 */
export async function register(payload: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}): Promise<AuthResult> {
  const { data } = await axios.post("auth/register", payload);
  return data;
}

/** Password sign-in by phone. */
export async function login(payload: {
  phone: string;
  password: string;
}): Promise<AuthResult> {
  const { data } = await axios.post("auth/login", payload);
  return data;
}

// ─── Passwordless OTP over WhatsApp (kept for the upcoming mobile app) ────────

export interface OtpRequestResult {
  message: string;
  /** Present only in non-production (the code itself, e.g. "0000"). */
  dev_code?: string;
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const { data } = await axios.post("auth/otp/request", { phone });
  return data;
}

export async function verifyOtp(payload: {
  phone: string;
  code: string;
  name?: string;
  email?: string;
}): Promise<AuthResult> {
  const { data } = await axios.post("auth/otp/verify", payload);
  return data;
}

export async function fetchMe(): Promise<Customer> {
  const { data } = await axios.get("auth/me");
  return unwrap<Customer>(data);
}

export async function logoutRequest(): Promise<void> {
  await axios.post("auth/logout");
}

/**
 * Persist the customer's preferred storefront language. The server saves it to
 * the account and sets the `sf_locale` cookie; we also write the cookie locally
 * so a full reload immediately boots the shell in the chosen language even
 * before the response cookie is applied. Caller reloads after this resolves.
 */
export async function updateLocale(locale: string): Promise<void> {
  await axios.patch("account/locale", { locale });
  setLocaleCookie(locale);
}

/** Write the (unencrypted) storefront language cookie read by the server. */
export function setLocaleCookie(locale: string): void {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `sf_locale=${encodeURIComponent(locale)}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export async function fetchCart(): Promise<Cart> {
  const { data } = await axios.get("cart");
  return unwrap<Cart>(data);
}

export async function addCartItem(payload: {
  product_id: number;
  product_variant_id?: number | null;
  quantity: number;
  /** Selected fitness membership package key (fitness products only). */
  fitness_package?: string | null;
  /** Buyer-supplied custom input values keyed by field key. */
  personalization?: Record<string, string> | null;
}): Promise<Cart> {
  const { data } = await axios.post("cart/items", payload);
  return unwrap<Cart>(data);
}

export async function updateCartItem(
  itemId: number,
  quantity: number,
): Promise<Cart> {
  const { data } = await axios.patch(`cart/items/${itemId}`, { quantity });
  return unwrap<Cart>(data);
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  const { data } = await axios.delete(`cart/items/${itemId}`);
  return unwrap<Cart>(data);
}

export async function clearCart(): Promise<Cart> {
  const { data } = await axios.delete("cart");
  return unwrap<Cart>(data);
}

/**
 * Apply a coupon to the cart. Resolves with the updated cart (the coupon is
 * reflected in `cart.coupon`); rejects with a 422 carrying an Arabic
 * `errors.coupon_code` message when the code is invalid or does not qualify.
 */
export async function applyCoupon(code: string): Promise<Cart> {
  const { data } = await axios.post("cart/coupon", { code });
  return unwrap<Cart>(data);
}

export async function removeCoupon(): Promise<Cart> {
  const { data } = await axios.delete("cart/coupon");
  return unwrap<Cart>(data);
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export type AddressPayload = {
  name: string;
  phone: string;
  city_id?: number | null;
  district_id?: number | null;
  line1: string;
  line2?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await axios.get("addresses");
  return unwrap<Address[]>(data) ?? [];
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await axios.post("addresses", payload);
  return unwrap<Address>(data);
}

export async function updateAddress(
  id: number,
  payload: Partial<AddressPayload>,
): Promise<Address> {
  const { data } = await axios.patch(`addresses/${id}`, payload);
  return unwrap<Address>(data);
}

export async function deleteAddress(id: number): Promise<void> {
  await axios.delete(`addresses/${id}`);
}

export async function setDefaultAddress(id: number): Promise<Address> {
  const { data } = await axios.post(`addresses/${id}/default`);
  return unwrap<Address>(data);
}

// ─── Geocoding (OpenStreetMap) ────────────────────────────────────────────────

export async function geocode(query: string): Promise<GeocodeResult | null> {
  try {
    const { data } = await axios.get("geocode", { params: { q: query } });
    return data;
  } catch {
    return null;
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ display_name: string } | null> {
  try {
    const { data } = await axios.get("reverse-geocode", {
      params: { lat, lng },
    });
    return data;
  } catch {
    return null;
  }
}

// ─── Geo (cities & districts) ─────────────────────────────────────────────────

export type GeoCity = { id: number; name: string };
export type GeoDistrict = { id: number; city_id: number; name: string };

/** Active cities (governorates) for the address-form picker. */
export async function fetchCities(): Promise<GeoCity[]> {
  const { data } = await axios.get("cities");
  return unwrap<GeoCity[]>(data) ?? [];
}

/** Active districts within a city. */
export async function fetchDistricts(cityId: number): Promise<GeoDistrict[]> {
  const { data } = await axios.get(`cities/${cityId}/districts`);
  return unwrap<GeoDistrict[]>(data) ?? [];
}

/** Map a pin to the nearest city + district (either may be null). */
export async function resolveGeo(
  lat: number,
  lng: number,
): Promise<{ city: GeoCity | null; district: GeoDistrict | null }> {
  try {
    const { data } = await axios.get("geo/resolve", { params: { lat, lng } });
    return data;
  } catch {
    return { city: null, district: null };
  }
}

// ─── Shipping ──────────────────────────────────────────────────────────────────

/**
 * Live shipping options for the current cart delivered to `addressId`, priced by
 * every installed shipping-provider app. The customer echoes the chosen
 * `{ app, method }` back to `checkout`; the server recomputes the cost.
 */
export async function fetchShippingOptions(
  addressId: number,
): Promise<ShippingOption[]> {
  const { data } = await axios.get("checkout/shipping-options", {
    params: { address_id: addressId },
  });
  return unwrap<ShippingOption[]>(data) ?? [];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

/**
 * Payment methods available for the current cart: COD (physical carts only,
 * merchant-toggleable) and active online gateways. Fetched on the checkout
 * screen, mirrored server-side at order creation.
 */
export async function fetchPaymentMethods(): Promise<PaymentMethodOption[]> {
  const { data } = await axios.get("checkout/payment-methods");
  return unwrap<PaymentMethodOption[]>(data) ?? [];
}

/** The gateway attempt attached to a checkout/repay response. */
export interface OrderPaymentInfo {
  method: string;
  /** The hosted payment page to send the browser to (full-page redirect). */
  redirect_url: string | null;
}

/**
 * Re-initiate the online payment for an unpaid order (abandoned/failed hosted
 * page). Returns a fresh redirect_url.
 */
export async function payOrder(orderId: number): Promise<OrderPaymentInfo> {
  const { data } = await axios.post(`orders/${orderId}/pay`);
  return data.payment as OrderPaymentInfo;
}

// ─── Orders ────────────────────────────────────────────────────────────────────

export async function checkout(payload: {
  // Null for a fully-virtual cart (digital + fitness) — no delivery address.
  address_id: number | null;
  note?: string | null;
  shipping_app?: string | null;
  shipping_method?: string | null;
  /** Loyalty points to redeem; bounded server-side by balance + program caps. */
  redeem_points?: number | null;
  /** 'cod' or an online gateway slug from fetchPaymentMethods. */
  payment_method: string;
}): Promise<{ order: Order; payment: OrderPaymentInfo | null }> {
  const { data } = await axios.post("orders", payload);

  // An online method carries a `payment` key with the hosted-page redirect;
  // COD returns the bare order.
  return {
    order: unwrap<Order>(data),
    payment: (data?.payment ?? null) as OrderPaymentInfo | null,
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const { data } = await axios.get("orders");
  return unwrap<Order[]>(data) ?? [];
}

export async function fetchOrder(id: number): Promise<Order> {
  const { data } = await axios.get(`orders/${id}`);
  return unwrap<Order>(data);
}

// ─── Digital downloads (files + codes delivered after payment) ───────────────

/** Every deliverable the customer owns, across all their orders. */
export async function fetchDownloads(): Promise<DigitalDownload[]> {
  const { data } = await axios.get("account/downloads");
  return unwrap<DigitalDownload[]>(data) ?? [];
}

/** Every fitness membership the customer holds (active sorts first). */
export async function fetchMemberships(): Promise<Membership[]> {
  const { data } = await axios.get("account/memberships");
  return unwrap<Membership[]>(data) ?? [];
}

/**
 * Fetch a deliverable's bytes with the bearer token attached (a plain <a>/<img>
 * can't send it), then trigger a browser "Save as". Counts as a download.
 */
export async function downloadDeliverable(
  d: Pick<DigitalDownload, "url" | "name">,
): Promise<void> {
  if (!d.url) return;
  const { data } = await axios.get(d.url, { responseType: "blob" });
  const href = URL.createObjectURL(data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = d.name || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/**
 * Fetch an image deliverable as an object URL for inline preview (bearer-auth,
 * quota-free via `preview_url`). Caller must revoke the URL when done.
 */
export async function fetchPreviewObjectUrl(
  d: Pick<DigitalDownload, "preview_url">,
): Promise<string | null> {
  if (!d.preview_url) return null;
  const { data } = await axios.get(d.preview_url, { responseType: "blob" });
  return URL.createObjectURL(data as Blob);
}

// ─── Loyalty points ────────────────────────────────────────────────────────────

/** The public config of the tenant's active loyalty program. */
export interface PointsProgram {
  /** Points earned per one currency unit spent (floored to a whole number). */
  earn_points_per_unit: number;
  /** Currency value of a single point when redeemed. */
  redeem_point_value: number;
  /** Cap on redemption as a percentage of the subtotal. */
  redeem_max_percent: number;
  /** Minimum balance before any points may be redeemed. */
  min_redeem_points: number;
}

export interface PointsTransactionRow {
  id: number;
  type: "credit" | "debit";
  source: string;
  source_label: string;
  points: number;
  balance_after: number;
  description: string | null;
  created_at: string | null;
}

export interface PointsSummary {
  balance: number;
  /** Null when the store has no active loyalty program. */
  program: PointsProgram | null;
  transactions: PointsTransactionRow[];
}

export async function fetchPoints(): Promise<PointsSummary> {
  const { data } = await axios.get("account/points");
  return {
    balance: Number(data?.balance ?? 0),
    program: data?.program ?? null,
    transactions: data?.transactions ?? [],
  };
}

/**
 * How many of `balance` points a customer may redeem against `subtotal`, and
 * the currency value that many points is worth — mirrors the server's
 * `LoyaltyService::redeemablePoints` so the checkout can preview a redemption.
 * Returns zeros when redemption isn't possible (no program, below threshold).
 */
export function redeemablePreview(
  program: PointsProgram | null,
  balance: number,
  subtotal: number,
): { points: number; value: number } {
  if (!program || balance <= 0 || balance < program.min_redeem_points) {
    return { points: 0, value: 0 };
  }
  const pointValue = program.redeem_point_value;
  if (pointValue <= 0) return { points: 0, value: 0 };

  const maxValue =
    Math.round(subtotal * (program.redeem_max_percent / 100) * 100) / 100;
  const maxPointsByValue = Math.floor(maxValue / pointValue);
  const points = Math.max(0, Math.min(balance, maxPointsByValue));
  const value = Math.round(points * pointValue * 100) / 100;
  return { points, value };
}

export const commerceKeys = {
  cart: ["cart"] as const,
  me: ["me"] as const,
  addresses: ["addresses"] as const,
  orders: ["orders"] as const,
  order: (id: number) => ["order", id] as const,
  points: ["points"] as const,
  downloads: ["downloads"] as const,
  memberships: ["memberships"] as const,
  shippingOptions: (addressId: number) =>
    ["shipping-options", addressId] as const,
  paymentMethods: ["payment-methods"] as const,
};
