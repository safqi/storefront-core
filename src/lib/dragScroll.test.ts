// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachDragScroll } from "./dragScroll";

/**
 * DOM-level guards for the gesture wiring. The pure arithmetic lives in
 * `useDragScroll.test.ts`; what is asserted here is the behaviour that made
 * every product card in a shelf unopenable — see the `setPointerCapture` note in
 * `dragScroll.ts`.
 *
 * jsdom has no layout engine, so overflow is stubbed: `attachDragScroll` refuses
 * to drag a row whose content fits, and in jsdom everything "fits" (every box is
 * 0×0) so without this the hook would correctly do nothing and every test would
 * pass for the wrong reason.
 */

let rail: HTMLDivElement;
let card: HTMLAnchorElement;
let detach: () => void;

/**
 * jsdom ships no PointerEvent, and the handlers only read these four fields.
 * `button` is read-only on a constructed MouseEvent, so it goes through the
 * constructor while the pointer fields are assigned on top.
 */
function pointer(type: string, x: number, y: number, init: { pointerType?: string; button?: number } = {}) {
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: init.button ?? 0,
  });
  Object.assign(e, { pointerId: 1, pointerType: init.pointerType ?? "mouse" });
  return e as unknown as PointerEvent;
}

/** Press, travel, release — `distance` under the threshold makes it a click. */
function gesture(distance: number) {
  card.dispatchEvent(pointer("pointerdown", 100, 50));
  for (let i = 1; i <= 4; i++) {
    document.dispatchEvent(pointer("pointermove", 100 + (distance * i) / 4, 50));
  }
  document.dispatchEvent(pointer("pointerup", 100 + distance, 50));
}

/**
 * Dispatches a click on the card and reports whether anything swallowed it.
 *
 * `reachedCard` is the one that matters: a react-router `<Link>` navigates from
 * its own click handler, so a click that never reaches the card is a product the
 * shopper cannot open. `defaultPrevented` is read at the card — before the spy
 * cancels it, which it must do or jsdom logs a failed navigation for every pass.
 */
function clickCard(): { defaultPrevented: boolean; reachedCard: boolean } {
  let reachedCard = false;
  let prevented = false;
  const spy = (e: Event) => {
    reachedCard = true;
    prevented = e.defaultPrevented;
    e.preventDefault();
  };
  card.addEventListener("click", spy);
  const e = new MouseEvent("click", { bubbles: true, cancelable: true });
  card.dispatchEvent(e);
  card.removeEventListener("click", spy);
  return { defaultPrevented: reachedCard ? prevented : e.defaultPrevented, reachedCard };
}

beforeEach(() => {
  document.body.innerHTML = `<div id="rail"><a id="card" href="/product/1">card</a></div>`;
  rail = document.getElementById("rail") as HTMLDivElement;
  card = document.getElementById("card") as HTMLAnchorElement;

  // A row with 900px of cards in a 300px viewport — i.e. something to drag.
  Object.defineProperty(rail, "scrollWidth", { value: 900, configurable: true });
  Object.defineProperty(rail, "clientWidth", { value: 300, configurable: true });
  // jsdom does not implement scrolling, so scrollLeft must be a plain property
  // for the drag's writes to be observable.
  Object.defineProperty(rail, "scrollLeft", { value: 0, writable: true, configurable: true });

  detach = attachDragScroll(rail, { momentum: false });
});

afterEach(() => {
  detach?.();
  vi.restoreAllMocks();
});

