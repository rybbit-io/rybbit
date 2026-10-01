import { UseQueryResult } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

export type GeoLevel = "country" | "region" | "city";

export interface GeoBreakdownRow {
  /** Country code, ISO 3166-2 region code, or "<region>-<city>": the value the matching filter takes. */
  value: string;
  sessions: number;
  users: number;
  pageviews: number;
  /** Share of sessions with exactly one pageview, 0-100. */
  bounce_rate: number;
  /** City level only. */
  lat?: number | null;
  lon?: number | null;
}

export interface GeoBreakdownTotals {
  sessions: number;
  users: number;
  pageviews: number;
  bounce_rate: number | null;
  /** Distinct places with at least one session, before the row limit. */
  places: number;
}

export interface GeoBreakdownResponse {
  rows: GeoBreakdownRow[];
  totals: GeoBreakdownTotals;
}

// Every country fits; regions need the whole set for the choropleth; cities are
// capped at the ones large enough to see.
const LEVEL_LIMIT: Record<GeoLevel, number> = { country: 300, region: 5000, city: 1000 };

export function useGetGeoBreakdown({
  level,
  periodTime,
  enabled,
}: {
  level: GeoLevel;
  periodTime?: "current" | "previous";
  enabled?: boolean;
}): UseQueryResult<GeoBreakdownResponse> {
  const site = useStore(state => state.site);

  return useAnalyticsQuery<GeoBreakdownResponse>({
    key: ["geo-breakdown", level],
    path: "geo/breakdown",
    periodTime,
    doublePastMinutesForPrevious: true,
    enabled,
    params: { level, limit: LEVEL_LIMIT[level] },
    props: {
      // Keep the last result on screen while a new period or filter loads, but
      // only for the same site and level: another level's rows are other places.
      placeholderData: (previousData, previousQuery) =>
        previousQuery?.queryKey[1] === level && previousQuery.queryKey[2] === site ? previousData : undefined,
    },
  });
}
