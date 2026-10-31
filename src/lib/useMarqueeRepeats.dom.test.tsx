// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMarqueeRepeats } from "./useMarqueeRepeats";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does no layout: fake the two widths the hook reads — an 800px bar
// holding a 200px message copy, which needs 4 copies per half.
function fakeWidths() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const width = this.dataset.role === "viewport" ? 800 : this.dataset.role === "unit" ? 200 : 0;
    return { width, height: 20, top: 0, left: 0, right: width, bottom: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

let show: (v: boolean) => void = () => {};

/** Mirrors AnnouncementBar: renders nothing on the first pass, then appears. */
function Bar({ initiallyVisible }: { initiallyVisible: boolean }) {
  const [visible, setVisible] = useState(initiallyVisible);
  show = setVisible;
  const [repeats, viewportRef, unitRef] = useMarqueeRepeats(["same text"]);
  if (!visible) return null;

  return (
    <div data-role="viewport" ref={viewportRef}>
      <div data-role="unit" ref={unitRef} />
      <output>{repeats}</output>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  fakeWidths();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("useMarqueeRepeats", () => {
  it("measures a bar that is visible on mount", () => {
    act(() => root.render(<Bar initiallyVisible />));
    expect(container.querySelector("output")?.textContent).toBe("4");
  });

  it("measures a bar that only appears after mount, with unchanged deps", () => {
    // The bar starts hidden (dismissal not yet read) so the refs are null on
    // mount; it must still fill with copies once it shows, or short text
    // leaves a blank run in the strip.
    act(() => root.render(<Bar initiallyVisible={false} />));
    act(() => show(true));
    expect(container.querySelector("output")?.textContent).toBe("4");
  });
});
