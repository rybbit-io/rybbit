import { FilterParameter } from "@rybbit/shared";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { useCountries } from "../../../../../lib/geo";
import { addFilter } from "../../../../../lib/store";
import { createColorScale } from "../../utils/colorScale";
import { renderCountryFlag } from "../../utils/renderCountryFlag";

interface UseCountriesLayerProps {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  mapView: string;
}

export function useCountriesLayer({ map, mapLoaded, mapView }: UseCountriesLayerProps) {
  const { data: countryData } = useMetric({ parameter: "country" });
  const { data: countriesGeoData } = useCountries();
  const colorScale = useMemo(() => createColorScale(countryData?.data), [countryData?.data]);

  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map.current || !countriesGeoData || !countryData?.data || !mapLoaded) return;

    // Initialize popup once
    if (!popupRef.current) {
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "globe-tooltip",
      });
    }

    const addCountriesLayer = () => {
      if (!map.current) return;

      const geoDataCopy = JSON.parse(JSON.stringify(countriesGeoData));
      geoDataCopy.features.forEach((feature: any) => {
        const code = feature.properties?.ISO_A2;
        const foundData = countryData?.data?.find((d: any) => d.value === code);
        const count = foundData?.count || 0;
        const color = count > 0 ? colorScale(count) : "rgba(0, 0, 0, 0)";
        feature.properties.fillColor = color;
        feature.properties.count = count;
      });

      if (map.current.getSource("countries")) {
        (map.current.getSource("countries") as mapboxgl.GeoJSONSource).setData(geoDataCopy);
      } else {
        map.current.addSource("countries", {
          type: "geojson",
          data: geoDataCopy,
        });

        map.current.addLayer({
          id: "countries-fill",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": ["get", "fillColor"],
            "fill-opacity": 0.6,
          },
          layout: {
            visibility: mapView === "countries" ? "visible" : "none",
          },
        });

        map.current.addLayer({
          id: "countries-outline",
          type: "line",
          source: "countries",
          paint: {
            "line-color": "#ffffff",
            "line-width": 0.5,
            "line-opacity": 0.2,
          },
          layout: {
            visibility: mapView === "countries" ? "visible" : "none",
          },
        });

        map.current.on("mousemove", "countries-fill", e => {
          if (!map.current || !e.features || e.features.length === 0 || !popupRef.current) return;
          map.current.getCanvas().style.cursor = "pointer";

          const feature = e.features[0];
          const code = feature.properties?.ISO_A2;
          const name = feature.properties?.ADMIN;
          const count = feature.properties?.count || 0;

          const currentData = countryData?.data;
          const foundData = currentData?.find((d: any) => d.value === code);
          const percentage = foundData?.percentage || 0;

          const flagSVG = renderCountryFlag(code);

          // Use Mapbox native popup
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

        map.current.on("mouseleave", "countries-fill", () => {
          if (!map.current || !popupRef.current) return;
          map.current.getCanvas().style.cursor = "";
          popupRef.current.remove();
        });

        map.current.on("click", "countries-fill", e => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const code = feature.properties?.ISO_A2;

          addFilter({
            parameter: "country" as FilterParameter,
            value: [code],
            type: "equals",
          });
        });
      }
    };

    addCountriesLayer();
  }, [countriesGeoData, countryData?.data, colorScale, map, mapLoaded]);
}
