/**
 * Countdown maths for the `countdown_offer` section.
 *
 * The merchant stores a naive local wall-clock string ("2026-08-01T20:00") —
 * exactly what they typed in the admin's DateTimeInput. Parsing it as local
 * time is deliberate: an offer that ends "at 8pm" should end at 8pm on the
 * shopper's clock, and round-tripping it through UTC is what makes an offer
 * expire at the wrong hour for anyone in another timezone.
 */

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the deadline has passed (or was never set). */
  expired: boolean;
}

export const ZERO: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

/** Parse `YYYY-MM-DDTHH:mm` as local time. Returns null when unusable. */
export function parseDeadline(value: string): Date | null {
  const raw = (value ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;

  const [, y, mo, d, h, mi] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Time left until `deadline`, floored at zero. */
export function remaining(deadline: Date | null, now: Date = new Date()): Remaining {
  if (!deadline) return ZERO;

  let ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return ZERO;

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  ms = 0;

  return { days, hours, minutes, seconds, expired: false };
}

/** Two-digit pad, in Latin digits so the countdown stays scannable in RTL. */
export function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}
