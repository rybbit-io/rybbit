"use client";

import { useMeasure } from "@uidotdev/usehooks";
import "ol/ol.css";
import { useEffect, useState } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { useCountries, useSubdivisions } from "../../../../../lib/geo";
import { ChartTooltip } from "../../../../../components/charts/ChartTooltip";
import { CountryFlag } from "../icons/CountryFlag";
import { useMapInstance } from "./hooks/useMapInstance";
import { useMapLayers } from "./hooks/useMapLayers";
import { useMapStyles } from "./hooks/useMapStyles";
import type { MapComponentProps, TooltipContent, TooltipPosition } from "./types";

export function MapComponent({ height, mapView: controlledMapView }: MapComponentProps) {
  const {
    data: countryData,
    isLoading: isCountryLoading,
    isFetching: isCountryFetching,
  } = useMetric({
    parameter: "country",
  });

  const {
    data: subdivisionData,
    isLoading: isSubdivisionLoading,
    isFetching: isSubdivisionFetching,
  } = useMetric({
    parameter: "region",
    limit: 10000,
  });

  const [dataVersion, setDataVersion] = useState<number>(0);

  useEffect(() => {
    if (countryData || subdivisionData) {
      setDataVersion(prev => prev + 1);
    }
  }, [countryData, subdivisionData]);

  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  });
  const [internalMapView, setInternalMapView] = useState<"countries" | "subdivisions">("countries");

  const mapView = controlledMapView ?? internalMapView;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { colorScale } = useMapStyles(mapView, countryData?.data ?? null, subdivisionData?.data ?? null);

  const { data: subdivisionsGeoData } = useSubdivisions();
  const { data: countriesGeoData } = useCountries();

  const [ref, { height: resolvedHeight }] = useMeasure();
  const zoom = resolvedHeight ? Math.log2(resolvedHeight / 400) + 1 : 1;

  const { mapRef, mapInstanceRef, mapViewRef } = useMapInstance({
    mapView,
    zoom,
    countryData: countryData?.data ?? null,
    subdivisionData: subdivisionData?.data ?? null,
    setInternalMapView,
    setTooltipContent,
    setTooltipPosition,
    setHoveredId,
  });

  useMapLayers({
    mapInstanceRef,
    mapViewRef,
    mapView,
    countriesGeoData,
    subdivisionsGeoData,
    countryData: countryData?.data ?? null,
    subdivisionData: subdivisionData?.data ?? null,
    dataVersion,
    colorScale,
    hoveredId,
  });

  return (
    <div
      style={{
        height: height,
      }}
      ref={ref}
    >
      {isCountryLoading ||
        (isSubdivisionLoading && (
          <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
              <span className="text-sm text-neutral-300">Loading map data...</span>
            </div>
          </div>
        ))}
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
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <ChartTooltip>
            <div className="p-2">
              <div className="font-sm flex items-center gap-1">
                {tooltipContent.code && <CountryFlag country={tooltipContent.code.slice(0, 2)} />}
                {tooltipContent.name}
              </div>
              <div>
                <span className="font-bold text-accent-400">{tooltipContent.count.toLocaleString()}</span>{" "}
                <span className="text-neutral-500 dark:text-neutral-300">
                  ({tooltipContent.percentage.toFixed(1)}%) sessions
                </span>
              </div>
            </div>
          </ChartTooltip>
        </div>
      )}
    </div>
  );
}
