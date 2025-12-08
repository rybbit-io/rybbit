import { FilterParameter } from "@rybbit/shared/dist/filters";
import { round } from "lodash";
import { useEffect, useRef } from "react";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature, { FeatureLike } from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { fromLonLat } from "ol/proj";
import { useGetSessionLocations } from "../../../../../api/analytics/hooks/useGetSessionLocations";
import { addFilter, removeFilter, useStore } from "../../../../../lib/store";
import { renderCountryFlag } from "../../utils/renderCountryFlag";

const getSizeMultiplier = (total: number) => {
  if (total <= 50) return 3; // Large dots
  if (total <= 200) return 2; // Medium dots
  if (total <= 500) return 1.5; // Small-medium dots
  return 1; // Small dots
};

interface CoordinatesLayerProps {
  mapInstanceRef: React.RefObject<Map | null>;
  mapViewRef: React.RefObject<string>;
  mapView: string;
}

export function useOpenLayersCoordinatesLayer({ mapInstanceRef, mapViewRef, mapView }: CoordinatesLayerProps) {
  const { data: liveSessionLocations } = useGetSessionLocations();
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const filters = useStore(state => state.filters);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !liveSessionLocations) return;

    const maxCount = liveSessionLocations.reduce((acc, curr) => Math.max(acc, curr.count), 0) || 1;
    const topSize = Math.pow(maxCount, 0.5);
    const totalLocations = liveSessionLocations.length;
    const sizeMultiplier = getSizeMultiplier(totalLocations);

    // Get filtered lat/lon from filters
    const latFilter = filters.find(f => f.parameter === "lat");
    const lonFilter = filters.find(f => f.parameter === "lon");
    const filteredLat = latFilter?.value[0];
    const filteredLon = lonFilter?.value[0];

    // Create features from locations
    const features = liveSessionLocations.map(location => {
      const roundedLat = round(location.lat, 4);
      const roundedLon = round(location.lon, 4);

      const isFiltered =
        filteredLat !== undefined &&
        filteredLon !== undefined &&
        Math.abs(roundedLat - Number(filteredLat)) < 0.00001 &&
        Math.abs(roundedLon - Number(filteredLon)) < 0.00001;

      const feature = new Feature({
        geometry: new Point(fromLonLat([roundedLon, roundedLat])),
      });

      feature.setProperties({
        count: location.count,
        city: location.city,
        country: location.country,
        isFiltered,
        lat: roundedLat,
        lon: roundedLon,
      });

      return feature;
    });

    // Create or update vector source
    const vectorSource = new VectorSource({
      features,
    });

    // Calculate radius based on zoom level and count - continuous scale
    const getRadius = (count: number, zoom: number): number => {
      // Ensure count is at least 1
      const safeCount = Math.max(count, 1);
      const sqrt = Math.sqrt(safeCount);

      // Guard against division by zero when topSize <= 1
      const denominator = Math.max(topSize - 1, 1);
      const normalizedCount = Math.max(0, Math.min(1, (sqrt - 1) / denominator)); // Clamp to [0, 1]

      // Exponential zoom scaling: radius grows exponentially with zoom
      // At zoom 0: min 1, max 4
      // At zoom 4: min 2, max 8
      // At zoom 8: min 4, max 16
      // At zoom 12: min 8, max 32
      const zoomFactor = Math.pow(2, zoom / 4); // Doubles every 4 zoom levels

      const minRadius = 1 * zoomFactor * sizeMultiplier;
      const maxRadius = 4 * zoomFactor * sizeMultiplier;

      return minRadius + normalizedCount * (maxRadius - minRadius);
    };

    // Style function
    const styleFunction = (feature: FeatureLike) => {
      const isFiltered = feature.get("isFiltered");
      const count = feature.get("count");
      const zoom = map.getView().getZoom() || 2;
      const radius = getRadius(count, zoom);

      return new Style({
        image: new Circle({
          radius,
          fill: new Fill({
            color: isFiltered ? "rgba(59, 130, 246, 0.9)" : "rgba(255, 244, 214, 0.5)",
          }),
          stroke: new Stroke({
            color: isFiltered ? "rgba(96, 165, 250, 1)" : "rgba(255, 255, 255, 0.3)",
            width: isFiltered ? 2 : 1,
          }),
        }),
      });
    };

    // Create or update vector layer
    if (!vectorLayerRef.current) {
      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: styleFunction,
      });

      vectorLayer.set("id", "coordinates-layer");
      vectorLayer.setVisible(mapView === "coordinates");
      map.addLayer(vectorLayer);
      vectorLayerRef.current = vectorLayer;
    } else {
      vectorLayerRef.current.setSource(vectorSource);
      vectorLayerRef.current.setStyle(styleFunction);
    }

    // Update visibility based on mapView
    if (vectorLayerRef.current) {
      vectorLayerRef.current.setVisible(mapView === "coordinates");
    }

    // Handle zoom changes to update circle sizes
    const handleZoomChange = () => {
      if (vectorLayerRef.current) {
        vectorLayerRef.current.changed();
      }
    };

    map.on("moveend", handleZoomChange);

    // Cleanup
    return () => {
      map.un("moveend", handleZoomChange);

      // Remove layer on cleanup
      if (vectorLayerRef.current) {
        map.removeLayer(vectorLayerRef.current);
        vectorLayerRef.current = null;
      }
    };
  }, [liveSessionLocations, mapView, mapInstanceRef, filters, mapViewRef]);

  // Handle hover and click events
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let tooltip: HTMLDivElement | null = null;

    const handlePointerMove = (event: any) => {
      const isCoordinatesView = mapViewRef.current === "coordinates";
      if (!isCoordinatesView) return;

      const pixel = map.getEventPixel(event.originalEvent);
      const features = map.getFeaturesAtPixel(pixel, {
        layerFilter: layer => layer.get("id") === "coordinates-layer",
      });

      if (features.length > 0) {
        map.getTargetElement().style.cursor = "pointer";

        const feature = features[0] as Feature;
        const city = feature.get("city") || "Unknown";
        const count = feature.get("count") || 0;
        const countryCode = feature.get("country")?.length === 2 ? feature.get("country") : "";
        const flagSVG = renderCountryFlag(countryCode);

        // Create tooltip if it doesn't exist
        if (!tooltip) {
          tooltip = document.createElement("div");
          tooltip.id = "ol-coordinates-tooltip";
          tooltip.style.position = "absolute";
          tooltip.style.pointerEvents = "none";
          tooltip.style.zIndex = "10000";
          document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
          <div class="bg-neutral-850 border border-neutral-750 rounded-lg p-2 shadow-lg">
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

        tooltip.style.left = event.originalEvent.pageX + 10 + "px";
        tooltip.style.top = event.originalEvent.pageY + 10 + "px";
        tooltip.style.display = "block";
      } else {
        map.getTargetElement().style.cursor = "";
        if (tooltip) {
          tooltip.style.display = "none";
        }
      }
    };

    const handleClick = (event: any) => {
      const isCoordinatesView = mapViewRef.current === "coordinates";
      if (!isCoordinatesView) return;

      const pixel = map.getEventPixel(event.originalEvent);
      const features = map.getFeaturesAtPixel(pixel, {
        layerFilter: layer => layer.get("id") === "coordinates-layer",
      });

      if (features.length > 0) {
        const feature = features[0] as Feature;
        const isCurrentlyFiltered = feature.get("isFiltered");
        const lat = feature.get("lat");
        const lon = feature.get("lon");

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
      }
    };

    map.on("pointermove", handlePointerMove);
    map.on("click", handleClick);

    return () => {
      map.un("pointermove", handlePointerMove);
      map.un("click", handleClick);

      // Remove tooltip from DOM
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    };
  }, [mapInstanceRef, mapViewRef]);
}
