import { describe, expect, it } from "vitest";
import { assistantReducer, createSseParser, initialAssistantState } from "./assistant";
import type { AssistantEvent } from "../types/assistant";

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
