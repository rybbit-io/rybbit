"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import React, { useEffect } from "react";
import { getStoredDashboardDefaultTime } from "./defaultTimeRange";
import { analyticsParsers } from "./parsers";
import { getSiteRouteContext, isSyncedAnalyticsRoute } from "./siteRoute";
import { getTimezone, useStore } from "./store";
import { timeToUrlParams, urlParamsToTime } from "./time";

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
      ...timeToUrlParams(time),
      // startDateTime/endDateTime are legacy params no mode writes anymore.
      startDateTime: null,
      endDateTime: null,
      bucket,
      stat: selectedStat,
      filters: filters.length > 0 ? filters : null,
    };

    // Note: embed params are automatically preserved by nuqs
    setUrlParams(newParams);
  }, [time, bucket, selectedStat, filters, site, setUrlParams, hydrationKey, hydratedUrlKey, routeContext.siteId]);
};
