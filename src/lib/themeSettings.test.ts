// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyThemeSettings, readableForeground } from "./themeSettings";

/** The `--name: value;` declarations inside one rule (`html:root` / `html.dark`). */
function tokens(selector: "html:root" | "html.dark"): Record<string, string> {
  const css = document.getElementById("tenant-theme-vars")?.textContent ?? "";
  const body = css.match(new RegExp(`${selector.replace(".", "\\.")}\\{([^}]*)\\}`))?.[1] ?? "";
  return Object.fromEntries(
    body
      .split(";")
      .filter(Boolean)
      .map((d) => {
        const at = d.indexOf(":");
        return [d.slice(0, at).trim(), d.slice(at + 1).trim()];
      }),
  );
}

describe("readableForeground", () => {
  it("puts white on a pure red", () => {
    expect(readableForeground([255, 0, 0])).toEqual([255, 255, 255]);
  });

  it("puts black on yellow and other light colors", () => {
    expect(readableForeground([255, 255, 0])).toEqual([17, 17, 19]);
    expect(readableForeground([251, 239, 239])).toEqual([17, 17, 19]);
  });

  it("puts white on dark colors", () => {
    expect(readableForeground([0, 0, 0])).toEqual([255, 255, 255]);
    expect(readableForeground([10, 110, 240])).toEqual([255, 255, 255]);
  });
});

describe("applyThemeSettings accent", () => {
  beforeEach(() => document.getElementById("tenant-theme-vars")?.remove());

  it("uses the picked color verbatim as --accent in both modes", () => {
    applyThemeSettings({ accent_color: "#ff0000" });
    expect(tokens("html:root")["--accent"]).toBe("255 0 0");
    expect(tokens("html.dark")["--accent"]).toBe("255 0 0");
    expect(tokens("html:root")["--accent-foreground"]).toBe("255 255 255");
  });

  it("gives a light pick a dark label", () => {
    applyThemeSettings({ accent_color: "#ffff00" });
    expect(tokens("html:root")["--accent"]).toBe("255 255 0");
    expect(tokens("html:root")["--accent-foreground"]).toBe("17 17 19");
  });

  it("keeps hover distinct from the accent even at the ends of the scale", () => {
    for (const hex of ["#000000", "#ffffff", "#fbefef", "#0a6ef0"]) {
      applyThemeSettings({ accent_color: hex });
      for (const mode of ["html:root", "html.dark"] as const) {
        const t = tokens(mode);
        expect(t["--accent-hover"]).toBeTruthy();
        expect(t["--accent-strong"]).toBeTruthy();
      }
    }
  });

  it("falls back to the default accent for an invalid hex", () => {
    applyThemeSettings({ accent_color: "#zz" });
    expect(tokens("html:root")["--accent"]).toBe("10 110 240");
  });
});
