"use client";

import { useGetPerformanceByDimension } from "@/api/analytics/hooks/performance/useGetPerformanceByDimension";
import { useMeasure } from "@uidotdev/usehooks";
import { Feature } from "geojson";
import "ol/ol.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";
import { useCountries } from "../../../../lib/geo";
import { addFilter } from "../../../../lib/store";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { useParams } from "next/navigation";
import { usePerformanceStore } from "../performanceStore";
import {
  getPerformanceThresholds,
  formatMetricValue,
  getMetricUnit,
  METRIC_LABELS_SHORT,
} from "../utils/performanceUtils";
import type { FeatureLike } from "ol/Feature";

interface TooltipContent {
  name: string;
  code: string;
  eventCount: number;
  metricValue: number | null;
  metricName: string;
}

interface TooltipPosition {
  x: number;
  y: number;
}

export function PerformanceMap({ height }: { height: string }) {
  const params = useParams();
  const site = params.site as string;
  const { selectedPercentile, selectedPerformanceMetric } = usePerformanceStore();

  const {
    data: performanceData,
    isLoading,
    isFetching,
  } = useGetPerformanceByDimension({
    site,
    dimension: "country",
    limit: 1000, // Get all countries
    useFilters: true,
  });

  const [dataVersion, setDataVersion] = useState<number>(0);

  useEffect(() => {
    if (performanceData) {
      setDataVersion(prev => prev + 1);
    }
  }, [performanceData]);

  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  });

  // Track which feature is currently hovered to control opacity without conflicts
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const processedPerformanceDataRef = useRef<any>(null);

  // Process performance data to get the selected metric values
  const processedPerformanceData = useMemo(() => {
    if (!performanceData?.data) return null;

    return performanceData.data.map((item: any) => {
      // Get the metric value for the selected metric and percentile
      const metricKey = `${selectedPerformanceMetric}_${selectedPercentile.toLowerCase()}`;
      const metricValue = item[metricKey];

      return {
        ...item,
        metricValue,
      };
    });
  }, [performanceData?.data, selectedPercentile, selectedPerformanceMetric]);

  // Update ref when data changes
  useEffect(() => {
    processedPerformanceDataRef.current = processedPerformanceData;
  }, [processedPerformanceData]);

  // Create color scale from green (good) to red (poor) based on Web Vitals thresholds
  const colorScale = useMemo(() => {
    if (!processedPerformanceData) return () => "#eee";

    const thresholds = getPerformanceThresholds(selectedPerformanceMetric);
    if (!thresholds) return () => "#eee";

    // Create a function that returns colors based on thresholds
    // This prevents d3 from interpolating beyond our intended colors
    return (value: number) => {
      // Clamp the value to prevent extreme outliers
      const clampedValue = Math.max(0, value);

      if (clampedValue <= thresholds.good) {
        return "rgba(34, 197, 94, 0.8)"; // Green for good performance
      } else if (clampedValue <= thresholds.needs_improvement) {
        // Interpolate between green and yellow for needs improvement
        const ratio = (clampedValue - thresholds.good) / (thresholds.needs_improvement - thresholds.good);
        const greenComponent = Math.round(34 + (251 - 34) * ratio);
        const redComponent = Math.round(197 + (191 - 197) * ratio);
        const blueComponent = Math.round(94 + (36 - 94) * ratio);
        return `rgba(${greenComponent}, ${redComponent}, ${blueComponent}, 0.8)`;
      } else {
        return "rgba(239, 68, 68, 0.8)"; // Red for poor performance
      }
    };
  }, [processedPerformanceData, selectedPerformanceMetric]);

  const { data: countriesGeoData } = useCountries();

  const isLoadingData = isLoading || isFetching;

  const [ref, { height: resolvedHeight }] = useMeasure();

  const zoom = resolvedHeight ? Math.log2(resolvedHeight / 400) + 1 : 1;

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

    // Handle pointer move for hover effects
    map.on("pointermove", evt => {
      if (evt.dragging) {
        return;
      }

      const pixel = map.getEventPixel(evt.originalEvent);
      const feature = map.forEachFeatureAtPixel(pixel, feature => feature);

      if (feature) {
        const countryCode = feature.get("ISO_A2");
        const countryName = feature.get("ADMIN");

        setHoveredId(countryCode);

        const foundData = processedPerformanceDataRef.current?.find((item: any) => item.country === countryCode);

        if (foundData) {
          setTooltipContent({
            name: countryName,
            code: countryCode,
            eventCount: foundData.event_count,
            metricValue: foundData.metricValue,
            metricName: METRIC_LABELS_SHORT[selectedPerformanceMetric],
          });
        } else {
          setTooltipContent({
            name: countryName,
            code: countryCode,
            eventCount: 0,
            metricValue: null,
            metricName: METRIC_LABELS_SHORT[selectedPerformanceMetric],
          });
        }

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
        const countryCode = feature.get("ISO_A2");

        // Add country filter
        addFilter({
          parameter: "country",
          value: [countryCode],
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

  // Update vector layer when geo data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!countriesGeoData) return;

    // Wait for performance data to be available
    if (!processedPerformanceData) return;

    // Remove existing layer
    if (vectorLayerRef.current) {
      mapInstanceRef.current.removeLayer(vectorLayerRef.current);
    }

    // Create new vector source with GeoJSON data
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(countriesGeoData, {
        featureProjection: "EPSG:3857",
      }),
    });

    // Create new vector layer with inline style function
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: feature => {
        const countryCode = feature.get("ISO_A2");

        const foundData = processedPerformanceDataRef.current?.find((item: any) => item.country === countryCode);

        const metricValue = foundData?.metricValue || 0;

        let fillColor: string;
        let strokeColor: string;

        if (foundData && metricValue > 0) {
          // Get the color from the scale (already has opacity built in)
          const baseColor = colorScale(metricValue);

          if (hoveredId === countryCode) {
            // Increase opacity on hover
            fillColor = baseColor.replace(/,\s*([\d.]+)\)$/, (match, opacity) => {
              const newOpacity = Math.min(parseFloat(opacity) + 0.2, 1);
              return `, ${newOpacity})`;
            });
          } else {
            // Use the color directly from the scale
            fillColor = baseColor;
          }
          strokeColor = baseColor;
        } else {
          fillColor = "rgba(140, 140, 140, 0.2)";
          strokeColor = "rgba(140, 140, 140, 0.3)";
        }

        return new Style({
          fill: new Fill({
            color: fillColor,
          }),
          stroke: new Stroke({
            color: strokeColor,
            width: 1,
          }),
        });
      },
    });

    vectorLayerRef.current = vectorLayer;
    mapInstanceRef.current.addLayer(vectorLayer);
  }, [
    countriesGeoData,
    dataVersion,
    selectedPercentile,
    selectedPerformanceMetric,
    colorScale,
    processedPerformanceData,
  ]);

  // Update styles when hoveredId changes (without recreating the layer)
  useEffect(() => {
    if (vectorLayerRef.current) {
      vectorLayerRef.current.changed();
    }
  }, [hoveredId]);

  return (
    <div
      style={{
        height: height,
      }}
      ref={ref}
    >
      {isLoadingData && (
        <div className="absolute inset-0 bg-neutral-100/30 dark:bg-neutral-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">Loading performance data...</span>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          height: "100%",
          width: "100%",
          background: "none",
          cursor: "default",
          outline: "none",
        }}
      />
      {tooltipContent && (
        <div
          className="fixed z-50 bg-white dark:bg-neutral-1000 text-neutral-900 dark:text-white rounded-md p-3 shadow-lg text-sm pointer-events-none max-w-xs border border-neutral-300 dark:border-transparent"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-sm flex items-center gap-1 mb-2">
            {tooltipContent.code && <CountryFlag country={tooltipContent.code} />}
            <span className="font-medium">{tooltipContent.name}</span>
          </div>

          {tooltipContent.eventCount > 0 ? (
            <>
              <div className="mb-2">
                <span className="text-neutral-600 dark:text-neutral-300">{tooltipContent.metricName}: </span>
                {tooltipContent.metricValue !== null ? (
                  <span className="font-bold text-accent-400">
                    {formatMetricValue(selectedPerformanceMetric, tooltipContent.metricValue)}
                    {getMetricUnit(selectedPerformanceMetric, tooltipContent.metricValue)}
                  </span>
                ) : (
                  <span className="text-neutral-400">No data</span>
                )}
              </div>

              <div className="text-xs">
                <div className="text-neutral-600 dark:text-neutral-300">
                  <span className="font-bold text-accent-400">{tooltipContent.eventCount.toLocaleString()}</span>{" "}
                  performance events
                </div>
              </div>
            </>
          ) : (
            <div className="text-neutral-500 dark:text-neutral-400 text-xs">No performance data available</div>
          )}
        </div>
      )}
    </div>
  );
}
