import { DateTime } from "luxon";
import { Time } from "./types";

export type TypedUnit = "minute" | "hour" | "day" | "week";

export type TypedWindow = {
  count: number;
  /** Absent while only the digits have been typed. */
  unit?: TypedUnit;
};

const UNITS: Record<string, TypedUnit> = {
  m: "minute",
  min: "minute",
  mins: "minute",
  minute: "minute",
  minutes: "minute",
  h: "hour",
  hr: "hour",
  hrs: "hour",
  hour: "hour",
  hours: "hour",
  d: "day",
  day: "day",
  days: "day",
  w: "week",
  wk: "week",
  wks: "week",
  week: "week",
  weeks: "week",
};

/**
 * The ceiling on a typed window, in minutes: a year. Minutes and hours are
 * served from the past-minutes path, which the API only sizes for realtime
 * use, so they stop well short of that at a week.
 */
const MAX_DAYS = 366;
const MAX_REALTIME_MINUTES = 7 * 24 * 60;

/**
 * "14d", "3 days", "90 min" → a window counted back from now. Grafana and
 * Datadog take the same shorthand, so anyone who has used a metrics tool
 * already knows it. Bare digits ("14") parse with no unit so the rail can show
 * which letters would finish the phrase; anything else is an ordinary search.
 */
export function parseTypedWindow(text: string): TypedWindow | null {
  const match = /^\s*(\d{1,4})\s*([a-z]*)\s*$/i.exec(text);
  if (!match) return null;

  const count = Number(match[1]);
  if (count < 1) return null;

  if (!match[2]) return { count };

  const unit = UNITS[match[2].toLowerCase()];
  if (!unit) return null;

  const minutes = unit === "minute" ? count : unit === "hour" ? count * 60 : 0;
  if (minutes > MAX_REALTIME_MINUTES) return null;

  const days = unit === "day" ? count : unit === "week" ? count * 7 : 0;
  if (days > MAX_DAYS) return null;

  return { count, unit };
}

export function timeForTypedWindow(window: TypedWindow & { unit: TypedUnit }, zone: string): Time {
  const { count, unit } = window;

  if (unit === "minute" || unit === "hour") {
    return { mode: "past-minutes", pastMinutesStart: unit === "hour" ? count * 60 : count, pastMinutesEnd: 0 };
  }

  const days = unit === "week" ? count * 7 : count;
  const now = DateTime.now().setZone(zone);
  const today = now.toISODate() ?? "";

  // A single day stays `mode: "day"` so it buckets hourly, the same as Today.
  if (days === 1) return { mode: "day", day: today };

  return { mode: "range", startDate: now.minus({ days: days - 1 }).toISODate() ?? "", endDate: today };
}
