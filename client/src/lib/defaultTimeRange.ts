import { DateTime } from "luxon";
import type { Time } from "../components/DateSelector/types";

export type DashboardDefaultTimeRange = NonNullable<Time["wellKnown"]>;

export const DASHBOARD_DEFAULT_TIME_RANGE_STORAGE_KEY = "rybbit-default-time-range";

export const DASHBOARD_DEFAULT_TIME_RANGES = [
  "today",
  "yesterday",
  "last-3-days",
  "last-7-days",
  "last-14-days",
  "last-30-days",
  "last-60-days",
  "this-week",
  "last-week",
  "this-month",
  "last-month",
  "this-year",
  "last-30-minutes",
  "last-1-hour",
  "last-6-hours",
  "last-24-hours",
  "all-time",
] as const satisfies readonly DashboardDefaultTimeRange[];

const DEFAULT_DASHBOARD_TIME_RANGE: DashboardDefaultTimeRange = "today";

const DEFAULT_TIME_RANGE_ALIASES: Record<string, DashboardDefaultTimeRange> = {
  today: "today",
  yesterday: "yesterday",
  "last-3-days": "last-3-days",
  "last-3d": "last-3-days",
  "last-7-days": "last-7-days",
  "last-7d": "last-7-days",
  "last-14-days": "last-14-days",
  "last-14d": "last-14-days",
  "last-30-days": "last-30-days",
  "last-30d": "last-30-days",
  "last-60-days": "last-60-days",
  "last-60d": "last-60-days",
  "this-week": "this-week",
  "last-week": "last-week",
  "this-month": "this-month",
  "last-month": "last-month",
  "this-year": "this-year",
  "last-30-minutes": "last-30-minutes",
  "last-30m": "last-30-minutes",
  "last-1-hour": "last-1-hour",
  "last-1h": "last-1-hour",
  "last-hour": "last-1-hour",
  "last-6-hours": "last-6-hours",
  "last-6h": "last-6-hours",
  "last-24-hours": "last-24-hours",
  "last-24h": "last-24-hours",
  "all-time": "all-time",
  all: "all-time",
};

export function normalizeDashboardDefaultTimeRange(
  value: string | null | undefined,
  fallback: DashboardDefaultTimeRange = DEFAULT_DASHBOARD_TIME_RANGE
): DashboardDefaultTimeRange {
  const key = value?.trim().toLowerCase().replace(/_/g, "-");
  return (key && DEFAULT_TIME_RANGE_ALIASES[key]) || fallback;
}

export function getStoredDashboardDefaultTimeRange(): DashboardDefaultTimeRange {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_TIME_RANGE;

  try {
    return normalizeDashboardDefaultTimeRange(localStorage.getItem(DASHBOARD_DEFAULT_TIME_RANGE_STORAGE_KEY));
  } catch {
    return DEFAULT_DASHBOARD_TIME_RANGE;
  }
}

export function setStoredDashboardDefaultTimeRange(value: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(DASHBOARD_DEFAULT_TIME_RANGE_STORAGE_KEY, normalizeDashboardDefaultTimeRange(value));
  } catch {
    // Ignore storage failures in private browsing or locked-down embeds.
  }
}

export function getDashboardTimeForRange(value: string, timezone: string): Time {
  const range = normalizeDashboardDefaultTimeRange(value);
  const now = DateTime.now().setZone(timezone);
  const today = now.toISODate() ?? "";

  switch (range) {
    case "today":
      return { mode: "day", day: today, wellKnown: "today" };
    case "yesterday":
      return { mode: "day", day: now.minus({ days: 1 }).toISODate() ?? "", wellKnown: "yesterday" };
    case "last-3-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 2 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-3-days",
      };
    case "last-7-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 6 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-7-days",
      };
    case "last-14-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 13 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-14-days",
      };
    case "last-30-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 29 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-30-days",
      };
    case "last-60-days":
      return {
        mode: "range",
        startDate: now.minus({ days: 59 }).toISODate() ?? "",
        endDate: today,
        wellKnown: "last-60-days",
      };
    case "this-week":
      return { mode: "week", week: now.startOf("week").toISODate() ?? "", wellKnown: "this-week" };
    case "last-week":
      return {
        mode: "week",
        week: now.minus({ weeks: 1 }).startOf("week").toISODate() ?? "",
        wellKnown: "last-week",
      };
    case "this-month":
      return { mode: "month", month: now.startOf("month").toISODate() ?? "", wellKnown: "this-month" };
    case "last-month":
      return {
        mode: "month",
        month: now.minus({ months: 1 }).startOf("month").toISODate() ?? "",
        wellKnown: "last-month",
      };
    case "this-year":
      return { mode: "year", year: now.startOf("year").toISODate() ?? "", wellKnown: "this-year" };
    case "last-30-minutes":
      return {
        mode: "past-minutes",
        pastMinutesStart: 30,
        pastMinutesEnd: 0,
        wellKnown: "last-30-minutes",
      };
    case "last-1-hour":
      return {
        mode: "past-minutes",
        pastMinutesStart: 60,
        pastMinutesEnd: 0,
        wellKnown: "last-1-hour",
      };
    case "last-6-hours":
      return {
        mode: "past-minutes",
        pastMinutesStart: 360,
        pastMinutesEnd: 0,
        wellKnown: "last-6-hours",
      };
    case "last-24-hours":
      return {
        mode: "past-minutes",
        pastMinutesStart: 1440,
        pastMinutesEnd: 0,
        wellKnown: "last-24-hours",
      };
    case "all-time":
      return { mode: "all-time", wellKnown: "all-time" };
  }
}

export function getStoredDashboardDefaultTime(timezone: string): Time {
  return getDashboardTimeForRange(getStoredDashboardDefaultTimeRange(), timezone);
}
