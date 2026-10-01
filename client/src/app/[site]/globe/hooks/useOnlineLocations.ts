import { useMemo } from "react";
import { LiveSessionLocation } from "../../../../api/analytics/endpoints";
import { useAnalyticsQuery } from "../../../../api/analytics/useAnalyticsQuery";
import type { Time } from "../../../../components/DateSelector/types";

/** How far back "online now" looks, the same window as the header's live count. */
export const ONLINE_MINUTES = 5;

const ONLINE_WINDOW: Time = { mode: "past-minutes", pastMinutesStart: ONLINE_MINUTES, pastMinutesEnd: 0 };

export interface OnlineLocations {
  /** One entry per coordinate with sessions in the last few minutes. */
  locations: LiveSessionLocation[];
  countries: number;
  cities: number;
  /** Sessions online per country code. */
  byCountry: Map<string, number>;
  isLoading: boolean;
}

/**
 * Where visitors are right now: the session locations endpoint asked about the
 * last few minutes instead of the selected period. The page's filters do not
 * apply, like the header's live count they describe the whole site.
 */
export function useOnlineLocations(): OnlineLocations {
  const { data, isLoading } = useAnalyticsQuery<LiveSessionLocation[]>({
    key: "online-locations",
    path: "sessions/locations",
    overrideTime: ONLINE_WINDOW,
    useFilters: false,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  return useMemo(() => {
    const locations = (data ?? []).filter(
      location => Number.isFinite(location.lat) && Number.isFinite(location.lon) && (location.lat || location.lon)
    );
    const byCountry = new Map<string, number>();
    const cities = new Set<string>();
    for (const location of data ?? []) {
      if (location.country) {
        byCountry.set(location.country, (byCountry.get(location.country) ?? 0) + location.count);
      }
      if (location.city) cities.add(`${location.country}:${location.city}`);
    }
    return { locations, countries: byCountry.size, cities: cities.size, byCountry, isLoading };
  }, [data, isLoading]);
}
