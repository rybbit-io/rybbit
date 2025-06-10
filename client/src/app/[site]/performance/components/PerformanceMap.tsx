"use client";

import { useGetPerformanceByDimension } from "@/api/analytics/performance/useGetPerformanceByDimension";
import { useMeasure } from "@uidotdev/usehooks";
import { scalePow } from "d3-scale";
import { Feature, GeoJsonObject } from "geojson";
import { Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer } from "react-leaflet";
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
  const { selectedPercentile, selectedPerformanceMetric } =
    usePerformanceStore();

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
      setDataVersion((prev) => prev + 1);
    }
  }, [performanceData]);

  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(
    null
  );
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  });

  // Track which feature is currently hovered to control opacity without conflicts
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
        const ratio =
          (clampedValue - thresholds.good) /
          (thresholds.needs_improvement - thresholds.good);
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

  const handleStyle = (feature: Feature | undefined) => {
    const countryCode = feature?.properties?.["ISO_A2"];

    const foundData = processedPerformanceData?.find(
      (item: any) => item.country === countryCode
    );

    const metricValue = foundData?.metricValue || 0;
    const color =
      foundData && metricValue > 0
        ? colorScale(metricValue)
        : "rgba(140, 140, 140, 0.3)";

    return {
      color: color,
      weight: 1,
      fill: true,
      fillColor: color,
      // Increase opacity if this feature is currently hovered
      fillOpacity: hoveredId === countryCode ? 0.9 : 0.6,
    };
  };

  const handleEachFeature = (feature: Feature, layer: Layer) => {
    layer.on({
      mouseover: () => {
        const countryCode = feature.properties?.["ISO_A2"];
        const countryName = feature.properties?.["ADMIN"];

        // Mark this feature as hovered
        setHoveredId(countryCode);

        const foundData = processedPerformanceData?.find(
          (item: any) => item.country === countryCode
        );

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
      },
      mouseout: () => {
        // Clear hover state
        setHoveredId(null);
        setTooltipContent(null);
      },
      click: () => {
        const countryCode = feature.properties?.["ISO_A2"];

        // Add country filter
        addFilter({
          parameter: "country",
          value: [countryCode],
          type: "equals",
        });
      },
    });
  };

  const isLoadingData = isLoading || isFetching;

  const [ref, { height: resolvedHeight }] = useMeasure();

  const zoom = resolvedHeight ? Math.log2(resolvedHeight / 400) + 1 : 1;

  return (
    <div
      onMouseMove={(e) => {
        if (tooltipContent) {
          setTooltipPosition({
            x: e.clientX,
            y: e.clientY,
          });
        }
      }}
      style={{
        height: height,
      }}
      ref={ref}
    >
      {isLoadingData && (
        <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
            <span className="text-sm text-neutral-300">
              Loading performance data...
            </span>
          </div>
        </div>
      )}
      {countriesGeoData && (
        <MapContainer
          preferCanvas={true}
          attributionControl={false}
          zoomControl={false}
          center={[40, 3]}
          zoom={zoom}
          style={{
            height: "100%",
            background: "none",
            cursor: "default",
            outline: "none",
            zIndex: "1",
          }}
        >
          <GeoJSON
            key={`performance-countries-${dataVersion}-${selectedPercentile}-${selectedPerformanceMetric}`}
            data={countriesGeoData as GeoJsonObject}
            style={handleStyle}
            onEachFeature={handleEachFeature}
          />
        </MapContainer>
      )}
      {tooltipContent && (
        <div
          className="fixed z-50 bg-neutral-1000 text-white rounded-md p-3 shadow-lg text-sm pointer-events-none max-w-xs"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-sm flex items-center gap-1 mb-2">
            {tooltipContent.code && (
              <CountryFlag country={tooltipContent.code} />
            )}
            <span className="font-medium">{tooltipContent.name}</span>
          </div>

          {tooltipContent.eventCount > 0 ? (
            <>
              <div className="mb-2">
                <span className="text-neutral-300">
                  {tooltipContent.metricName}:{" "}
                </span>
                {tooltipContent.metricValue !== null ? (
                  <span className="font-bold text-accent-400">
                    {formatMetricValue(
                      selectedPerformanceMetric,
                      tooltipContent.metricValue
                    )}
                    {getMetricUnit(
                      selectedPerformanceMetric,
                      tooltipContent.metricValue
                    )}
                  </span>
                ) : (
                  <span className="text-neutral-400">No data</span>
                )}
              </div>

              <div className="text-xs">
                <div className="text-neutral-300">
                  <span className="font-bold text-accent-400">
                    {tooltipContent.eventCount.toLocaleString()}
                  </span>{" "}
                  performance events
                </div>
              </div>
            </>
          ) : (
            <div className="text-neutral-400 text-xs">
              No performance data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
