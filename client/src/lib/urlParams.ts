import { Filter, TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { Time } from "../components/DateSelector/types";
import { StatType, useStore } from "./store";

// Map of wellKnown presets to their dynamic time calculations
const wellKnownPresets: Record<string, () => Time> = {
  today: () => ({ mode: "day", day: DateTime.now().toISODate(), wellKnown: "today" }),
  yesterday: () => ({ mode: "day", day: DateTime.now().minus({ days: 1 }).toISODate(), wellKnown: "yesterday" }),
  "last-3-days": () => ({
    mode: "range",
    startDate: DateTime.now().minus({ days: 2 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "last-3-days",
  }),
  "last-7-days": () => ({
    mode: "range",
    startDate: DateTime.now().minus({ days: 6 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "last-7-days",
  }),
  "last-14-days": () => ({
    mode: "range",
    startDate: DateTime.now().minus({ days: 13 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "last-14-days",
  }),
  "last-30-days": () => ({
    mode: "range",
    startDate: DateTime.now().minus({ days: 29 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "last-30-days",
  }),
  "last-60-days": () => ({
    mode: "range",
    startDate: DateTime.now().minus({ days: 59 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "last-60-days",
  }),
  "this-week": () => ({ mode: "week", week: DateTime.now().startOf("week").toISODate(), wellKnown: "this-week" }),
  "last-week": () => ({
    mode: "week",
    week: DateTime.now().minus({ weeks: 1 }).startOf("week").toISODate(),
    wellKnown: "last-week",
  }),
  "this-month": () => ({
    mode: "month",
    month: DateTime.now().startOf("month").toISODate(),
    wellKnown: "this-month",
  }),
  "last-month": () => ({
    mode: "month",
    month: DateTime.now().minus({ months: 1 }).startOf("month").toISODate(),
    wellKnown: "last-month",
  }),
  "this-year": () => ({ mode: "year", year: DateTime.now().startOf("year").toISODate(), wellKnown: "this-year" }),
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

// Serialize store state to URL parameters
const serializeStateToUrl = (
  time: Time,
  bucket: TimeBucket,
  selectedStat: StatType,
  filters: Filter[]
): URLSearchParams => {
  const params = new URLSearchParams();

  // Serialize time
  params.set("timeMode", time.mode);

  // If wellKnown preset, only store that
  if (time.wellKnown) {
    params.set("wellKnown", time.wellKnown);
  } else {
    // Otherwise store explicit date fields
    if (time.mode === "day") {
      params.set("day", time.day);
    } else if (time.mode === "range") {
      params.set("startDate", time.startDate);
      params.set("endDate", time.endDate);
    } else if (time.mode === "week") {
      params.set("week", time.week);
    } else if (time.mode === "month") {
      params.set("month", time.month);
    } else if (time.mode === "year") {
      params.set("year", time.year);
    } else if (time.mode === "past-minutes") {
      params.set("past_minutes_start", time.pastMinutesStart.toString());
      params.set("past_minutes_end", time.pastMinutesEnd.toString());
    }
  }

  // Serialize bucket
  params.set("bucket", bucket);

  // Serialize selectedStat
  params.set("stat", selectedStat);

  // Serialize filters
  if (filters.length > 0) {
    params.set("filters", JSON.stringify(filters));
  }

  return params;
};

// Deserialize URL parameters to store state
const deserializeUrlToState = (
  searchParams: URLSearchParams
): {
  time: Time | null;
  bucket: TimeBucket | null;
  selectedStat: StatType | null;
  filters: Filter[] | null;
} => {
  const result = {
    time: null as Time | null,
    bucket: null as TimeBucket | null,
    selectedStat: null as StatType | null,
    filters: null as Filter[] | null,
  };

  // Deserialize time
  const timeMode = searchParams.get("timeMode") as Time["mode"] | null;
  const wellKnown = searchParams.get("wellKnown");

  // Try to resolve wellKnown preset first
  if (wellKnown && wellKnownPresets[wellKnown]) {
    result.time = wellKnownPresets[wellKnown]();
  } else if (timeMode) {
    // Fallback to explicit date parameters
    if (timeMode === "day") {
      const day = searchParams.get("day");
      if (day) result.time = { mode: "day", day };
    } else if (timeMode === "range") {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      if (startDate && endDate) result.time = { mode: "range", startDate, endDate };
    } else if (timeMode === "week") {
      const week = searchParams.get("week");
      if (week) result.time = { mode: "week", week };
    } else if (timeMode === "month") {
      const month = searchParams.get("month");
      if (month) result.time = { mode: "month", month };
    } else if (timeMode === "year") {
      const year = searchParams.get("year");
      if (year) result.time = { mode: "year", year };
    } else if (timeMode === "past-minutes") {
      const past_minutes_start = searchParams.get("past_minutes_start");
      const past_minutes_end = searchParams.get("past_minutes_end");
      if (past_minutes_start && past_minutes_end) {
        result.time = {
          mode: "past-minutes",
          pastMinutesStart: Number(past_minutes_start),
          pastMinutesEnd: Number(past_minutes_end),
        };
      }
    } else if (timeMode === "all-time") {
      result.time = { mode: "all-time" };
    }
  }

  // Deserialize bucket with validation
  const bucketParam = searchParams.get("bucket");
  if (bucketParam) {
    // Validate that it's a valid TimeBucket value
    const validBuckets: TimeBucket[] = [
      "minute",
      "five_minutes",
      "ten_minutes",
      "fifteen_minutes",
      "hour",
      "day",
      "week",
      "month",
      "year",
    ];

    if (validBuckets.includes(bucketParam as TimeBucket)) {
      result.bucket = bucketParam as TimeBucket;
    }
  }

  // Deserialize selectedStat
  const stat = searchParams.get("stat") as StatType | null;
  if (stat) {
    result.selectedStat = stat;
  }

  // Deserialize filters
  const filtersStr = searchParams.get("filters");
  if (filtersStr) {
    try {
      result.filters = JSON.parse(filtersStr);
    } catch (e) {
      console.error("Failed to parse filters from URL", e);
    }
  }

  return result;
};

// Hook to sync store state with URL
export const useSyncStateWithUrl = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { time, bucket, selectedStat, filters, setTime, setBucket, setSelectedStat, setFilters, site } = useStore();

  // Use a ref to track if we've already loaded from URL
  // This prevents overriding user changes if the effect re-runs
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

  // Initialize from URL params after site is set
  // This fixes the issue where setSite would override URL params
  useEffect(() => {
    // Only proceed if site has been set and we haven't initialized yet
    // and we're on a path where we should sync URL params
    if (!site || initializedFromUrlRef.current || !shouldSyncUrl()) return;

    const state = deserializeUrlToState(searchParams);
    let needsUpdate = false;

    // Process time first without changing bucket
    if (state.time) {
      setTime(state.time, false); // Don't change bucket
      needsUpdate = true;
    }

    // Process bucket separately to ensure it's not overridden by setTime
    if (state.bucket) {
      setBucket(state.bucket);
      needsUpdate = true;
    }

    if (state.selectedStat) {
      setSelectedStat(state.selectedStat);
      needsUpdate = true;
    }

    if (state.filters) {
      setFilters(state.filters);
      needsUpdate = true;
    }

    // If we updated the state from URL, also update the previousTime
    // but make sure not to change the bucket again
    if (needsUpdate && state.time) {
      // Force a recalculation of the previousTime by setting the time again
      // But explicitly tell it not to change the bucket
      setTime(state.time, false);
    }

    // Mark that we've initialized from URL
    initializedFromUrlRef.current = true;
  }, [searchParams, site, setTime, setBucket, setSelectedStat, setFilters]); // Added all dependencies

  // Update URL when state changes
  useEffect(() => {
    // Don't update URL if site hasn't been set yet
    // or if we're not on a path where we should sync URL params
    if (!site || !shouldSyncUrl()) return;

    const params = serializeStateToUrl(time, bucket, selectedStat, filters);
    const newSearch = params.toString();

    // Only update if the search params have changed to avoid infinite loops
    // Create a copy of current search params without the embed param for comparison
    const currentParamsForComparison = new URLSearchParams(searchParams);
    currentParamsForComparison.delete("embed");
    const currentSearch = currentParamsForComparison.toString();

    if (newSearch !== currentSearch) {
      // Preserve the embed param if it exists
      const embedParam = searchParams.get("embed");
      if (embedParam) {
        params.set("embed", embedParam);
      }
      // Replace the current URL with the new one to avoid adding to history
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [time, bucket, selectedStat, filters, pathname, router, site, searchParams]); // Added searchParams
};
