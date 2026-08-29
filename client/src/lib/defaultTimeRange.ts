import { DateTime } from "luxon";
import type { Time } from "../components/DateSelector/types";

export type DashboardDefaultTimeRange = NonNullable<Time["wellKnown"]>;

export const DASHBOARD_DEFAULT_TIME_RANGE_STORAGE_KEY = "rybbit-default-time-range";

export const DASHBOARD_TIME_PRESET_GROUPS = [
  {
    key: "past-minutes",
    pastMinutesOnly: true,
    ranges: ["last-30-minutes", "last-1-hour", "last-6-hours", "last-24-hours"],
  },
  {
    key: "recent-days",
    pastMinutesOnly: false,
    ranges: ["today", "yesterday", "last-3-days", "last-7-days", "last-14-days", "last-30-days", "last-60-days"],
  },
  {
    key: "calendar-periods",
    pastMinutesOnly: false,
    ranges: ["this-week", "last-week", "this-month", "last-month", "this-year", "all-time"],
  },
] as const satisfies readonly {
  key: string;
  pastMinutesOnly: boolean;
  ranges: readonly DashboardDefaultTimeRange[];
}[];

export const DASHBOARD_DEFAULT_TIME_RANGES: readonly DashboardDefaultTimeRange[] = DASHBOARD_TIME_PRESET_GROUPS.flatMap(
  group => group.ranges
);

const DEFAULT_DASHBOARD_TIME_RANGE: DashboardDefaultTimeRange = "today";

const DEFAULT_TIME_RANGE_ALIASES: Record<string, DashboardDefaultTimeRange> = {
  "last-3d": "last-3-days",
  "last-7d": "last-7-days",
  "last-14d": "last-14-days",
  "last-30d": "last-30-days",
  "last-60d": "last-60-days",
  "last-30m": "last-30-minutes",
  "last-1h": "last-1-hour",
  "last-hour": "last-1-hour",
  "last-6h": "last-6-hours",
  "last-24h": "last-24-hours",
  all: "all-time",
};

export function normalizeDashboardDefaultTimeRange(
  value: string | null | undefined,
  fallback: DashboardDefaultTimeRange = DEFAULT_DASHBOARD_TIME_RANGE
): DashboardDefaultTimeRange {
  const key = value?.trim().toLowerCase().replace(/_/g, "-");
  const canonicalRange = DASHBOARD_DEFAULT_TIME_RANGES.find(range => range === key);
  return canonicalRange || (key && DEFAULT_TIME_RANGE_ALIASES[key]) || fallback;
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

// Some pages cannot afford an all-time default. The users list aggregates every
// event a site has ever recorded — the count query behind it scanned 5.6 B rows
// over six days — which is an expensive way to answer a question the visitor has
// not asked yet.
//
// This caps the *default* only, and it belongs here rather than on the page:
// every caller below already skips the stored default when the URL carries a
// time, and an explicit selection is written to the URL. So picking All time
// from the selector still works and still survives leaving and returning; what
// no longer happens is landing on it unasked.
const DEFAULT_RANGE_CAPS: { appliesTo: (pathname: string) => boolean; cap: DashboardDefaultTimeRange }[] = [
  { appliesTo: pathname => pathname.endsWith("/users"), cap: "last-30-days" },
];

export function capDashboardDefaultRange(
  range: DashboardDefaultTimeRange,
  pathname: string
): DashboardDefaultTimeRange {
  if (range !== "all-time") return range;
  return DEFAULT_RANGE_CAPS.find(rule => rule.appliesTo(pathname))?.cap ?? range;
}

export function getStoredDashboardDefaultTime(timezone: string): Time {
  const stored = getStoredDashboardDefaultTimeRange();
  const range = typeof window === "undefined" ? stored : capDashboardDefaultRange(stored, window.location.pathname);
  return getDashboardTimeForRange(range, timezone);
}
