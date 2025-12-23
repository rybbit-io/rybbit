"use client";

import { DateTime } from "luxon";
import { usePathname } from "next/navigation";
import { useQueryStates } from "nuqs";
import React, { useEffect } from "react";
import { Time } from "../components/DateSelector/types";
import { analyticsParsers } from "./parsers";
import { getTimezone, useStore } from "./store";

// Map of wellKnown presets to their dynamic time calculations
// Uses timezone-aware dates based on the user's selected timezone
const wellKnownPresets: Record<string, () => Time> = {
  today: () => {
    const now = DateTime.now().setZone(getTimezone());
    return { mode: "day", day: now.toISODate()!, wellKnown: "today" };
  },
  yesterday: () => {
    const now = DateTime.now().setZone(getTimezone());
    return { mode: "day", day: now.minus({ days: 1 }).toISODate()!, wellKnown: "yesterday" };
  },
  "last-3-days": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "range",
      startDate: now.minus({ days: 2 }).toISODate()!,
      endDate: now.toISODate()!,
      wellKnown: "last-3-days",
    };
  },
  "last-7-days": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "range",
      startDate: now.minus({ days: 6 }).toISODate()!,
      endDate: now.toISODate()!,
      wellKnown: "last-7-days",
    };
  },
  "last-14-days": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "range",
      startDate: now.minus({ days: 13 }).toISODate()!,
      endDate: now.toISODate()!,
      wellKnown: "last-14-days",
    };
  },
  "last-30-days": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "range",
      startDate: now.minus({ days: 29 }).toISODate()!,
      endDate: now.toISODate()!,
      wellKnown: "last-30-days",
    };
  },
  "last-60-days": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "range",
      startDate: now.minus({ days: 59 }).toISODate()!,
      endDate: now.toISODate()!,
      wellKnown: "last-60-days",
    };
  },
  "this-week": () => {
    const now = DateTime.now().setZone(getTimezone());
    return { mode: "week", week: now.startOf("week").toISODate()!, wellKnown: "this-week" };
  },
  "last-week": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "week",
      week: now.minus({ weeks: 1 }).startOf("week").toISODate()!,
      wellKnown: "last-week",
    };
  },
  "this-month": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "month",
      month: now.startOf("month").toISODate()!,
      wellKnown: "this-month",
    };
  },
  "last-month": () => {
    const now = DateTime.now().setZone(getTimezone());
    return {
      mode: "month",
      month: now.minus({ months: 1 }).startOf("month").toISODate()!,
      wellKnown: "last-month",
    };
  },
  "this-year": () => {
    const now = DateTime.now().setZone(getTimezone());
    return { mode: "year", year: now.startOf("year").toISODate()!, wellKnown: "this-year" };
  },
  "last-30-minutes": () => ({
    mode: "past-minutes",
    pastMinutesStart: 30,
    pastMinutesEnd: 0,
    wellKnown: "last-30-minutes",
  }),
  "last-1-hour": () => ({
    mode: "past-minutes",
    pastMinutesStart: 60,
    pastMinutesEnd: 0,
    wellKnown: "last-1-hour",
  }),
  "last-6-hours": () => ({
    mode: "past-minutes",
    pastMinutesStart: 360,
    pastMinutesEnd: 0,
    wellKnown: "last-6-hours",
  }),
  "last-24-hours": () => ({
    mode: "past-minutes",
    pastMinutesStart: 1440,
    pastMinutesEnd: 0,
    wellKnown: "last-24-hours",
  }),
  "all-time": () => ({ mode: "all-time", wellKnown: "all-time" }),
};

