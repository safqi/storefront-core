// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (window as any).appConfig = { APP_LANG: "ar" };
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dotScale, dotWindow, normalizeDots, rubberBand, swiperPropsFromConfig } from "./swiper";
import { scrollBounds, splitOverscroll } from "./dragScroll";
import { parseTitlePosition, titlePositionAttrs } from "./sectionTitle";
import Swiper from "../components/Swiper";

describe("rubberBand", () => {
  it("is 0 for no overscroll and keeps the sign", () => {
    expect(rubberBand(0, 400)).toBe(0);
    expect(rubberBand(50, 400)).toBeGreaterThan(0);
    expect(rubberBand(-50, 400)).toBeLessThan(0);
    expect(rubberBand(-50, 400)).toBeCloseTo(-rubberBand(50, 400));
  });

  it("resists more the further you pull, and never reaches the viewport size", () => {
    const small = rubberBand(20, 400);
    const big = rubberBand(2000, 400);
    expect(small / 20).toBeGreaterThan(big / 2000);
    expect(rubberBand(1e9, 400)).toBeLessThan(400);
  });
});

describe("dotWindow / dotScale", () => {
  it("shows every dot when they fit", () => {
    expect(dotWindow(5, 3, 7)).toEqual([0, 5]);
  });

  it("follows the active slide and pins at both ends", () => {
    expect(dotWindow(20, 0, 7)).toEqual([0, 7]);
    expect(dotWindow(20, 10, 7)).toEqual([7, 14]);
    expect(dotWindow(20, 19, 7)).toEqual([13, 20]);
  });

  it("shrinks dots at an edge that hides more", () => {
    const w = dotWindow(20, 10, 7);
    expect(dotScale(7, 10, w, 20)).toBe(0.5);
    expect(dotScale(13, 10, w, 20)).toBe(0.5);
    expect(dotScale(10, 10, w, 20)).toBe(1);
    // Nothing hidden before the first window → first dot is full size.
    expect(dotScale(0, 0, dotWindow(20, 0, 7), 20)).toBe(1);
  });
});

describe("options", () => {
  it("defaults to centred pill dots inside, honouring the legacy showDots", () => {
    expect(normalizeDots(undefined)).toMatchObject({ show: true, style: "pill", position: "inside", align: "center" });
    expect(normalizeDots(undefined, false).show).toBe(false);
    expect(normalizeDots(false).show).toBe(false);
    expect(normalizeDots({ style: "bogus" as any, align: "end" })).toMatchObject({ style: "pill", align: "end" });
  });

  it("reads a section config with safe fallbacks", () => {
    expect(swiperPropsFromConfig({})).toMatchObject({ loop: true, autoPlay: false, interval: 4, arrows: false });
    const p = swiperPropsFromConfig({
      loop: false,
      auto_play: true,
      interval: 6,
      arrows: true,
      show_dots: true,
      dots_style: "fraction",
      dots_position: "outside",
      dots_align: "start",
      dots_color: "#ccc",
      dots_active_color: "#111",
    });
    expect(p).toMatchObject({ loop: false, autoPlay: true, interval: 6, arrows: true });
    expect(p.dots).toEqual({ show: true, style: "fraction", position: "outside", align: "start", color: "#ccc", activeColor: "#111" });
  });
});

describe("dots_placement", () => {
  it("reads the single placement value, ignoring junk", () => {
    expect(swiperPropsFromConfig({ dots_placement: "outside-end" }).dots).toMatchObject({ position: "outside", align: "end" });
    expect(swiperPropsFromConfig({ dots_placement: "nowhere" }).dots).toMatchObject({ position: "inside", align: "center" });
  });
});

describe("titlePositionAttrs", () => {
  it("maps a placement to data attributes and stays empty for auto", () => {
    expect(titlePositionAttrs({ title_position: "bottom-center" })).toEqual({ "data-title-v": "bottom", "data-title-align": "center" });
    expect(titlePositionAttrs({ title_position: "top-end" })).toEqual({ "data-title-v": "top", "data-title-align": "end" });
    expect(titlePositionAttrs({ title_position: "" })).toEqual({});
    expect(titlePositionAttrs({})).toEqual({});
    expect(titlePositionAttrs({ title_position: "middle-left" })).toEqual({});
    expect(parseTitlePosition("top-start")).toEqual({ vertical: "top", align: "start" });
  });
});

describe("over-scroll split", () => {
  it("reports scroll bounds for LTR and RTL", () => {
    expect(scrollBounds(1000, 400, false)).toEqual([0, 600]);
    expect(scrollBounds(1000, 400, true)).toEqual([-600, 0]);
    expect(scrollBounds(300, 400, false)).toEqual([0, 0]);
  });

  it("splits a target into the reachable scroll and the overshoot", () => {
    expect(splitOverscroll(650, [0, 600])).toEqual({ scroll: 600, over: 50 });
    expect(splitOverscroll(-30, [0, 600])).toEqual({ scroll: 0, over: -30 });
    expect(splitOverscroll(300, [0, 600])).toEqual({ scroll: 300, over: 0 });
  });
});

describe("<Swiper/> markup", () => {
  const slides = (n: number) => Array.from({ length: n }, (_, i) => createElement("img", { key: i, alt: "" }));

  it("renders centred pill dots inside by default", () => {
    const html = renderToStaticMarkup(createElement(Swiper, { children: slides(3) }));
    expect(html).toContain("sf-swiper__dots--inside");
    expect(html).toContain("sf-swiper__dots--center");
    expect(html).toContain("sf-swiper__dots--pill");
    expect(html.match(/sf-swiper__dot\b/g)).toHaveLength(3);
  });

  it("supports fraction outside with custom colours, arrows, and hidden dots", () => {
    const html = renderToStaticMarkup(
      createElement(Swiper, { dots: { style: "fraction", position: "outside", activeColor: "red" }, arrows: true, children: slides(4) }),
    );
    expect(html).toContain("1 / 4");
    expect(html).toContain("has-outside-dots");
    expect(html).toContain("--sf-swiper-dot-active:red");
    expect(html).toContain("sf-swiper__arrow--next");

    const none = renderToStaticMarkup(createElement(Swiper, { dots: false, children: slides(4) }));
    expect(none).not.toContain("sf-swiper__dots");
  });

  it("collapses many slides into a window of dots", () => {
    const html = renderToStaticMarkup(createElement(Swiper, { maxDots: 5, children: slides(12) }));
    expect(html.match(/sf-swiper__dot\b/g)).toHaveLength(5);
  });

  it("renders a lone slide without any chrome", () => {
    const html = renderToStaticMarkup(createElement(Swiper, { children: slides(1) }));
    expect(html).not.toContain("sf-swiper__dots");
    expect(html).not.toContain("sf-swiper__arrow");
  });
});
