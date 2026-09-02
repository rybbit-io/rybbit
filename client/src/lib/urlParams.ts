"use client";

import { DEFAULT_COMPARISON } from "@/components/DateSelector/types";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import React, { useEffect } from "react";
import { getStoredDashboardDefaultTime } from "./defaultTimeRange";
import { analyticsParsers } from "./parsers";
import { getSiteRouteContext, isSyncedAnalyticsRoute } from "./siteRoute";
import { getTimezone, useStore } from "./store";
import { comparisonToUrlParams, timeToUrlParams, urlParamsToComparison, urlParamsToTime } from "./time";

// Hook to sync store state with URL
export const useSyncStateWithUrl = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    time,
    bucket,
    selectedStat,
    filters,
    segmentId,
    comparison,
    setTime,
    setBucket,
    setSelectedStat,
    setFilters,
    setSegmentId,
    setComparison,
    site,
  } = useStore();

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

    // The comparison is restored before the period so the window it resolves
    // to is the shared link's, not the default period's.
    setComparison(urlParamsToComparison(urlParams) ?? DEFAULT_COMPARISON);

    // Deserialize time from URL
    const timeFromUrl = urlParamsToTime(urlParams, getTimezone());

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
    setSegmentId(urlParams.segment ?? null);

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
    setSegmentId,
    setComparison,
    urlParams,
  ]);

  // Update URL when state changes
  useEffect(() => {
    if (!hydrationKey || hydratedUrlKey !== hydrationKey || site !== routeContext.siteId) return;

    // Build params object to update - values, not parsers
    const newParams: Record<string, any> = {
      ...timeToUrlParams(time),
      ...comparisonToUrlParams(comparison),
      // startDateTime/endDateTime are legacy params no mode writes anymore.
      startDateTime: null,
      endDateTime: null,
      bucket,
      stat: selectedStat,
      filters: filters.length > 0 ? filters : null,
      segment: segmentId,
    };

    // Note: embed params are automatically preserved by nuqs
    setUrlParams(newParams);
  }, [
    time,
    bucket,
    selectedStat,
    filters,
    segmentId,
    comparison,
    site,
    setUrlParams,
    hydrationKey,
    hydratedUrlKey,
    routeContext.siteId,
  ]);
};
