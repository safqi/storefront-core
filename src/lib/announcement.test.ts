import { describe, expect, it } from "vitest";
import { DISMISS_PREFIX, dismissKey, fingerprint, personalize } from "./announcement";

describe("personalize", () => {
  it("fills the customer name", () => {
    expect(personalize("مرحباً {{customer_name}}!", "سارة")).toBe("مرحباً سارة!");
  });

  it("tolerates spacing and case in the token", () => {
    expect(personalize("{{ customer_name }} و {{CUSTOMER_NAME}}", "سارة")).toBe("سارة و سارة");
  });

  it("leaves no gap for a guest", () => {
    // A blank substitution must not read as "مرحباً  !" with a double space.
    expect(personalize("مرحباً {{customer_name}} أهلاً بك", "")).toBe("مرحباً أهلاً بك");
  });

  it("trims a message that becomes only the token", () => {
    expect(personalize("{{customer_name}}", "")).toBe("");
  });

  it("leaves text with no token untouched", () => {
    expect(personalize("شحن سريع", "سارة")).toBe("شحن سريع");
  });

  it("does not touch server-scope tokens (they are already substituted)", () => {
    // If one ever survives to the client it is a backend bug — the component
    // must not silently paper over it by stripping it.
    expect(personalize("{{store_name}}", "سارة")).toBe("{{store_name}}");
  });
});

describe("fingerprint", () => {
  it("is stable for the same messages", () => {
    expect(fingerprint(["a", "b"])).toBe(fingerprint(["a", "b"]));
  });

  it("changes when the copy changes", () => {
    // This is the whole point: editing the bar must re-show it to visitors who
    // dismissed the previous version.
    expect(fingerprint(["a", "b"])).not.toBe(fingerprint(["a", "c"]));
  });

  it("changes when a message is added", () => {
    expect(fingerprint(["a"])).not.toBe(fingerprint(["a", "b"]));
  });

  it("distinguishes different groupings of the same characters", () => {
    expect(fingerprint(["ab"])).not.toBe(fingerprint(["a", "b"]));
  });
});

describe("dismissKey", () => {
  it("namespaces the fingerprint", () => {
    expect(dismissKey(["a"])).toBe(`${DISMISS_PREFIX}${fingerprint(["a"])}`);
  });
});
