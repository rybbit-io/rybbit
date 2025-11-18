import { FilterParameter } from "@rybbit/shared";
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import { useEffect, useRef } from "react";
import { addFilter } from "../../../../../../lib/store";
import type { ProcessedData, TooltipContent } from "../types";

interface UseMapInstanceParams {
  mapView: "countries" | "subdivisions";
  zoom: number;
  countryData: ProcessedData[] | null;
  subdivisionData: ProcessedData[] | null;
  setInternalMapView: (view: "countries" | "subdivisions") => void;
  setTooltipContent: (content: TooltipContent | null) => void;
  setTooltipPosition: (pos: { x: number; y: number }) => void;
  setHoveredId: (id: string | null) => void;
}

export function useMapInstance({
  mapView,
  zoom,
  countryData,
  subdivisionData,
  setInternalMapView,
  setTooltipContent,
  setTooltipPosition,
  setHoveredId,
}: UseMapInstanceParams) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const mapViewRef = useRef<"countries" | "subdivisions">(mapView);

  // Update mapView ref when it changes
  useEffect(() => {
    mapViewRef.current = mapView;
  }, [mapView]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = new Map({
      target: mapRef.current,
      view: new View({
        center: fromLonLat([3, 40]),
        zoom: zoom,
      }),
      controls: [],
    });

    mapInstanceRef.current = map;

    // Handle zoom changes
    map.getView().on("change:resolution", () => {
      const currentZoom = map.getView().getZoom() || 1;
      const newMapView = currentZoom >= 5 ? "subdivisions" : "countries";
      if (newMapView !== mapViewRef.current) {
        setInternalMapView(newMapView);
        setTooltipContent(null);
      }
    });

    // Handle pointer move for hover effects
    map.on("pointermove", evt => {
      if (evt.dragging) {
        return;
      }

      const pixel = map.getEventPixel(evt.originalEvent);
      const feature = map.forEachFeatureAtPixel(pixel, feature => feature);

      if (feature) {
        const isCountryView = mapViewRef.current === "countries";
        const code = isCountryView ? feature.get("ISO_A2") : feature.get("iso_3166_2");
        const name = isCountryView ? feature.get("ADMIN") : feature.get("name");

        setHoveredId(code);

        const dataToUse = isCountryView ? countryData : subdivisionData;
        const foundData = dataToUse?.find(({ value }) => value === code);
        const count = foundData?.count || 0;
        const percentage = foundData?.percentage || 0;

        setTooltipContent({
          name,
          code,
          count,
          percentage,
        });

        // Update tooltip position
        const [x, y] = evt.pixel;
        const rect = mapRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPosition({
            x: rect.left + x,
            y: rect.top + y,
          });
        }
      } else {
        setHoveredId(null);
        setTooltipContent(null);
      }
    });

    // Handle click for filtering
    map.on("click", evt => {
      const pixel = map.getEventPixel(evt.originalEvent);
      const feature = map.forEachFeatureAtPixel(pixel, feature => feature);

      if (feature) {
        const isCountryView = mapViewRef.current === "countries";
        const code = isCountryView ? feature.get("ISO_A2") : feature.get("iso_3166_2");

        const filterParameter: FilterParameter = isCountryView ? "country" : "region";

        addFilter({
          parameter: filterParameter,
          value: [code],
          type: "equals",
        });
      }
    });

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  // Update zoom when height changes
  useEffect(() => {
    if (mapInstanceRef.current && zoom) {
      mapInstanceRef.current.getView().setZoom(zoom);
    }
  }, [zoom]);

  return { mapRef, mapInstanceRef, mapViewRef };
}
