import { useExtracted } from "next-intl";
import { useCallback, useMemo } from "react";
import type { GeoLevel } from "../../../../api/analytics/hooks/useGetGeoBreakdown";
import { useGeoStore } from "../../../../lib/geoStore";
import { getCountryName } from "../../../../lib/utils";
import { parseCityKey } from "../utils/places";

export interface PlaceLabel {
  name: string;
  /** Where the place is, for regions and cities: "California, United States". */
  context: string;
}

/**
 * Names a place from its key. Region names come from the subdivision outlines,
 * which load after the page; until then (and for a region the outlines do not
 * know) the code stands in.
 */
export function usePlaceLabel(): (level: GeoLevel, key: string) => PlaceLabel {
  const t = useExtracted();
  const subdivisions = useGeoStore(state => state.subdivisions);
  const unknown = t("Unknown");

  // A list of thousands of regions is named in one pass, so the lookup is a map.
  const regionNames = useMemo(
    () => new Map(subdivisions?.features.map(feature => [feature.properties.iso_3166_2, feature.properties.name])),
    [subdivisions]
  );

  return useCallback(
    (level, key) => {
      if (level === "country") return { name: getCountryName(key), context: "" };

      if (level === "region") {
        const country = key.split("-")[0] ?? "";
        return { name: regionNames.get(key) || key, context: country ? getCountryName(country) : "" };
      }

      const { country, region, city } = parseCityKey(key);
      return {
        name: city || unknown,
        context: [regionNames.get(region), country ? getCountryName(country) : ""].filter(Boolean).join(", "),
      };
    },
    [regionNames, unknown]
  );
}
