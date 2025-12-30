import { FilterParameter } from "@rybbit/shared";
import Map from "ol/Map";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { useSubdivisions } from "../../../../../lib/geo";
import { addFilter } from "../../../../../lib/store";
import { createColorScale } from "../../utils/colorScale";
import { renderCountryFlag } from "../../utils/renderCountryFlag";

interface UseOpenLayersSubdivisionsLayerProps {
  mapInstanceRef: MutableRefObject<Map | null>;
  mapViewRef: MutableRefObject<"countries" | "subdivisions" | "coordinates" | "timeline">;
  mapView: "countries" | "subdivisions" | "coordinates" | "timeline";
}

interface TooltipData {
  name: string;
  code: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
}

export function useOpenLayersSubdivisionsLayer({
  mapInstanceRef,
  mapViewRef,
  mapView,
}: UseOpenLayersSubdivisionsLayerProps) {
  const { data: subdivisionData } = useMetric({ parameter: "region", limit: 10000 });
  const { data: subdivisionsGeoData } = useSubdivisions();
  const colorScale = useMemo(() => createColorScale(subdivisionData?.data), [subdivisionData?.data]);

  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  // Add/update subdivisions layer
  useEffect(() => {
    if (!mapInstanceRef.current || !subdivisionsGeoData || !subdivisionData?.data) return;

    // Remove existing layer
    if (vectorLayerRef.current) {
      mapInstanceRef.current.removeLayer(vectorLayerRef.current);
    }

    // Create new vector source with GeoJSON data
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(subdivisionsGeoData, {
        featureProjection: "EPSG:3857",
      }),
    });

    // Create new vector layer with styling
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: feature => {
        const code = feature.get("iso_3166_2");
        const foundData = subdivisionData?.data?.find((d: any) => d.value === code);
        const count = foundData?.count || 0;

        let fillColor: string;
        let strokeColor: string;

        if (count > 0) {
          const baseColor = colorScale(count);
          if (hoveredId === code) {
            fillColor = baseColor.replace(/,\s*([\d.]+)\)$/, (match, opacity) => {
              const newOpacity = Math.min(parseFloat(opacity) + 0.2, 1);
              return `, ${newOpacity})`;
            });
          } else {
            fillColor = baseColor;
          }
          strokeColor = "rgba(110, 231, 183, 0.25)";
        } else {
          fillColor = "rgba(0, 0, 0, 0)";
          strokeColor = "rgba(0, 0, 0, 0)";
        }

        return new Style({
          fill: new Fill({
            color: fillColor,
          }),
          stroke: new Stroke({
            color: strokeColor,
            width: 0.5,
          }),
        });
      },
      visible: mapView === "subdivisions",
    });

    vectorLayerRef.current = vectorLayer;
    mapInstanceRef.current.addLayer(vectorLayer);

    // Handle pointer move for tooltips
    const handlePointerMove = (evt: any) => {
      if (!mapInstanceRef.current) return;

      const pixel = mapInstanceRef.current.getEventPixel(evt.originalEvent);
      const feature = mapInstanceRef.current.forEachFeatureAtPixel(pixel, f => f, {
        layerFilter: layer => layer === vectorLayerRef.current,
      });

      if (feature && mapViewRef.current === "subdivisions") {
        const code = feature.get("iso_3166_2");
        const name = feature.get("name");
        setHoveredId(code);

        const foundData = subdivisionData?.data?.find((d: any) => d.value === code);
        const count = foundData?.count || 0;
        const percentage = foundData?.percentage || 0;

        const rect = mapInstanceRef.current.getTargetElement().getBoundingClientRect();
        const [x, y] = evt.pixel;

        setTooltipData({
          name,
          code,
          count,
          percentage,
          x: rect.left + x,
          y: rect.top + y,
        });

        mapInstanceRef.current.getTargetElement().style.cursor = "pointer";
      } else {
        setHoveredId(null);
        setTooltipData(null);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.getTargetElement().style.cursor = "";
        }
      }
    };

    // Handle click for filtering
    const handleClick = (evt: any) => {
      if (!mapInstanceRef.current) return;

      const pixel = mapInstanceRef.current.getEventPixel(evt.originalEvent);
      const feature = mapInstanceRef.current.forEachFeatureAtPixel(pixel, f => f, {
        layerFilter: layer => layer === vectorLayerRef.current,
      });

      if (feature && mapViewRef.current === "subdivisions") {
        const code = feature.get("iso_3166_2");
        addFilter({
          parameter: "region" as FilterParameter,
          value: [code],
          type: "equals",
        });
      }
    };

    mapInstanceRef.current.on("pointermove", handlePointerMove);
    mapInstanceRef.current.on("click", handleClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.un("pointermove", handlePointerMove);
        mapInstanceRef.current.un("click", handleClick);

        // Remove layer on cleanup
        if (vectorLayerRef.current) {
          mapInstanceRef.current.removeLayer(vectorLayerRef.current);
          vectorLayerRef.current = null;
        }
      }
    };
  }, [subdivisionsGeoData, subdivisionData?.data, colorScale, mapView]);

  // Update layer visibility
  useEffect(() => {
    if (vectorLayerRef.current) {
      vectorLayerRef.current.setVisible(mapView === "subdivisions");
    }
  }, [mapView]);

  // Update styles when hovered
  useEffect(() => {
    if (vectorLayerRef.current) {
      vectorLayerRef.current.changed();
    }
  }, [hoveredId]);

  // Render tooltip
  useEffect(() => {
    if (!tooltipData) {
      const existingTooltip = document.getElementById("ol-subdivisions-tooltip");
      if (existingTooltip) {
        existingTooltip.remove();
      }
      return;
    }

    let tooltip = document.getElementById("ol-subdivisions-tooltip") as HTMLDivElement;
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "ol-subdivisions-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      document.body.appendChild(tooltip);
    }

    // Extract country code from iso_3166_2 (e.g., "US-CA" -> "US")
    const countryCode = tooltipData.code?.split("-")[0] || "";
    const flagSVG = renderCountryFlag(countryCode);

    tooltip.innerHTML = `
      <div class="bg-neutral-850 border border-neutral-700 rounded-lg p-2 shadow-lg">
        <div class="flex items-center gap-2 mb-1">
          ${flagSVG}
          <span class="text-sm font-medium text-white">${tooltipData.name}</span>
        </div>
        <div class="text-sm">
          <span class="font-bold text-accent-400">${tooltipData.count.toLocaleString()}</span>
          <span class="text-neutral-300"> (${tooltipData.percentage.toFixed(1)}%) sessions</span>
        </div>
      </div>
    `;

    tooltip.style.left = `${tooltipData.x}px`;
    tooltip.style.top = `${tooltipData.y - 10}px`;
    tooltip.style.transform = "translate(-50%, -100%)";

    return () => {
      const existingTooltip = document.getElementById("ol-subdivisions-tooltip");
      if (existingTooltip) {
        existingTooltip.remove();
      }
    };
  }, [tooltipData]);
}
