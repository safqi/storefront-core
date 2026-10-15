import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { streamAssistantMessage } from "./assistant";

// Node test env: stand in for the server-injected appConfig + an empty SSE body.
(globalThis as any).window = { appConfig: { API_URL: "https://shop.test/api/v1/" } };
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const emptyStream = () => new ReadableStream({ start: (c) => c.close() });

afterEach(() => {
  vi.unstubAllGlobals();
  delete axios.defaults.headers.common["X-Currency"];
});

describe("streamAssistantMessage", () => {
  it("sends the shopper's display currency and the page context", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: emptyStream() });
    vi.stubGlobal("fetch", fetchMock);
    axios.defaults.headers.common["X-Currency"] = "YER";

    await streamAssistantMessage(5, "كم سعره؟", () => {}, undefined, { type: "product", slug: "oud" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://shop.test/api/v1/assistant/conversations/5/messages");
    expect(init.headers["X-Currency"]).toBe("YER");
    expect(JSON.parse(init.body)).toEqual({ message: "كم سعره؟", context: { type: "product", slug: "oud" } });
  });

  it("omits the currency header and context when there are none", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: emptyStream() });
    vi.stubGlobal("fetch", fetchMock);

    await streamAssistantMessage(5, "هلا", () => {});

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).not.toHaveProperty("X-Currency");
    expect(JSON.parse(init.body)).toEqual({ message: "هلا" });
  });
});