describe("attachDragScroll — clicks survive", () => {
  /**
   * THE regression. `setPointerCapture` on the scroll container makes the
   * browser dispatch the trailing click at the container instead of the card, so
   * a react-router <Link> inside a shelf never navigates. Nothing may call it.
   */
  it("never takes pointer capture, which would steal the click from the card", () => {
    const capture = vi.fn();
    // jsdom omits these entirely; a spy both provides them and proves the
    // gesture leaves them alone.
    (rail as unknown as { setPointerCapture: unknown }).setPointerCapture = capture;
    (rail as unknown as { hasPointerCapture: unknown }).hasPointerCapture = () => false;
    (rail as unknown as { releasePointerCapture: unknown }).releasePointerCapture = vi.fn();

    gesture(-200);

    expect(capture).not.toHaveBeenCalled();
  });

  it("lets a plain press-and-release through to the card", () => {
    gesture(0);

    expect(clickCard()).toEqual({ defaultPrevented: false, reachedCard: true });
  });

  it("still lets the click through when the mouse jitters under the threshold", () => {
    // A real mouse never holds perfectly still between press and release.
    gesture(3);

    expect(clickCard()).toEqual({ defaultPrevented: false, reachedCard: true });
    expect(rail.scrollLeft).toBe(0); // …and 3px of shake must not nudge the row
  });

  it("swallows the click that trails a real drag, so a swipe opens nothing", () => {
    gesture(-200);

    expect(clickCard()).toEqual({ defaultPrevented: true, reachedCard: false });
  });

  it("re-arms for the very next click, so one drag does not deaden the shelf", () => {
    gesture(-200);
    clickCard(); // eaten

    gesture(0);
    expect(clickCard()).toEqual({ defaultPrevented: false, reachedCard: true });
  });

  /**
   * The guards in onPointerDown return before the gesture is set up. If the
   * click-eating latch were cleared after them, a drag followed by a press the
   * hook ignores (a touch, a right-click) would leave it armed and eat a click
   * the shopper meant.
   */
  it("disarms the latch even when the press is one it ignores", () => {
    gesture(-200); // arms the latch

    // A touch press: handled natively, so the hook bails out early.
    card.dispatchEvent(pointer("pointerdown", 100, 50, { pointerType: "touch" }));

    expect(clickCard()).toEqual({ defaultPrevented: false, reachedCard: true });
  });
});

describe("attachDragScroll — scrolling", () => {
  it("scrolls the row by the drag distance", () => {
    gesture(-200);

    expect(rail.scrollLeft).toBe(200);
  });

  it("keeps following a pointer that has left the row", () => {
    card.dispatchEvent(pointer("pointerdown", 100, 50));
    // Released far below the rail — the case pointer capture used to cover.
    document.dispatchEvent(pointer("pointermove", -50, 400));
    document.dispatchEvent(pointer("pointerup", -50, 400));

    expect(rail.scrollLeft).toBe(150);
  });

  it("ignores a press on a row whose content already fits", () => {
    Object.defineProperty(rail, "scrollWidth", { value: 300, configurable: true });

    gesture(-200);

    expect(rail.scrollLeft).toBe(0);
    expect(clickCard().reachedCard).toBe(true);
  });

  it("ignores touch, leaving the browser's own scrolling alone", () => {
    card.dispatchEvent(pointer("pointerdown", 100, 50, { pointerType: "touch" }));
    document.dispatchEvent(pointer("pointermove", -100, 50, { pointerType: "touch" }));
    document.dispatchEvent(pointer("pointerup", -100, 50, { pointerType: "touch" }));

    expect(rail.scrollLeft).toBe(0);
  });

  it("ignores a non-primary button, so a right-click opens the context menu", () => {
    card.dispatchEvent(pointer("pointerdown", 100, 50, { button: 2 }));
    document.dispatchEvent(pointer("pointermove", -100, 50));
    document.dispatchEvent(pointer("pointerup", -100, 50));

    expect(rail.scrollLeft).toBe(0);
  });
});

describe("attachDragScroll — teardown", () => {
  it("stops dragging and drops its inline styles once detached", () => {
    detach();

    gesture(-200);

    expect(rail.scrollLeft).toBe(0);
    expect(rail.style.cursor).toBe("");
    expect(rail.style.userSelect).toBe("");
  });

  /**
   * The move/up pair lives on the document for the length of a press. Detaching
   * mid-gesture must take them with it, or they scroll a detached element for
   * the rest of the session.
   */
  it("unbinds the document listeners even when detached mid-drag", () => {
    const remove = vi.spyOn(document, "removeEventListener");

    card.dispatchEvent(pointer("pointerdown", 100, 50));
    document.dispatchEvent(pointer("pointermove", -50, 50));
    detach();

    const removed = remove.mock.calls.map((c) => c[0]);
    expect(removed).toContain("pointermove");
    expect(removed).toContain("pointerup");

    document.dispatchEvent(pointer("pointermove", -300, 50));
    expect(rail.scrollLeft).toBe(150); // frozen where the drag was cut off
  });

  it("releases the document listeners after an ordinary release", () => {
    gesture(-200);

    // Stray moves with no button held must not keep scrolling the row.
    document.dispatchEvent(pointer("pointermove", -900, 50));

    expect(rail.scrollLeft).toBe(200);
  });
});
