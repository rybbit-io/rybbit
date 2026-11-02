import { DateTime } from "luxon";

export const appUrl = () => (process.env.BASE_URL || "https://app.rybbit.io").replace(/\/$/, "");

export const formatCount = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? "0" : Math.round(n).toLocaleString("en-US");

/** "Oct 26, 2026" */
export const formatDate = (date: DateTime): string => date.setZone("utc").toFormat("LLL d, yyyy");

/** "Oct 26, 2026 at 14:02 UTC" */
export const formatDateTime = (date: DateTime): string => date.setZone("utc").toFormat("LLL d, yyyy 'at' HH:mm 'UTC'");

export const plural = (n: number, noun: string, pluralNoun = `${noun}s`) =>
  `${formatCount(n)} ${n === 1 ? noun : pluralNoun}`;

/**
 * Week-over-week change as a signed percentage, or null when there is nothing
 * to compare against: a jump from zero is not "+100%".
 */
export const percentChange = (current: number | null | undefined, previous: number | null | undefined) => {
  const curr = current ?? 0;
  const prev = previous ?? 0;
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
};

/** "+9.8%", "−5.4%" (true minus sign), "0%" */
export const formatChange = (change: number): string => {
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}%`;
};

/** "2m 41s", "48s" */
export const formatDuration = (seconds: number | null | undefined): string => {
  const s = Math.max(0, Math.round(seconds ?? 0));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

/** Cuts long paths and referrers so a table cell stays one or two lines. */
export const truncate = (value: string, max = 56): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;
