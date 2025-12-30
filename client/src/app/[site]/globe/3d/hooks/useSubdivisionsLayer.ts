import { FilterParameter } from "@rybbit/shared";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { useSubdivisions } from "../../../../../lib/geo";
import { addFilter } from "../../../../../lib/store";
import { createColorScale } from "../../utils/colorScale";
import { renderCountryFlag } from "../../utils/renderCountryFlag";

interface UseSubdivisionsLayerProps {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  mapView: string;
}

export function useSubdivisionsLayer({ map, mapLoaded, mapView }: UseSubdivisionsLayerProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const { data: subdivisionData } = useMetric({ parameter: "region", limit: 10000 });
  const { data: subdivisionsGeoData } = useSubdivisions();
  const colorScale = useMemo(() => createColorScale(subdivisionData?.data), [subdivisionData?.data]);

  useEffect(() => {
    if (!map.current || !subdivisionsGeoData || !subdivisionData?.data || !mapLoaded) return;

    // Initialize popup once
    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "globe-tooltip",
      });
    }

    const addSubdivisionsLayer = () => {
      if (!map.current) return;

      const geoDataCopy = JSON.parse(JSON.stringify(subdivisionsGeoData));
      geoDataCopy.features.forEach((feature: any) => {
        const code = feature.properties?.iso_3166_2;
        const foundData = subdivisionData?.data?.find((d: any) => d.value === code);
        const count = foundData?.count || 0;
        const color = count > 0 ? colorScale(count) : "rgba(0, 0, 0, 0)";
        feature.properties.fillColor = color;
        feature.properties.count = count;
      });

      if (map.current.getSource("subdivisions")) {
        (map.current.getSource("subdivisions") as mapboxgl.GeoJSONSource).setData(geoDataCopy);
      } else {
        map.current.addSource("subdivisions", {
          type: "geojson",
          data: geoDataCopy,
        });

        map.current.addLayer({
          id: "subdivisions-fill",
          type: "fill",
          source: "subdivisions",
          paint: {
            "fill-color": ["get", "fillColor"],
            "fill-opacity": 0.6,
          },
          layout: {
            visibility: mapView === "subdivisions" ? "visible" : "none",
          },
        });

        map.current.addLayer({
          id: "subdivisions-outline",
          type: "line",
          source: "subdivisions",
          paint: {
            "line-color": "#ffffff",
            "line-width": 0.5,
            "line-opacity": 0.2,
          },
          layout: {
            visibility: mapView === "subdivisions" ? "visible" : "none",
          },
        });

        map.current.on("mousemove", "subdivisions-fill", e => {
          if (!map.current || !e.features || e.features.length === 0 || !popupRef.current) return;
          map.current.getCanvas().style.cursor = "pointer";

          const feature = e.features[0];
          const code = feature.properties?.iso_3166_2;
          const name = feature.properties?.name;
          const count = feature.properties?.count || 0;

          const currentData = subdivisionData?.data;
          const foundData = currentData?.find((d: any) => d.value === code);
          const percentage = foundData?.percentage || 0;

          // Extract country code from iso_3166_2 (e.g., "US-CA" -> "US")
          const countryCode = code?.split("-")[0] || "";
          const flagSVG = renderCountryFlag(countryCode);

          const coordinates = e.lngLat;
          const html = `
            <div class="bg-neutral-850 border border-neutral-700 rounded-lg p-2">
              <div class="flex items-center gap-2 mb-1">
                ${flagSVG}
                <span class="text-sm font-medium text-white">${name}</span>
              </div>
              <div class="text-sm">
                <span class="font-bold text-accent-400">${count.toLocaleString()}</span>
                <span class="text-neutral-300"> (${percentage.toFixed(1)}%) sessions</span>
              </div>
            </div>
          `;

          popupRef.current.setLngLat(coordinates).setHTML(html).addTo(map.current);
        });

        map.current.on("mouseleave", "subdivisions-fill", () => {
          if (!map.current || !popupRef.current) return;
          map.current.getCanvas().style.cursor = "";
          popupRef.current.remove();
        });

        map.current.on("click", "subdivisions-fill", e => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const code = feature.properties?.iso_3166_2;

          addFilter({
            parameter: "region" as FilterParameter,
            value: [code],
            type: "equals",
          });
        });
      }
    };

    addSubdivisionsLayer();
  }, [subdivisionsGeoData, subdivisionData?.data, colorScale, map, mapLoaded]);
}
