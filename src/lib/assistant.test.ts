import { describe, expect, it } from "vitest";
import {
  assistantContextFromLocation,
  assistantContextPrompts,
  assistantReducer,
  createSseParser,
  initialAssistantState,
} from "./assistant";
import type { AssistantConfig, AssistantEvent } from "../types/assistant";

const ev = (event: AssistantEvent) => ({ type: "event" as const, event });

describe("createSseParser", () => {
  it("parses complete events and buffers partial ones across chunks", () => {
    const parse = createSseParser();

    expect(parse('event: tool\ndata: {"label":"بحث"}\n\nevent: del')).toEqual([
      { event: "tool", data: { label: "بحث" } },
    ]);
    expect(parse('ta\ndata: {"text":"أهلاً"}\n\n')).toEqual([{ event: "delta", data: { text: "أهلاً" } }]);
  });

  it("handles CRLF and skips malformed frames", () => {
    const parse = createSseParser();

    expect(parse('event: done\r\ndata: {"message_id":5}\r\n\r\nevent: x\ndata: {nope\n\n')).toEqual([
      { event: "done", data: { message_id: 5 } },
    ]);
  });
});

describe("assistantReducer", () => {
  const product = (id: number) => ({ id, name: `p${id}` }) as any;

  it("runs a full turn: send → status → cards → text → done", () => {
    let s = assistantReducer(initialAssistantState, { type: "send", text: "حذاء" });
    expect(s.busy).toBe(true);
    expect(s.messages.map((m) => m.role)).toEqual(["user", "assistant"]);

    s = assistantReducer(s, ev({ event: "tool", data: { label: "البحث في المنتجات…" } }));
    expect(s.status).toBe("البحث في المنتجات…");

    s = assistantReducer(s, ev({ event: "products", data: { products: [product(1), product(2)] } }));
    s = assistantReducer(s, ev({ event: "products", data: { products: [product(2), product(3)] } }));
    s = assistantReducer(s, ev({ event: "delta", data: { text: "هذه" } }));
    s = assistantReducer(s, ev({ event: "delta", data: { text: " خيارات" } }));
    expect(s.status).toBe("");
    s = assistantReducer(s, ev({ event: "message", data: { text: "هذه خيارات", message_id: 42 } }));
    s = assistantReducer(s, ev({ event: "done", data: { message_id: 42 } }));

    const reply = s.messages[1];
    expect(reply.id).toBe(42);
    expect(reply.content).toBe("هذه خيارات");
    expect(reply.cards?.products?.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(reply.streaming).toBe(false);
    expect(s.busy).toBe(false);
  });

  it("retires a confirmed card and appends the order confirmation", () => {
    let s = assistantReducer(initialAssistantState, { type: "send", text: "اطلب" });
    s = assistantReducer(s, ev({ event: "proposal", data: { type: "checkout", token: "t9", expires_in: 900, summary: {} as any } }));
    s = assistantReducer(s, ev({ event: "done", data: { message_id: 7 } }));
    s = assistantReducer(s, {
      type: "proposal_done",
      token: "t9",
      message: { id: 8, role: "assistant", content: "✅ تم تأكيد طلبك رقم #1042", cards: { order: { id: 5, order_number: "1042", total: "25.00", currency: "IQD" } } },
    });
    expect(s.messages.some((m) => m.cards?.proposal)).toBe(false);
    const last = s.messages[s.messages.length - 1];
    expect(last.content).toContain("#1042");
    expect(last.cards?.order?.id).toBe(5);
  });

  it("keeps the guest-session credential out of the chat state", () => {
    const sent = assistantReducer(initialAssistantState, { type: "send", text: "أضف" });
    const s = assistantReducer(sent, ev({ event: "session", data: { token: "9|secret", user: { id: 1, name: "زائر", email: null, phone: null, type: "customer", is_guest: true } } }));
    expect(s).toBe(sent);
    expect(JSON.stringify(s)).not.toContain("9|secret");
  });

  it("records login walls, proposals and errors on the streaming reply", () => {
    let s = assistantReducer(initialAssistantState, { type: "send", text: "اطلب" });
    s = assistantReducer(s, ev({ event: "login_required", data: { reason: "x", message: "سجّل" } }));
    s = assistantReducer(s, ev({ event: "proposal", data: { type: "checkout", token: "t1", expires_in: 900, summary: {} as any } }));
    s = assistantReducer(s, ev({ event: "error", data: { message: "تعذّر", code: "failed" } }));

    const reply = s.messages[1];
    expect(reply.cards?.login_required).toBe(true);
    expect(reply.cards?.proposal?.token).toBe("t1");
    expect(reply.error).toBe("تعذّر");
    expect(s.busy).toBe(false);

    s = assistantReducer(s, { type: "proposal_done", token: "t1" });
    expect(s.messages[1].cards?.proposal).toBeUndefined();
  });

  it("ignores stream events when no reply is streaming, and stores feedback", () => {
    const loaded = assistantReducer(initialAssistantState, {
      type: "load",
      messages: [{ id: 7, role: "assistant", content: "أهلاً", cards: null }],
    });

    expect(assistantReducer(loaded, ev({ event: "delta", data: { text: "x" } })).messages[0].content).toBe("أهلاً");
    expect(assistantReducer(loaded, { type: "feedback", id: 7, rating: "up" }).messages[0].feedback).toBe("up");
  });
});

describe("assistantContextFromLocation", () => {
  it("reads a product page, decoding Arabic slugs", () => {
    expect(assistantContextFromLocation("/products/running-shoe")).toEqual({ type: "product", slug: "running-shoe" });
    expect(assistantContextFromLocation("/products/%D8%AD%D8%B0%D8%A7%D8%A1/")).toEqual({ type: "product", slug: "حذاء" });
  });

  it("reads search pages, and a lone filter as that category / brand", () => {
    expect(assistantContextFromLocation("/search", "?search=%20جري%20&category=shoes")).toEqual({
      type: "search",
      search: "جري",
      category: "shoes",
    });
    expect(assistantContextFromLocation("/search", "?category=shoes")).toEqual({ type: "category", slug: "shoes" });
    expect(assistantContextFromLocation("/search", "?brand=nike&sort=price")).toEqual({ type: "brand", slug: "nike" });
    expect(assistantContextFromLocation("/search", "?category=shoes&brand=nike")).toEqual({
      type: "search",
      category: "shoes",
      brand: "nike",
    });
  });

  it("clips long queries and returns null for pages without context", () => {
    expect(assistantContextFromLocation("/search", `?search=${"a".repeat(300)}`)?.search).toHaveLength(100);
    expect(assistantContextFromLocation("/search")).toBeNull();
    expect(assistantContextFromLocation("/")).toBeNull();
    expect(assistantContextFromLocation("/cart")).toBeNull();
    expect(assistantContextFromLocation("/products")).toBeNull();
  });
});

describe("assistantContextPrompts", () => {
  const config = {
    capabilities: { page_context: true },
    context_prompts: { product: ["فيه كوبون؟"] },
  } as unknown as AssistantConfig;

  it("picks the prompts for the page type", () => {
    expect(assistantContextPrompts(config, { type: "product", slug: "x" })).toEqual(["فيه كوبون؟"]);
    expect(assistantContextPrompts(config, { type: "search", search: "x" })).toEqual([]);
  });

  it("is empty with no context, no config, or page_context off", () => {
    expect(assistantContextPrompts(config, null)).toEqual([]);
    expect(assistantContextPrompts(null, { type: "product", slug: "x" })).toEqual([]);
    const off = { ...config, capabilities: { page_context: false } } as unknown as AssistantConfig;
    expect(assistantContextPrompts(off, { type: "product", slug: "x" })).toEqual([]);
  });
});

describe("assistantReducer coupons", () => {
  it("attaches coupon cards to the streaming reply without duplicates", () => {
    let state = assistantReducer(initialAssistantState, { type: "send", text: "فيه كوبون؟" });
    state = assistantReducer(state, ev({ event: "coupons", data: { coupons: [{ code: "OPEN10", discount: "10%" }] } }));
    state = assistantReducer(state, ev({ event: "coupons", data: { coupons: [{ code: "OPEN10" }, { code: "VIP" }] } }));
    expect(state.messages[1].cards?.coupons?.map((c) => c.code)).toEqual(["OPEN10", "VIP"]);
  });
});
