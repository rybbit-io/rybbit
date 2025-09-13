"use client";

import { FilterParameter } from "@rybbit/shared";
import { useSingleCol } from "@/api/analytics/useSingleCol";
import { useMeasure } from "@uidotdev/usehooks";
import { scalePow } from "d3-scale";
import { Feature, GeoJsonObject } from "geojson";
import { Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { round } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, useMapEvent } from "react-leaflet";
import { getCountryPopulation } from "../../../../lib/countryPopulation";
import { useCountries, useSubdivisions } from "../../../../lib/geo";
import { addFilter } from "../../../../lib/store";
import { CountryFlag } from "./icons/CountryFlag";

interface TooltipContent {
  name: string;
  code: string;
  count: number;
  percentage: number;
  perCapita?: number; // Visits per million people
}

interface TooltipPosition {
  x: number;
  y: number;
}

export function MapComponent({
  height,
  mode = "total",
  mapView: controlledMapView,
}: {
  height: string;
  mode?: "total" | "perCapita";
  mapView?: "countries" | "subdivisions";
}) {
  const {
    data: countryData,
    isLoading: isCountryLoading,
    isFetching: isCountryFetching,
  } = useSingleCol({
    parameter: "country",
  });
  const {
    data: subdivisionData,
    isLoading: isSubdivisionLoading,
    isFetching: isSubdivisionFetching,
  } = useSingleCol({
    parameter: "region",
    limit: 10000,
  });

  const [dataVersion, setDataVersion] = useState<number>(0);

  useEffect(() => {
    if (countryData || subdivisionData) {
      setDataVersion((prev) => prev + 1);
    }
  }, [countryData, subdivisionData]);

  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  });
  const [internalMapView, setInternalMapView] = useState<"countries" | "subdivisions">("countries");

  // Use controlled value if provided, otherwise use internal state
  const mapView = controlledMapView ?? internalMapView;

  // Track which feature is currently hovered to control opacity without conflicts
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Process data to include per capita metrics
  const processedCountryData = useMemo(() => {
    if (!countryData?.data) return null;

    return countryData.data.map((item: any) => {
      const population = getCountryPopulation(item.value);
      const perCapitaValue = population > 0 ? item.count / population : 0;
      return {
        ...item,
        perCapita: perCapitaValue,
      };
    });
  }, [countryData?.data]);

  const processedSubdivisionData = useMemo(() => {
    if (!subdivisionData?.data) return null;

    return subdivisionData.data.map((item: any) => {
      // For subdivisions, we'll use the country code from the beginning of the iso_3166_2 code
      const countryCode = item.value?.split("-")[0];
      const population = getCountryPopulation(countryCode);
      // For subdivisions, we divide by 10x the population since regions are smaller
      const perCapitaValue = population > 0 ? item.count / (population / 10) : 0;
      return {
        ...item,
        perCapita: perCapitaValue,
      };
    });
  }, [subdivisionData?.data]);

  const colorScale = useMemo(() => {
    if (mapView === "countries" && !processedCountryData) return () => "#eee";
    if (mapView === "subdivisions" && !processedSubdivisionData) return () => "#eee";

    const dataToUse = mapView === "countries" ? processedCountryData : processedSubdivisionData;

    // Get computed values from CSS variables
    const getComputedColor = (cssVar: string) => {
      // Get the HSL values from CSS
      const hslValues = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      return `hsl(${hslValues})`;
    };

    // Get only the accent-500 color
    const accentColor = getComputedColor("--accent-400");

    // Parse the HSL values to extract h, s, l components
    const hslMatch = accentColor.match(/hsl\(([^)]+)\)/);
    const hslValues = hslMatch ? hslMatch[1].split(" ") : ["0", "0%", "50%"];
    const [h, s, l] = hslValues;

    // Get the range of values
    const metricToUse = mode === "perCapita" ? "perCapita" : "count";
    const values = dataToUse?.map((d: any) => d[metricToUse]) || [0];
    const maxValue = Math.max(...values);

    // Use a power scale with exponent 0.4 (between linear=1.0 and logarithmic)
    // This makes it somewhat logarithmic but not as extreme
    return scalePow<string>()
      .exponent(0.4) // Adjust this value between 0.1-0.5 to control logarithmic effect
      .domain([0, maxValue])
      .range([`hsla(${h}, ${s}, ${l}, 0.05)`, `hsla(${h}, ${s}, ${l}, 0.8)`]);
  }, [processedCountryData, processedSubdivisionData, mapView, mode]);

  const { data: subdivisionsGeoData } = useSubdivisions();
  const { data: countriesGeoData } = useCountries();

  const handleStyle = (feature: Feature | undefined) => {
    const borderColors = ["#377eb8", "#ff7f00", "#4daf4a", "#1abc9c", "#984ea3"];
    const isCountryView = mapView === "countries";
    const dataKey = isCountryView ? feature?.properties?.["ISO_A2"] : feature?.properties?.["iso_3166_2"];
    const borderKey = isCountryView ? feature?.properties?.["BORDER"] : feature?.properties?.["border"];

    // Use the processed data that includes per capita metrics
    const dataToUse = isCountryView ? processedCountryData : processedSubdivisionData;

    const foundData = dataToUse?.find(({ value }: any) => value === dataKey);

    // Use count or per capita value based on mode
    const metricValue = mode === "perCapita" ? foundData?.perCapita || 0 : foundData?.count || 0;

    const color = metricValue > 0 ? colorScale(metricValue) : "rgba(140, 140, 140, 0.5)";

    return {
      color: color,
      weight: 1,
      fill: true,
      fillColor: color,
      // Increase opacity if this feature is currently hovered
      fillOpacity: hoveredId === dataKey?.toString() ? 0.8 : 0.5,
    };
  };

  const handleEachFeature = (feature: Feature, layer: Layer) => {
    layer.on({
      mouseover: () => {
        const isCountryView = mapView === "countries";
        const code = isCountryView ? feature.properties?.["ISO_A2"] : feature.properties?.["iso_3166_2"];

        // Mark this feature as hovered so handleStyle increases opacity
        setHoveredId(code);

        const name = isCountryView ? feature.properties?.["ADMIN"] : feature.properties?.["name"];

        // Use the processed data that includes per capita metrics
        const dataToUse = isCountryView ? processedCountryData : processedSubdivisionData;

        const foundData = dataToUse?.find(({ value }: any) => value === code);
        const count = foundData?.count || 0;
        const percentage = foundData?.percentage || 0;
        const perCapita = foundData?.perCapita || 0;

        setTooltipContent({
          name,
          code,
          count,
          percentage,
          perCapita,
        });
      },
      mouseout: () => {
        // Clear hover state
        setHoveredId(null);
        setTooltipContent(null);
      },
      click: () => {
        const isCountryView = mapView === "countries";
        const code = isCountryView ? feature.properties?.["ISO_A2"] : feature.properties?.["iso_3166_2"];

        // Set filter based on the current map view
        const filterParameter: FilterParameter = isCountryView ? "country" : "region";

        addFilter({
          parameter: filterParameter,
          value: [code],
          type: "equals",
        });
      },
    });
  };

  const MapEventHandler = () => {
    const map = useMapEvent("zoomend", () => {
      const newMapView = map.getZoom() >= 5 ? "subdivisions" : "countries";
      if (newMapView !== mapView) {
        setInternalMapView(newMapView);
        setTooltipContent(null);
      }
    });
    return null;
  };

  const isLoading = isCountryLoading || isSubdivisionLoading || isCountryFetching || isSubdivisionFetching;

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
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
            <span className="text-sm text-neutral-300">Loading map data...</span>
          </div>
        </div>
      )}
      {(countriesGeoData || subdivisionsGeoData) && (
        <MapContainer
          preferCanvas={true}
          attributionControl={false}
          zoomControl={false}
          center={[40, 3]}
          zoom={zoom}
          style={{
            // height: height,
            height: "100%",
            background: "none",
            cursor: "default",
            outline: "none",
            zIndex: "1",
          }}
        >
          <MapEventHandler />
          {mapView === "subdivisions" && subdivisionsGeoData && (
            <GeoJSON
              key={`subdivisions-${dataVersion}-${mode}`}
              data={subdivisionsGeoData as GeoJsonObject}
              style={handleStyle}
              onEachFeature={handleEachFeature}
            />
          )}
          {mapView === "countries" && countriesGeoData && (
            <GeoJSON
              key={`countries-${dataVersion}-${mode}`}
              data={countriesGeoData as GeoJsonObject}
              style={handleStyle}
              onEachFeature={handleEachFeature}
            />
          )}
        </MapContainer>
      )}
      {tooltipContent && (
        <div
          className="fixed z-50 bg-neutral-1000 text-white rounded-md p-2 shadow-lg text-sm pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-sm flex items-center gap-1">
            {tooltipContent.code && <CountryFlag country={tooltipContent.code.slice(0, 2)} />}
            {tooltipContent.name}
          </div>
          <div>
            <span className="font-bold text-accent-400">{tooltipContent.count.toLocaleString()}</span>{" "}
            <span className="text-neutral-300">({tooltipContent.percentage.toFixed(1)}%) sessions</span>
          </div>
          {mode === "perCapita" && mapView === "countries" && (
            <div className="text-sm text-neutral-300">
              <span className="font-bold text-accent-400">{round(tooltipContent.perCapita ?? 0, 2)}</span> per million
              people
            </div>
          )}
        </div>
      )}
    </div>
  );
}