// Hook to sync store state with URL
export const useSyncStateWithUrl = () => {
  const pathname = usePathname();
  const { time, bucket, selectedStat, filters, setTime, setBucket, setSelectedStat, setFilters, site } = useStore();

  // Use a ref to track if we've already loaded from URL
  const initializedFromUrlRef = React.useRef(false);

  // Check if we're on a path where we should sync URL params
  const shouldSyncUrl = () => {
    if (!pathname) return false;
    const pathParts = pathname.split("/");
    if (pathParts.length < 3) return false;
    return [
      "main",
      "sessions",
      "users",
      "performance",
      "globe",
      "goals",
      "events",
      "funnels",
      "journeys",
      "errors",
      "pages",
    ].includes(pathParts[2]);
  };

  // Get URL params using nuqs
  const [urlParams, setUrlParams] = useQueryStates(analyticsParsers, {
    history: "replace",
    shallow: true,
  });

  // Initialize from URL params after site is set
  useEffect(() => {
    if (!site || initializedFromUrlRef.current || !shouldSyncUrl()) return;

    let needsUpdate = false;

    // Deserialize time from URL
    let timeFromUrl: Time | null = null;

    // Try to resolve wellKnown preset first
    if (urlParams.wellKnown && wellKnownPresets[urlParams.wellKnown]) {
      timeFromUrl = wellKnownPresets[urlParams.wellKnown]();
    } else if (urlParams.timeMode) {
      // Fallback to explicit date parameters
      if (urlParams.timeMode === "day" && urlParams.day) {
        timeFromUrl = { mode: "day", day: urlParams.day };
      } else if (urlParams.timeMode === "range" && urlParams.startDate && urlParams.endDate) {
        timeFromUrl = { mode: "range", startDate: urlParams.startDate, endDate: urlParams.endDate };
      } else if (urlParams.timeMode === "week" && urlParams.week) {
        timeFromUrl = { mode: "week", week: urlParams.week };
      } else if (urlParams.timeMode === "month" && urlParams.month) {
        timeFromUrl = { mode: "month", month: urlParams.month };
      } else if (urlParams.timeMode === "year" && urlParams.year) {
        timeFromUrl = { mode: "year", year: urlParams.year };
      } else if (
        urlParams.timeMode === "past-minutes" &&
        urlParams.past_minutes_start !== null &&
        urlParams.past_minutes_end !== null
      ) {
        timeFromUrl = {
          mode: "past-minutes",
          pastMinutesStart: urlParams.past_minutes_start,
          pastMinutesEnd: urlParams.past_minutes_end,
        };
      } else if (urlParams.timeMode === "all-time") {
        timeFromUrl = { mode: "all-time" };
      }
    }

    if (timeFromUrl) {
      setTime(timeFromUrl, false); // Don't change bucket
      needsUpdate = true;
    }

    // Process bucket separately
    if (urlParams.bucket) {
      setBucket(urlParams.bucket);
      needsUpdate = true;
    }

    if (urlParams.stat) {
      setSelectedStat(urlParams.stat);
      needsUpdate = true;
    }

    if (urlParams.filters) {
      setFilters(urlParams.filters);
      needsUpdate = true;
    }

    // Mark that we've initialized from URL
    initializedFromUrlRef.current = true;
  }, [urlParams, site, setTime, setBucket, setSelectedStat, setFilters, shouldSyncUrl, pathname]);

  // Update URL when state changes
  useEffect(() => {
    if (!site || !shouldSyncUrl()) return;

    // Build params object to update - values, not parsers
    const newParams: Record<string, any> = {
      timeMode: time.mode,
      bucket,
      stat: selectedStat,
      filters: filters.length > 0 ? filters : null,
    };

    // If wellKnown preset, only store that
    if (time.wellKnown) {
      newParams.wellKnown = time.wellKnown;
      // Clear explicit date fields
      newParams.day = null;
      newParams.startDate = null;
      newParams.endDate = null;
      newParams.week = null;
      newParams.month = null;
      newParams.year = null;
      newParams.past_minutes_start = null;
      newParams.past_minutes_end = null;
    } else {
      newParams.wellKnown = null;
      // Store explicit date fields based on mode
      if (time.mode === "day" && "day" in time) {
        newParams.day = time.day;
      } else if (time.mode === "range" && "startDate" in time && "endDate" in time) {
        newParams.startDate = time.startDate;
        newParams.endDate = time.endDate;
      } else if (time.mode === "week" && "week" in time) {
        newParams.week = time.week;
      } else if (time.mode === "month" && "month" in time) {
        newParams.month = time.month;
      } else if (time.mode === "year" && "year" in time) {
        newParams.year = time.year;
      } else if (time.mode === "past-minutes" && "pastMinutesStart" in time && "pastMinutesEnd" in time) {
        newParams.past_minutes_start = time.pastMinutesStart;
        newParams.past_minutes_end = time.pastMinutesEnd;
      }
    }

    // Note: embed param is automatically preserved by nuqs
    setUrlParams(newParams);
  }, [time, bucket, selectedStat, filters, site, setUrlParams, shouldSyncUrl, pathname]);
};
