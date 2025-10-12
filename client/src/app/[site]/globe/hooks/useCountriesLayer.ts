import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { FilterParameter } from "@rybbit/shared";
import { addFilter } from "../../../../lib/store";

interface UseCountriesLayerProps {
  map: React.RefObject<mapboxgl.Map | null>;
  countriesGeoData: any;
  processedCountryData: any;
  colorScale: (value: number) => string;
  countryData: any;
  mapLoaded: boolean;
  mapView: string;
}

export function useCountriesLayer({
  map,
  countriesGeoData,
  processedCountryData,
  colorScale,
  countryData,
  mapLoaded,
  mapView,
}: UseCountriesLayerProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map.current || !countriesGeoData || !processedCountryData || !mapLoaded) return;

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
        const foundData = processedCountryData.find((d: any) => d.value === code);
        const count = foundData?.count || 0;
        const color = count > 0 ? colorScale(count) : "rgba(140, 140, 140, 0.5)";
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
            "line-opacity": 0.3,
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

          // Use Mapbox native popup
          const coordinates = e.lngLat;
          const html = `
            <div class="flex items-center gap-1 mb-1">
              <span class="text-sm font-medium">${name}</span>
            </div>
            <div class="text-sm">
              <span class="font-bold text-accent-400">${count.toLocaleString()}</span>
              <span class="text-neutral-300"> (${percentage.toFixed(1)}%) sessions</span>
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
  }, [countriesGeoData, processedCountryData, colorScale, map, countryData, mapLoaded]);
}
