import { describe, expect, it } from "vitest";
import { ASPECTS, parseVideo } from "./video";

describe("parseVideo — YouTube", () => {
  const cases: [string, string][] = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ];

  it.each(cases)("extracts the id from %s", (url, id) => {
    // A merchant pastes whatever their address bar shows; every shape must work.
    const parsed = parseVideo(url);
    expect(parsed).toMatchObject({ kind: "youtube", id });
  });

  it("embeds through the no-cookie host", () => {
    const parsed = parseVideo("https://youtu.be/abc123");
    expect(parsed?.kind).toBe("youtube");
    expect(parsed && "embed" in parsed && parsed.embed).toContain("youtube-nocookie.com/embed/abc123");
  });

  it("only sets autoplay together with mute", () => {
    // Browsers silently refuse to autoplay an unmuted video.
    const parsed = parseVideo("https://youtu.be/abc123", { autoplay: true, muted: false });
    expect(parsed && "embed" in parsed && parsed.embed).toContain("autoplay=1");
    expect(parsed && "embed" in parsed && parsed.embed).toContain("mute=1");
  });

  it("leaves autoplay off by default", () => {
    const parsed = parseVideo("https://youtu.be/abc123");
    expect(parsed && "embed" in parsed && parsed.embed).toContain("autoplay=0");
  });
});

describe("parseVideo — Vimeo", () => {
  it("reads a plain vimeo url", () => {
    expect(parseVideo("https://vimeo.com/123456789")).toMatchObject({ kind: "vimeo", id: "123456789" });
  });

  it("reads a player url", () => {
    expect(parseVideo("https://player.vimeo.com/video/123456789")).toMatchObject({
      kind: "vimeo",
      id: "123456789",
    });
  });

  it("rejects a vimeo url with no numeric id", () => {
    expect(parseVideo("https://vimeo.com/channels/staffpicks")).toBeNull();
  });
});

describe("parseVideo — direct files", () => {
  it.each(["mp4", "webm", "ogg", "mov"])("accepts a .%s url", (ext) => {
    expect(parseVideo(`https://cdn.example.com/a.${ext}`)).toMatchObject({ kind: "file" });
  });

  it("accepts a file url carrying a query string", () => {
    expect(parseVideo("https://cdn.example.com/a.mp4?v=2")).toMatchObject({ kind: "file" });
  });
});

describe("parseVideo — rejections", () => {
  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["not a url", "just some text"],
    ["unknown host", "https://example.com/watch"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<h1>x</h1>"],
  ])("returns null for %s", (_label, url) => {
    expect(parseVideo(url)).toBeNull();
  });
});

describe("ASPECTS", () => {
  it("maps every ratio the admin offers", () => {
    // These classes are why a merchant-chosen ratio survives Tailwind's JIT.
    for (const ratio of ["16/9", "4/3", "1/1", "9/16"]) {
      expect(ASPECTS[ratio]).toBeTruthy();
    }
  });
});
