import axios from "axios";
import type { Order } from "../types/commerce";
import type {
  AssistantConfig,
  AssistantPageContext,
  AssistantConversation,
  AssistantEvent,
  AssistantMessage,
  AssistantProposal,
} from "../types/assistant";
import { getApiUrl, getAppConfig } from "./appConfig";

/**
 * Storefront AI assistant — data layer. The chat endpoints accept an optional
 * customer bearer token (already on axios via AuthProvider) or, for a guest,
 * an opaque `X-Assistant-Token` that start() issues and we keep in
 * localStorage. Replies stream back as Server-Sent Events over a POST, so
 * `streamAssistantMessage` uses fetch + a ReadableStream (EventSource can't
 * POST or send headers).
 */

const GUEST_KEY = "sf_assistant_token";
export const ASSISTANT_GUEST_HEADER = "X-Assistant-Token";

/** The widget config from the bootstrap payload, or null when the store doesn't run it. */
export function getAssistantConfig(): AssistantConfig | null {
  const cfg = getAppConfig().ASSISTANT as AssistantConfig | null | undefined;
  return cfg && cfg.enabled ? cfg : null;
}

export function getAssistantGuestToken(): string | null {
  try {
    return localStorage.getItem(GUEST_KEY);
  } catch {
    return null;
  }
}

export function setAssistantGuestToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(GUEST_KEY, token);
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* private mode / blocked storage — the thread just won't survive a reload */
  }
}

function guestHeaders(): Record<string, string> {
  const token = getAssistantGuestToken();
  return token ? { [ASSISTANT_GUEST_HEADER]: token } : {};
}

export interface AssistantThread {
  conversation: AssistantConversation | null;
  messages: AssistantMessage[];
}

/**
 * Resume the shopper's open thread or start one. A guest receives a token we
 * persist; a customer who still holds one adopts their guest thread (the
 * server clears the token's ownership, so we forget it).
 */
export async function startAssistantConversation(isCustomer: boolean): Promise<AssistantThread> {
  const { data } = await axios.post("assistant/conversations", {}, { headers: guestHeaders() });
  if (data.guest_token) setAssistantGuestToken(data.guest_token);
  else if (isCustomer) setAssistantGuestToken(null);
  return { conversation: data.conversation, messages: data.messages ?? [] };
}

export async function resetAssistantConversation(conversationId: number): Promise<void> {
  await axios.delete(`assistant/conversations/${conversationId}`, { headers: guestHeaders() });
}

export async function sendAssistantFeedback(messageId: number, rating: "up" | "down"): Promise<void> {
  await axios.post(`assistant/messages/${messageId}/feedback`, { rating }, { headers: guestHeaders() });
}

/** The shopper pressed «تأكيد الطلب» — places the order; same response as POST /orders. */
export async function confirmAssistantProposal(
  token: string,
): Promise<Order & { payment?: { method: string; redirect_url: string | null } }> {
  const { data } = await axios.post("assistant/proposals/confirm", { token });
  return data;
}

/**
 * Incremental SSE parser: feed it raw chunks, get back complete events. Pure
 * (no I/O) so it is unit-tested; tolerant of CRLF and of events split across
 * chunks.
 */
export function createSseParser() {
  let buffer = "";

  return (chunk: string): AssistantEvent[] => {
    buffer += chunk.replace(/\r\n/g, "\n");
    const events: AssistantEvent[] = [];
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      let name = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (!data.length) continue;

      try {
        events.push({ event: name, data: JSON.parse(data.join("\n")) } as AssistantEvent);
      } catch {
        /* a malformed frame is skipped, never fatal */
      }
    }

    return events;
  };
}

/** Send one message and receive its reply as a stream of events. */
export async function streamAssistantMessage(
  conversationId: number,
  message: string,
  onEvent: (event: AssistantEvent) => void,
  signal?: AbortSignal,
  /** The page the shopper is asking from (see assistantContextFromLocation). */
  context?: AssistantPageContext | null,
): Promise<void> {
  const auth = axios.defaults.headers.common?.Authorization as string | undefined;
  // The shopper's chosen display currency (set by the currency switcher on
  // axios). fetch() doesn't inherit axios headers, and without it the server
  // prices the reply in the store's own currency while the cards on the page
  // show the converted one.
  const currency = axios.defaults.headers.common?.["X-Currency"] as string | undefined;
  const base = getApiUrl().replace(/\/$/, "");

  const res = await fetch(`${base}/assistant/conversations/${conversationId}/messages`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(auth ? { Authorization: auth } : {}),
      ...(currency ? { "X-Currency": currency } : {}),
      ...guestHeaders(),
    },
    body: JSON.stringify(context ? { message, context } : { message }),
  });

  if (!res.ok || !res.body) {
    let text = "تعذّر إرسال الرسالة. حاول مرة أخرى.";
    if (res.status === 429) text = "أرسلت رسائل كثيرة بسرعة، انتظر قليلاً ثم حاول.";
    else {
      try {
        text = (await res.json())?.message ?? text;
      } catch {
        /* keep the default */
      }
    }
    onEvent({ event: "error", data: { message: text, code: String(res.status) } });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parse(decoder.decode(value, { stream: true })).forEach(onEvent);
  }
}

