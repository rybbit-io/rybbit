import { FilterParameter } from "@rybbit/shared/dist/filters";
import { round } from "lodash";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { useGetSessionLocations } from "../../../../../api/analytics/hooks/useGetSessionLocations";
import { addFilter, removeFilter, useStore } from "../../../../../lib/store";
import { renderCountryFlag } from "../../utils/renderCountryFlag";

const getSizeMultiplier = (total: number) => {
  if (total <= 50) return 3; // Large dots
  if (total <= 200) return 2; // Medium dots
  if (total <= 500) return 1.5; // Small-medium dots
  return 1; // Small dots
};

export function useCoordinatesLayer({
  map,
  mapLoaded,
  minutes,
  mapView,
}: {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  minutes: number;
  mapView: string;
}) {
  const { data: liveSessionLocations } = useGetSessionLocations();

  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const filters = useStore(state => state.filters);

  useEffect(() => {
    if (!map.current || !liveSessionLocations || !mapLoaded) return;

    // Initialize popup once
    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "globe-tooltip",
      });
    }

    const addCoordinatesLayer = () => {
      if (!map.current) return;

      const maxCount = liveSessionLocations.reduce((acc, curr) => Math.max(acc, curr.count), 0) || 1;
      const topSize = Math.pow(maxCount, 0.5);

      // Calculate size scale based on total number of locations
      const totalLocations = liveSessionLocations.length;

      const sizeMultiplier = getSizeMultiplier(totalLocations);

      // Get filtered lat/lon from filters
      const latFilter = filters.find(f => f.parameter === "lat");
      const lonFilter = filters.find(f => f.parameter === "lon");
      const filteredLat = latFilter?.value[0];
      const filteredLon = lonFilter?.value[0];

      // Create GeoJSON points from live session locations
      const geojsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: liveSessionLocations.map(location => {
          const roundedLat = round(location.lat, 4);
          const roundedLon = round(location.lon, 4);

          // Check if this location matches the filter with a small tolerance for floating point precision
          const isFiltered =
            filteredLat !== undefined &&
            filteredLon !== undefined &&
            Math.abs(roundedLat - Number(filteredLat)) < 0.00001 &&
            Math.abs(roundedLon - Number(filteredLon)) < 0.00001;

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [roundedLon, roundedLat],
            },
            properties: {
              count: location.count,
              city: location.city,
              country: location.country,
              isFiltered,
              lat: roundedLat,
              lon: roundedLon,
            },
          };
        }),
      };

      // Add or update source
      if (map.current.getSource("realtime-coordinates")) {
        (map.current.getSource("realtime-coordinates") as mapboxgl.GeoJSONSource).setData(geojsonData);
      } else {
        map.current.addSource("realtime-coordinates", {
          type: "geojson",
          data: geojsonData,
        });

        // Add hexbin layer (using circle layer for simplicity, can be enhanced with custom hexbin implementation)
        map.current.addLayer({
          id: "realtime-coordinates-layer",
          type: "circle",
          source: "realtime-coordinates",
          paint: {
            "circle-radius": [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              0,
              [
                "interpolate",
                ["linear"],
                ["sqrt", ["get", "count"]],
                1,
                1 * sizeMultiplier,
                topSize,
                5 * sizeMultiplier,
              ],
              5,
              [
                "interpolate",
                ["linear"],
                ["sqrt", ["get", "count"]],
                1,
                3 * sizeMultiplier,
                topSize,
                10 * sizeMultiplier,
              ],
              10,
              [
                "interpolate",
                ["linear"],
                ["sqrt", ["get", "count"]],
                1,
                7 * sizeMultiplier,
                topSize,
                20 * sizeMultiplier,
              ],
              15,
              [
                "interpolate",
                ["linear"],
                ["sqrt", ["get", "count"]],
                1,
                15 * sizeMultiplier,
                topSize,
                40 * sizeMultiplier,
              ],
            ],
            // "circle-radius": [
            //   "interpolate",
            //   ["exponential", 2],
            //   ["zoom"],
            //   0,
            //   ["interpolate", ["linear"], ["get", "count"], 1, 1 * sizeMultiplier, highest, 3 * sizeMultiplier],
            //   5,
            //   ["interpolate", ["linear"], ["get", "count"], 1, 2 * sizeMultiplier, highest, 5 * sizeMultiplier],
            //   10,
            //   ["interpolate", ["linear"], ["get", "count"], 1, 4 * sizeMultiplier, highest, 10 * sizeMultiplier],
            //   15,
            //   ["interpolate", ["linear"], ["get", "count"], 1, 8 * sizeMultiplier, highest, 20 * sizeMultiplier],
            // ],
            "circle-color": ["case", ["get", "isFiltered"], "#3b82f6", "#fff4d6"],
            "circle-opacity": ["case", ["get", "isFiltered"], 0.9, 0.7],
            "circle-stroke-width": ["case", ["get", "isFiltered"], 2, 1],
            "circle-stroke-color": ["case", ["get", "isFiltered"], "#60a5fa", "#fff"],
            "circle-stroke-opacity": ["case", ["get", "isFiltered"], 1, 0.3],
          },
          layout: {
            visibility: mapView === "coordinates" ? "visible" : "none",
          },
        });

        // Add mouse events for tooltip and popover
        map.current.on("mouseenter", "realtime-coordinates-layer", () => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = "pointer";
        });

        map.current.on("mousemove", "realtime-coordinates-layer", e => {
          if (!map.current || !e.features || e.features.length === 0 || !popupRef.current) return;

          const feature = e.features[0];
          const city = feature.properties?.city || "Unknown";
          const count = feature.properties?.count || 0;

          const countryCode = feature.properties?.country?.length === 2 ? feature.properties?.country : "";
          const flagSVG = renderCountryFlag(countryCode);

          const coordinates = e.lngLat;
          const html = `
            <div class="bg-neutral-850 border border-neutral-750 rounded-lg p-2" style="pointer-events: none;">
              <div class="flex items-center gap-2 mb-1">
                ${flagSVG}
                <span class="text-sm font-medium text-white">${city}</span>
              </div>
              <div class="text-sm">
                <span class="font-bold text-accent-400">${count.toLocaleString()}</span>
                <span class="text-neutral-300"> sessions</span>
              </div>
            </div>
          `;

          popupRef.current.setLngLat(coordinates).setHTML(html).addTo(map.current);
        });

        map.current.on("mouseleave", "realtime-coordinates-layer", () => {
          if (!map.current || !popupRef.current) return;
          map.current.getCanvas().style.cursor = "";
          popupRef.current.remove();
        });

        map.current.on("click", "realtime-coordinates-layer", e => {
          if (!map.current || !e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const city = feature.properties?.city || "Unknown";
          const count = feature.properties?.count || 0;
          const isCurrentlyFiltered = feature.properties?.isFiltered;

          // Use the stored lat/lon properties instead of geometry coordinates
          // to avoid Mapbox coordinate transformations at different zoom levels
          const lat = feature.properties?.lat;
          const lon = feature.properties?.lon;

          if (lat === undefined || lon === undefined) return;

          // If this location is already filtered, remove the filters
          if (isCurrentlyFiltered) {
            const { filters } = useStore.getState();
            const latFilter = filters.find(f => f.parameter === "lat");
            const lonFilter = filters.find(f => f.parameter === "lon");

            if (latFilter) removeFilter(latFilter);
            if (lonFilter) removeFilter(lonFilter);
          } else {
            // Otherwise, add the filters
            addFilter({
              parameter: "lat" as FilterParameter,
              value: [lat],
              type: "equals",
            });

            addFilter({
              parameter: "lon" as FilterParameter,
              value: [lon],
              type: "equals",
            });
          }
        });
      }

      // Update paint properties when data changes
      if (map.current.getLayer("realtime-coordinates-layer")) {
        map.current.setPaintProperty("realtime-coordinates-layer", "circle-radius", [
          "interpolate",
          ["exponential", 2],
          ["zoom"],
          0,
          ["interpolate", ["linear"], ["sqrt", ["get", "count"]], 1, 1 * sizeMultiplier, topSize, 5 * sizeMultiplier],
          5,
          ["interpolate", ["linear"], ["sqrt", ["get", "count"]], 1, 3 * sizeMultiplier, topSize, 10 * sizeMultiplier],
          10,
          ["interpolate", ["linear"], ["sqrt", ["get", "count"]], 1, 7 * sizeMultiplier, topSize, 20 * sizeMultiplier],
          15,
          ["interpolate", ["linear"], ["sqrt", ["get", "count"]], 1, 15 * sizeMultiplier, topSize, 40 * sizeMultiplier],
        ]);
        map.current.setPaintProperty("realtime-coordinates-layer", "circle-color", [
          "case",
          ["get", "isFiltered"],
          "#3b82f6",
          "#fff4d6",
        ]);
        map.current.setPaintProperty("realtime-coordinates-layer", "circle-opacity", [
          "case",
          ["get", "isFiltered"],
          0.9,
          0.7,
        ]);
        map.current.setPaintProperty("realtime-coordinates-layer", "circle-stroke-width", [
          "case",
          ["get", "isFiltered"],
          2,
          1,
        ]);
        map.current.setPaintProperty("realtime-coordinates-layer", "circle-stroke-color", [
          "case",
          ["get", "isFiltered"],
          "#60a5fa",
          "#fff",
        ]);
        map.current.setPaintProperty("realtime-coordinates-layer", "circle-stroke-opacity", [
          "case",
          ["get", "isFiltered"],
          1,
          0.3,
        ]);
      }
    };

    addCoordinatesLayer();
  }, [liveSessionLocations, mapLoaded, map, minutes, filters]);
}
