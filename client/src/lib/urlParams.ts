"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import React, { useEffect } from "react";
import { Time } from "../components/DateSelector/types";
import { getDashboardTimeForRange, getStoredDashboardDefaultTime } from "./defaultTimeRange";
import { analyticsParsers } from "./parsers";
import { getSiteRouteContext, isSyncedAnalyticsRoute } from "./siteRoute";
import { getTimezone, useStore } from "./store";

// Hook to sync store state with URL
export const useSyncStateWithUrl = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { time, bucket, selectedStat, filters, setTime, setBucket, setSelectedStat, setFilters, site } = useStore();

  const routeContext = React.useMemo(() => getSiteRouteContext(pathname), [pathname]);
  const shouldSyncUrl = isSyncedAnalyticsRoute(routeContext.route);
  const hydrationKey = shouldSyncUrl
    ? `${routeContext.siteId ?? ""}:${routeContext.privateKey ?? ""}:${routeContext.route ?? ""}?${searchParams.toString()}`
    : null;
  const [hydratedUrlKey, setHydratedUrlKey] = React.useState<string | null>(null);

  useEffect(() => {
    if (!hydrationKey && hydratedUrlKey) {
      setHydratedUrlKey(null);
    }
  }, [hydrationKey, hydratedUrlKey]);

  // Get URL params using nuqs
  const [urlParams, setUrlParams] = useQueryStates(analyticsParsers, {
    history: "replace",
    shallow: true,
  });

  // Initialize from URL params after site is set
  useEffect(() => {
    if (!hydrationKey || site !== routeContext.siteId || hydratedUrlKey === hydrationKey) return;

    // Deserialize time from URL
    let timeFromUrl: Time | null = null;

    // Try to resolve wellKnown preset first
    if (urlParams.wellKnown) {
      timeFromUrl = getDashboardTimeForRange(urlParams.wellKnown, getTimezone());
    } else if (urlParams.timeMode) {
      // Fallback to explicit date parameters
      if (urlParams.timeMode === "day" && urlParams.day) {
        timeFromUrl = { mode: "day", day: urlParams.day };
      } else if (urlParams.timeMode === "range" && urlParams.startDate && urlParams.endDate) {
        timeFromUrl =
          urlParams.startTime && urlParams.endTime
            ? {
                mode: "range",
                startDate: urlParams.startDate,
                endDate: urlParams.endDate,
                startTime: urlParams.startTime,
                endTime: urlParams.endTime,
              }
            : { mode: "range", startDate: urlParams.startDate, endDate: urlParams.endDate };
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
      setTime(timeFromUrl, !urlParams.bucket);
    } else {
      setTime(getStoredDashboardDefaultTime(getTimezone()), !urlParams.bucket);
    }

    // Process bucket separately
    if (urlParams.bucket) {
      setBucket(urlParams.bucket);
    }

    if (urlParams.stat) {
      setSelectedStat(urlParams.stat);
    } else {
      setSelectedStat("users");
    }

    setFilters(urlParams.filters ?? []);

    setHydratedUrlKey(hydrationKey);
  }, [
    hydrationKey,
    hydratedUrlKey,
    routeContext.siteId,
    site,
    setTime,
    setBucket,
    setSelectedStat,
    setFilters,
    urlParams,
  ]);

  // Update URL when state changes
  useEffect(() => {
    if (!hydrationKey || hydratedUrlKey !== hydrationKey || site !== routeContext.siteId) return;

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
      newParams.startTime = null;
      newParams.endTime = null;
      newParams.startDateTime = null;
      newParams.endDateTime = null;
      newParams.week = null;
      newParams.month = null;
      newParams.year = null;
      newParams.past_minutes_start = null;
      newParams.past_minutes_end = null;
    } else {
      newParams.wellKnown = null;
      newParams.day = null;
      newParams.startDate = null;
      newParams.endDate = null;
      newParams.startTime = null;
      newParams.endTime = null;
      newParams.startDateTime = null;
      newParams.endDateTime = null;
      newParams.week = null;
      newParams.month = null;
      newParams.year = null;
      newParams.past_minutes_start = null;
      newParams.past_minutes_end = null;
      // Store explicit date fields based on mode
      if (time.mode === "day" && "day" in time) {
        newParams.day = time.day;
      } else if (time.mode === "range" && "startDate" in time && "endDate" in time) {
        newParams.startDate = time.startDate;
        newParams.endDate = time.endDate;
        newParams.startTime = time.startTime ?? null;
        newParams.endTime = time.endTime ?? null;
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

    // Note: embed params are automatically preserved by nuqs
    setUrlParams(newParams);
  }, [time, bucket, selectedStat, filters, site, setUrlParams, hydrationKey, hydratedUrlKey, routeContext.siteId]);
};
