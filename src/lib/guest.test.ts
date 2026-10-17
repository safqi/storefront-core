// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => {
  (window as any).appConfig = { APP_LANG: "ar" };
  return { value: {} as Record<string, unknown> };
});

import axios from "axios";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createGuestSession, guestCheckoutEnabled } from "./commerce";
import RequireAuth from "../components/RequireAuth";

vi.mock("axios");
vi.mock("./auth", () => ({ useAuth: () => auth.value }));
const mockedPost = vi.mocked(axios.post);

afterEach(() => {
  vi.clearAllMocks();
  delete (window as any).appConfig.GUEST_CHECKOUT;
});

describe("guestCheckoutEnabled", () => {
  it("is true only when the store flag is exactly true", () => {
    expect(guestCheckoutEnabled()).toBe(false);
    (window as any).appConfig.GUEST_CHECKOUT = "yes";
    expect(guestCheckoutEnabled()).toBe(false);
    (window as any).appConfig.GUEST_CHECKOUT = true;
    expect(guestCheckoutEnabled()).toBe(true);
  });
});

describe("createGuestSession", () => {
  it("posts to auth/guest and returns the token + guest user", async () => {
    const result = { token: "1|abc", user: { id: 9, name: "زائر", is_guest: true } };
    mockedPost.mockResolvedValueOnce({ data: result });

    await expect(createGuestSession()).resolves.toEqual(result);
    expect(mockedPost).toHaveBeenCalledWith("auth/guest");
  });
});

function render(allowGuest: boolean, state: Record<string, unknown>) {
  auth.value = {
    isAuthenticated: false,
    hasSession: false,
    guestCheckout: false,
    loading: false,
    ensureSession: () => Promise.resolve(true),
    ...state,
  };
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/cart"] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/cart",
          element: createElement(RequireAuth, { allowGuest, children: "CONTENT" }),
        }),
        createElement(Route, { path: "/login", element: "LOGIN" }),
      ),
    ),
  );
}

describe("RequireAuth", () => {
  it("lets a guest session through only with allowGuest", () => {
    const guest = { hasSession: true, isGuest: true };
    expect(render(true, guest)).toContain("CONTENT");
    expect(render(false, guest)).not.toContain("CONTENT");
  });

  it("lets a real account through either way", () => {
    const user = { hasSession: true, isAuthenticated: true };
    expect(render(true, user)).toContain("CONTENT");
    expect(render(false, user)).toContain("CONTENT");
  });

  it("shows a spinner while starting a guest session instead of redirecting", () => {
    const html = render(true, { guestCheckout: true });
    expect(html).not.toContain("CONTENT");
    expect(html).toContain("animate-spin");
  });

  it("does not render the page without a session when guests are off", () => {
    expect(render(true, {})).not.toContain("CONTENT");
  });
});
