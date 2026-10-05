import axios from "axios";

/**
 * Customer product-share referrals.
 *
 * A shopper shares `/<product-path>?ref=CODE`. When a friend lands on that URL
 * the core remembers the code against that PATH (not globally), so only the
 * shared product is attributed: the product page asks `referralFor(slug)` and
 * passes the result as `ref` to `addCartItem`. The server resolves the code,
 * drops self-referrals, and pays the sharer cashback or points once the order
 * reaches the store's earn status.
 *
 * Storage is best-effort localStorage (private mode / blocked storage simply
 * means no attribution — never an error).
 */

const STORAGE_KEY = "sf_referrals";
const MAX_ENTRIES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReferralEntry {
  code: string;
  path: string;
  expires: number;
}

/** The store's public referral terms (window.appConfig.REFERRAL), or null when off. */
export interface ReferralProgram {
  reward_type: "cashback" | "points";
  reward_mode: "percent" | "fixed";
  reward_value: number;
  max_reward_per_order: number | null;
  attribution_days: number;
}

export function getReferralProgram(): ReferralProgram | null {
  const cfg = typeof window !== "undefined" ? (window.appConfig as AppConfig | undefined) : undefined;
  return (cfg?.REFERRAL as ReferralProgram | null | undefined) ?? null;
}

function read(): ReferralEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as ReferralEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: ReferralEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
  } catch {
    /* storage unavailable — attribution is best-effort */
  }
}

const normalizePath = (path: string): string => {
  const trimmed = decodeURIComponent(path).replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

/**
 * Remember `?ref=` from the current URL (call once at boot — bootStorefront
 * does). Last click wins for the same path; expired entries are pruned.
 * Returns the captured code, or null.
 */
export function captureReferral(
  location: { search: string; pathname: string } = window.location,
  now: number = Date.now(),
): string | null {
  const code = new URLSearchParams(location.search).get("ref")?.trim().toUpperCase();
  const live = read().filter((e) => e.expires > now);

  if (!code || !/^[A-Z0-9]{4,12}$/.test(code) || !getReferralProgram()) {
    if (live.length !== read().length) write(live);
    return null;
  }

  const days = getReferralProgram()?.attribution_days ?? 30;
  const path = normalizePath(location.pathname);
  write([...live.filter((e) => e.path !== path), { code, path, expires: now + days * DAY_MS }]);

  return code;
}

/**
 * The referral code to send with `addCartItem` for the product with this slug,
 * or undefined. Matches any remembered path ending in `/<slug>` so it works for
 * whatever route shape a theme uses (`/products/x`, `/p/x`, …).
 */
export function referralFor(slug: string | null | undefined, now: number = Date.now()): string | undefined {
  if (!slug) return undefined;
  const tail = `/${decodeURIComponent(slug)}`;
  const match = read()
    .filter((e) => e.expires > now && e.path.endsWith(tail))
    .pop();
  return match?.code;
}

/** `productUrl` with the sharer's `?ref=` code set (other params preserved). */
export function buildShareUrl(productUrl: string, code: string | null | undefined): string {
  const url = new URL(productUrl, window.location.origin);
  url.searchParams.delete("ref");
  if (code) url.searchParams.set("ref", code);
  return url.toString();
}

/**
 * Share via the native sheet when available, else copy to the clipboard.
 * Resolves to what happened so the theme can toast accordingly.
 */
export async function shareLink(payload: { url: string; title?: string; text?: string }): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share(payload);
      return "shared";
    }
  } catch (e) {
    // The user closed the sheet — not a failure worth a fallback.
    if ((e as Error)?.name === "AbortError") return "failed";
  }

  try {
    await navigator.clipboard.writeText(payload.url);
    return "copied";
  } catch {
    return "failed";
  }
}

// ─── Account endpoints ───────────────────────────────────────────────────────

export interface ReferralRewardRow {
  id: number;
  product: { name: string; slug: string } | null;
  reward_type: "cashback" | "points";
  reward_amount: number;
  status: "pending" | "rewarded" | "reversed" | "void";
  status_label: string;
  created_at: string | null;
}

export interface ReferralSummary {
  /** The shopper's personal code; null when the program is off or the account has no phone. */
  code: string | null;
  share_param: string;
  program: ReferralProgram | null;
  stats: { pending: number; rewarded_total: number; count: number };
  rewards: ReferralRewardRow[];
}

export async function fetchReferral(): Promise<ReferralSummary> {
  const { data } = await axios.get("account/referral");
  return {
    code: data?.code ?? null,
    share_param: data?.share_param ?? "ref",
    program: data?.program ?? null,
    stats: data?.stats ?? { pending: 0, rewarded_total: 0, count: 0 },
    rewards: data?.rewards ?? [],
  };
}

export interface CreditTransactionRow {
  id: number;
  type: "credit" | "debit";
  source: string;
  source_label: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string | null;
}

export interface CreditSummary {
  /** Store credit (cashback) in the store's currency. */
  balance: number;
  transactions: CreditTransactionRow[];
}

export async function fetchCredit(): Promise<CreditSummary> {
  const { data } = await axios.get("account/credit");
  return {
    balance: Number(data?.balance ?? 0),
    transactions: data?.transactions ?? [],
  };
}

export const referralKeys = {
  referral: ["referral"] as const,
  credit: ["credit"] as const,
};
