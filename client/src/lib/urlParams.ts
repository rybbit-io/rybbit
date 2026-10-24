"use client";

import { DEFAULT_COMPARISON } from "@/components/DateSelector/types";
import { usePathname, useSearchParams } from "next/navigation";
import { createLoader, useQueryStates } from "nuqs";
import React, { useEffect } from "react";
import { getStoredDashboardDefaultTime } from "./defaultTimeRange";
import { analyticsParsers } from "./parsers";
import { getSiteRouteContext, isCarryOverAnalyticsRoute, isSyncedAnalyticsRoute } from "./siteRoute";
import { getTimezone, useStore } from "./store";
import { comparisonToUrlParams, timeToUrlParams, urlParamsToComparison, urlParamsToTime } from "./time";

// The parameters that carry dashboard state; embed flags and foreign params don't.
const STATE_PARAMS = ["timeMode", "wellKnown", "compare", "bucket", "stat", "filters", "segment"] as const;

const loadAnalyticsParams = createLoader(analyticsParsers);

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
  const isHomepage = pathname === "/";
  const shouldSyncUrl = isHomepage || isSyncedAnalyticsRoute(routeContext.route);
  const isRouteReady = isHomepage || site === routeContext.siteId;
  const search = searchParams.toString();
  const hydrationKey = shouldSyncUrl
    ? `${routeContext.siteId ?? ""}:${routeContext.privateKey ?? ""}:${routeContext.route ?? ""}?${search}`
    : null;
  const [hydratedUrlKey, setHydratedUrlKey] = React.useState<string | null>(null);
  // The page the store was last hydrated on, while it stays synced.
  const hydratedPathname = React.useRef<string | null>(null);

  useEffect(() => {
    if (!hydrationKey && hydratedUrlKey) {
      hydratedPathname.current = null;
      setHydratedUrlKey(null);
    }
  }, [hydrationKey, hydratedUrlKey]);

  // Get URL params using nuqs
  const [queryState, setUrlParams] = useQueryStates(analyticsParsers, {
    history: "replace",
    shallow: true,
  });

  // Site dashboards wait for their context; the homepage has no selected Site.
  useEffect(() => {
    if (!hydrationKey || !isRouteReady || hydratedUrlKey === hydrationKey) return;

    // Arriving on a page, the address is read as it is now: nuqs's values catch up with a
    // client-side navigation a commit later, and restoring the previous page's would put its
    // period and filters here and then write them over this address. Staying on the page,
    // nuqs's values are the current ones: they include writes the address has yet to show.
    const urlParams = hydratedPathname.current === pathname ? queryState : loadAnalyticsParams(search);
    hydratedPathname.current = pathname;

    // Arriving without a query keeps what the previous page had; the write
    // below then puts it in the address so a refresh restores it.
    if (isCarryOverAnalyticsRoute(routeContext.route) && STATE_PARAMS.every(key => urlParams[key] === null)) {
      setHydratedUrlKey(hydrationKey);
      return;
    }

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

    if (!isHomepage) {
      setSelectedStat(urlParams.stat ?? "users");

      setFilters(urlParams.filters ?? []);
      setSegmentId(urlParams.segment ?? null);
    }

    setHydratedUrlKey(hydrationKey);
  }, [
    hydrationKey,
    hydratedUrlKey,
    isHomepage,
    isRouteReady,
    pathname,
    routeContext.route,
    search,
    setTime,
    setBucket,
    setSelectedStat,
    setFilters,
    setSegmentId,
    setComparison,
    queryState,
  ]);

  // Update URL when state changes
  useEffect(() => {
    if (!hydrationKey || hydratedUrlKey !== hydrationKey || !isRouteReady) return;

    // Build params object to update - values, not parsers
    const newParams: Record<string, any> = {
      ...timeToUrlParams(time),
      ...comparisonToUrlParams(comparison),
      // startDateTime/endDateTime are legacy params no mode writes anymore.
      startDateTime: null,
      endDateTime: null,
      bucket,
      ...(!isHomepage && {
        stat: selectedStat,
        filters: filters.length > 0 ? filters : null,
        segment: segmentId,
      }),
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
    isHomepage,
    isRouteReady,
    setUrlParams,
    hydrationKey,
    hydratedUrlKey,
  ]);
};
