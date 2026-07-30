import { describe, expect, it } from "vitest";
import { pad, parseDeadline, remaining, ZERO } from "./countdown";

describe("parseDeadline", () => {
  it("reads the admin's wall-clock string as LOCAL time", () => {
    // Parsing as UTC is the bug this guards: an offer that ends "at 20:00"
    // would then end at a different hour for every shopper.
    const d = parseDeadline("2026-08-01T20:00");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(7); // August
    expect(d!.getDate()).toBe(1);
    expect(d!.getHours()).toBe(20);
    expect(d!.getMinutes()).toBe(0);
  });

  it("tolerates a seconds suffix", () => {
    expect(parseDeadline("2026-08-01T20:00:30")).not.toBeNull();
  });

  it.each([
    ["empty", ""],
    ["date only", "2026-08-01"],
    ["free text", "غداً"],
    ["reversed", "01-08-2026T20:00"],
  ])("returns null for %s", (_label, value) => {
    expect(parseDeadline(value)).toBeNull();
  });
});

describe("remaining", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0);

  it("splits the gap into days/hours/minutes/seconds", () => {
    const deadline = new Date(2026, 0, 3, 14, 30, 45);
    expect(remaining(deadline, now)).toEqual({
      days: 2,
      hours: 2,
      minutes: 30,
      seconds: 45,
      expired: false,
    });
  });

  it("reports expired once the deadline has passed", () => {
    expect(remaining(new Date(2025, 11, 31), now)).toEqual(ZERO);
  });

  it("reports expired exactly at the deadline", () => {
    expect(remaining(new Date(2026, 0, 1, 12, 0, 0), now).expired).toBe(true);
  });

  it("reports expired when no deadline is set", () => {
    expect(remaining(null, now)).toEqual(ZERO);
  });

  it("never returns negative units", () => {
    const r = remaining(new Date(2020, 0, 1), now);
    expect(r.days).toBe(0);
    expect(r.seconds).toBe(0);
  });
});

describe("pad", () => {
  it("pads to two digits", () => {
    expect(pad(0)).toBe("00");
    expect(pad(7)).toBe("07");
    expect(pad(42)).toBe("42");
  });

  it("does not truncate three-digit day counts", () => {
    expect(pad(365)).toBe("365");
  });

  it("floors negatives at zero", () => {
    expect(pad(-5)).toBe("00");
  });
});
