import { useTheme } from "next-themes";
import { useMemo } from "react";
import { GeoBreakdownTotals, useGetGeoBreakdown } from "../../../../api/analytics/hooks/useGetGeoBreakdown";
import { useComparisonEnabled } from "../../../../lib/store";
import { GlobeMetric, PlaceLevel, useGlobeStore, useMapStyle } from "../globeStore";
import { ColorScale, createColorScale, readDataColor } from "../utils/colorScale";
import { MapTone, mapStyleTone } from "../utils/mapStyles";
import type { CityPoint, PlaceFill } from "../utils/mapTypes";
import { aggregateSessions, buildPlaceEntries, isRateMetric, PlaceEntry } from "../utils/places";
import type { GlobeReplay } from "./useGlobeReplay";

// How much more opaque a place gets under the pointer.
const HOVER_LIFT = 0.15;

export interface GlobeData {
  level: PlaceLevel;
  metric: GlobeMetric;
  /** The breakdown's places, ranked. Empty in the sessions breakdown. */
  entries: PlaceEntry[];
  byKey: Map<string, PlaceEntry>;
  totals: GeoBreakdownTotals | null;
  scale: ColorScale;
  tone: MapTone;
  /** Country and region fills, keyed by place. */
  fills: Map<string, PlaceFill>;
  cityPoints: CityPoint[];
  /** True when the figures are for one replay window rather than the whole period. */
  windowed: boolean;
  /** True when the figures are set against a comparison period: off for a replay window and when comparing is off. */
  compared: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The places the map and the list show, with their figures for the chosen
 * metric and the colours the map draws them in.
 *
 * For the whole period the figures come from the server, with the comparison
 * period alongside. While a replay window is on the map they are counted from
 * that window's sessions, which are already loaded; a window has no comparison.
 */
export function useGlobeData(replay: GlobeReplay): GlobeData {
  const breakdown = useGlobeStore(state => state.breakdown);
  const metric = useGlobeStore(state => state.metric);
  const comparing = useComparisonEnabled();
  const tone = mapStyleTone(useMapStyle());
  // The data colour differs between the light and the dark theme.
  const { resolvedTheme } = useTheme();

  const showsPlaces = breakdown !== "sessions";
  const level: PlaceLevel = showsPlaces ? breakdown : "country";
  const windowed = showsPlaces && replay.index >= 0;

  const current = useGetGeoBreakdown({ level, enabled: showsPlaces });
  const previous = useGetGeoBreakdown({ level, periodTime: "previous", enabled: showsPlaces });

  const windowData = useMemo(
    () => (windowed ? aggregateSessions(replay.activeSessions, level) : undefined),
    [windowed, replay.activeSessions, level]
  );
  const data = !showsPlaces ? undefined : windowed ? windowData : current.data;
  const comparison = windowed || !comparing ? undefined : previous.data;

  const entries = useMemo(() => buildPlaceEntries(data, comparison, metric), [data, comparison, metric]);
  const byKey = useMemo(() => new Map(entries.map(entry => [entry.key, entry])), [entries]);

  const scale = useMemo(
    () =>
      createColorScale(
        entries.map(entry => entry.value),
        isRateMetric(metric) ? "rate" : "count",
        readDataColor(tone)
      ),
    // resolvedTheme: the colour is read from a CSS variable the theme sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, metric, tone, resolvedTheme]
  );

  const fills = useMemo(() => {
    const map = new Map<string, PlaceFill>();
    if (level === "city") return map;
    for (const entry of entries) {
      map.set(entry.key, { fill: scale.color(entry.value), hoverFill: scale.color(entry.value, HOVER_LIFT) });
    }
    return map;
  }, [entries, scale, level]);

  const cityPoints = useMemo<CityPoint[]>(() => {
    if (level !== "city") return [];
    return entries.flatMap(entry => {
      const { lat, lon } = entry.row;
      // 0,0 is what a session without coordinates carries, not a city in the Gulf of Guinea.
      if (typeof lat !== "number" || typeof lon !== "number" || (lat === 0 && lon === 0)) return [];
      return [
        {
          key: entry.key,
          lat,
          lon,
          size: isRateMetric(metric) ? entry.row.sessions : entry.value,
          fill: scale.color(entry.value),
          hoverFill: scale.color(entry.value, HOVER_LIFT),
        },
      ];
    });
  }, [entries, scale, level, metric]);

  return {
    level,
    metric,
    entries,
    byKey,
    totals: data?.totals ?? null,
    scale,
    tone,
    fills,
    cityPoints,
    windowed,
    compared: showsPlaces && !windowed && comparing,
    isLoading: showsPlaces && (windowed ? replay.sessionsLoading : current.isLoading),
    isError: showsPlaces && (windowed ? replay.sessionsError : current.isError),
  };
}