// ── Page context (pure, unit-tested) ────────────────────────────────────

const clip = (v: string | null | undefined, max: number) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : undefined;
};

/**
 * Which page the shopper is on, from the storefront URL — the shared route
 * shapes of every official theme:
 *
 *   /products/:slug                        → { type: "product", slug }
 *   /search?search=…&category=…&brand=…    → { type: "search", … }   (a lone
 *     ?category= / ?brand= with no query reads as that category / brand page)
 *
 * Anything else → null (no context). The server re-resolves the hint against
 * the store's own catalog, so a stale or hand-edited URL is harmless.
 */
export function assistantContextFromLocation(pathname: string, search = ""): AssistantPageContext | null {
  const path = pathname.replace(/\/+$/, "");

  const product = path.match(/^\/products\/([^/]+)$/);
  if (product) {
    let slug = product[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep it raw */
    }
    return { type: "product", slug: slug.slice(0, 191) };
  }

  if (path === "/search") {
    const params = new URLSearchParams(search);
    const query = clip(params.get("search") ?? params.get("q"), 100);
    const category = clip(params.get("category"), 191);
    const brand = clip(params.get("brand"), 191);

    if (!query && category && !brand) return { type: "category", slug: category };
    if (!query && brand && !category) return { type: "brand", slug: brand };
    if (!query && !category && !brand) return null;

    return {
      type: "search",
      ...(query ? { search: query } : {}),
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
    };
  }

  return null;
}

/** The quick questions the merchant's config offers for this page, or []. */
export function assistantContextPrompts(config: AssistantConfig | null, context: AssistantPageContext | null): string[] {
  if (!config?.capabilities?.page_context || !context) return [];
  return config.context_prompts?.[context.type] ?? [];
}

// ── Pure state machine (unit-tested) ────────────────────────────────────

export interface AssistantState {
  messages: AssistantMessage[];
  /** Live status while a turn runs: "" idle, or a tool label ("البحث في المنتجات…"). */
  status: string;
  busy: boolean;
}

export type AssistantAction =
  | { type: "load"; messages: AssistantMessage[] }
  | { type: "send"; text: string }
  | { type: "event"; event: AssistantEvent }
  | { type: "fail"; message: string }
  | { type: "feedback"; id: number; rating: "up" | "down" }
  | { type: "proposal_done"; token: string };

let localId = -1;

export const initialAssistantState: AssistantState = { messages: [], status: "", busy: false };

/** The reply being streamed is always the last message while `busy`. */
function patchReply(state: AssistantState, patch: (m: AssistantMessage) => AssistantMessage): AssistantState {
  const messages = state.messages.slice();
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant" || !last.streaming) return state;
  messages[messages.length - 1] = patch(last);
  return { ...state, messages };
}

export function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case "load":
      return { ...initialAssistantState, messages: action.messages };

    case "send":
      return {
        busy: true,
        status: "",
        messages: [
          ...state.messages,
          { id: localId--, role: "user", content: action.text, cards: null },
          { id: localId--, role: "assistant", content: "", cards: null, streaming: true },
        ],
      };

    case "fail":
      return {
        ...patchReply(state, (m) => ({ ...m, streaming: false, error: action.message })),
        busy: false,
        status: "",
      };

    case "feedback":
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.id ? { ...m, feedback: action.rating } : m)),
      };

    case "proposal_done":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.cards?.proposal?.token === action.token
            ? { ...m, cards: { ...m.cards, proposal: undefined } }
            : m,
        ),
      };

    case "event": {
      const e = action.event;
      switch (e.event) {
        case "thinking":
          return { ...state, status: "يفكّر…" };
        case "tool":
          return { ...state, status: e.data.label };
        case "delta":
          return patchReply({ ...state, status: "" }, (m) => ({ ...m, content: m.content + e.data.text }));
        case "products":
          return patchReply(state, (m) => {
            const seen = new Set((m.cards?.products ?? []).map((p) => p.id));
            const fresh = e.data.products.filter((p) => !seen.has(p.id));
            return { ...m, cards: { ...m.cards, products: [...(m.cards?.products ?? []), ...fresh] } };
          });
        case "coupons":
          return patchReply(state, (m) => {
            const seen = new Set((m.cards?.coupons ?? []).map((c) => c.code));
            const fresh = e.data.coupons.filter((c) => !seen.has(c.code));
            return { ...m, cards: { ...m.cards, coupons: [...(m.cards?.coupons ?? []), ...fresh] } };
          });
        case "proposal":
          return patchReply(state, (m) => ({ ...m, cards: { ...m.cards, proposal: e.data } }));
        case "login_required":
          return patchReply(state, (m) => ({ ...m, cards: { ...m.cards, login_required: true } }));
        case "cart_updated":
          return patchReply(state, (m) => ({ ...m, cards: { ...m.cards, cart_updated: true } }));
        case "message":
          return patchReply(state, (m) => ({ ...m, id: e.data.message_id, content: e.data.text || m.content }));
        case "done":
          return { ...patchReply(state, (m) => ({ ...m, streaming: false })), busy: false, status: "" };
        case "error":
          return {
            ...patchReply(state, (m) => ({ ...m, streaming: false, error: e.data.message })),
            busy: false,
            status: "",
          };
      }
      return state;
    }
  }
}

