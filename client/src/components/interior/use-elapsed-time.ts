// Adapted from Beautiful UI "Loading State" (MIT). See ./THIRD_PARTY_LICENSES.md
import { useEffect, useState } from "react";

const TICK_MS = 100;

function readClock() {
  return typeof performance === "undefined" ? 0 : performance.now();
}

/**
 * Milliseconds since `startedAt`, a `performance.now()` timestamp, re-rendering about ten times a
 * second. Every tick re-reads the clock instead of counting ticks, so a throttled timer (background
 * tab, busy main thread) never makes the number drift. Returns 0 while `startedAt` is null.
 */
export function useElapsedTime(startedAt: number | null | undefined, tickMs = TICK_MS): number {
  const [now, setNow] = useState(readClock);

  useEffect(() => {
    if (startedAt == null) return;
    const interval = setInterval(() => setNow(readClock()), tickMs);
    return () => clearInterval(interval);
  }, [startedAt, tickMs]);

  return startedAt == null ? 0 : Math.max(0, now - startedAt);
}

type ElapsedFormatters = { seconds: Intl.NumberFormat; minutes: Intl.NumberFormat };
const formattersByLocale = new Map<string, ElapsedFormatters>();

function getFormatters(locale?: string): ElapsedFormatters {
  const key = locale ?? "";
  let formatters = formattersByLocale.get(key);
  if (!formatters) {
    formatters = {
      seconds: new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "second",
        unitDisplay: "narrow",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      minutes: new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "narrow" }),
    };
    formattersByLocale.set(key, formatters);
  }
  return formatters;
}

/**
 * "12.4s" (locale-aware), or "2m 5.3s" past a minute. Truncates to tenths rather than rounding, so a
 * live timer never shows a value the clock hasn't reached yet.
 */
export function formatElapsed(ms: number, locale?: string): string {
  const tenths = Number.isFinite(ms) ? Math.floor(Math.max(0, ms) / 100) : 0;
  const { seconds, minutes } = getFormatters(locale);
  if (tenths < 600) return seconds.format(tenths / 10);
  return `${minutes.format(Math.floor(tenths / 600))} ${seconds.format((tenths % 600) / 10)}`;
}
