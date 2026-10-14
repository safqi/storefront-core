import type { StorefrontProduct } from "./product";

/** window.appConfig.ASSISTANT — null/absent when the store doesn't run the assistant. */
export interface AssistantConfig {
  enabled: true;
  name: string;
  avatar: string | null;
  welcome_message: string | null;
  suggested_prompts: string[];
  /** False = customers only; a guest must sign in before chatting. */
  guest_access: boolean;
  capabilities: Record<"products" | "cart" | "orders" | "checkout" | "offers", boolean>;
  max_message_length: number;
}

/** The checkout confirm card the assistant prepares (it never places the order itself). */
export interface AssistantProposal {
  type: "checkout";
  /** Signed, short-lived; send it to confirmAssistantProposal() when the shopper presses confirm. */
  token: string;
  expires_in: number;
  summary: {
    items: Array<{ item_id: number; product_id: number; name: string; quantity: number; price: string; total: string }>;
    subtotal: string;
    discount_total: string;
    shipping?: { label: string; cost: string | null; eta: string | null };
    total: string;
    currency: string | null;
    address?: string;
    payment: { method: string; label: string };
    note?: string;
  };
}

/** What the transcript stores alongside a reply (also replayed from history). */
export interface AssistantCards {
  products?: StorefrontProduct[];
  proposal?: AssistantProposal;
  login_required?: boolean;
  cart_updated?: boolean;
}

export interface AssistantMessage {
  /** Server id (assistant replies only carry one once stored); local ids are negative. */
  id: number;
  role: "user" | "assistant";
  content: string;
  cards: AssistantCards | null;
  feedback?: "up" | "down" | null;
  created_at?: string;
  /** Client-only: the reply is still streaming. */
  streaming?: boolean;
  /** Client-only: the turn failed with this Arabic message. */
  error?: string | null;
}

/** One Server-Sent Event of a turn. */
export type AssistantEvent =
  | { event: "thinking"; data: Record<string, never> }
  | { event: "tool"; data: { label: string } }
  | { event: "delta"; data: { text: string } }
  | { event: "products"; data: { products: StorefrontProduct[] } }
  | { event: "cart_updated"; data: { item_count: number } }
  | { event: "login_required"; data: { reason: string; message: string } }
  | { event: "proposal"; data: AssistantProposal }
  | { event: "message"; data: { text: string; message_id: number } }
  | { event: "done"; data: { message_id: number } }
  | { event: "error"; data: { message: string; code: string } };

export interface AssistantConversation {
  id: number;
  channel: string;
  created_at: string | null;
  last_message_at: string | null;
}
