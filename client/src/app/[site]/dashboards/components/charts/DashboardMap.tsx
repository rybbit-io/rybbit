"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import * as d3 from "d3";
import { useMeasure } from "@uidotdev/usehooks";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { unByKey as dispose } from "ol/Observable";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import View from "ol/View";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { useCountries } from "@/lib/geo";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { buildCountryData, formatValue } from "../../utils";
import { dataVizRamp } from "./shared";

type DashboardMapProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

type TooltipState = { name: string; code: string; value: number | null; x: number; y: number };

const EMPTY_FILL = "rgba(140, 140, 140, 0.15)";
const EMPTY_STROKE = "rgba(140, 140, 140, 0.3)";

export function DashboardMap({ rows, mapping }: DashboardMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const format = mapping.valueFormat ?? "number";

  const { data: countriesGeoData } = useCountries();
  const { byCode, max } = useMemo(() => buildCountryData(rows, mapping), [rows, mapping]);

  // Value → fill color: shared periwinkle ramp, sqrt-skewed so small magnitudes
  // stay distinguishable.
  const colorFor = useMemo(() => {
    const [low, high] = dataVizRamp(isDark);
    const interpolator = d3.interpolateRgb(low, high);
    return (value: number) => (max > 0 ? interpolator(Math.pow(value / max, 0.5)) : EMPTY_FILL);
  }, [isDark, max]);

  // Refs so the OpenLayers style callback always reads current data without re-init.
  const dataRef = useRef({ byCode, colorFor, format });
  dataRef.current = { byCode, colorFor, format };

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [measureRef, { height: measuredHeight }] = useMeasure();
  const zoom = measuredHeight ? Math.max(0.6, Math.log2(measuredHeight / 360) + 0.8) : 1;

  // Initialize the map once.
  useEffect(() => {
    if (!mapRef.current) return;
    const map = new Map({
      target: mapRef.current,
      view: new View({ center: fromLonLat([10, 35]), zoom }),
      controls: [],
    });
    mapInstanceRef.current = map;

    const handlePointerMove = (evt: any) => {
      if (evt.dragging) return;
      const pixel = map.getEventPixel(evt.originalEvent);
      const feature = map.forEachFeatureAtPixel(pixel, feat => feat);
      if (feature) {
        const code = feature.get("ISO_A2");
        hoveredRef.current = code;
        const rect = mapRef.current?.getBoundingClientRect();
        setTooltip({
          name: feature.get("ADMIN"),
          code,
          value: dataRef.current.byCode.get(String(code).toUpperCase()) ?? null,
          x: (rect?.left ?? 0) + evt.pixel[0],
          y: (rect?.top ?? 0) + evt.pixel[1],
        });
      } else {
        hoveredRef.current = null;
        setTooltip(null);
      }
      vectorLayerRef.current?.changed();
    };
    const moveKey = map.on("pointermove", handlePointerMove);

    return () => {
      dispose([moveKey]);
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapInstanceRef.current?.getView().setZoom(zoom);
  }, [zoom]);

  // (Re)build the styled country layer when geo data, values, or theme change.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !countriesGeoData) return;

    if (vectorLayerRef.current) map.removeLayer(vectorLayerRef.current);

    const source = new VectorSource({
      features: new GeoJSON().readFeatures(countriesGeoData, { featureProjection: "EPSG:3857" }),
    });
    const layer = new VectorLayer({
      source,
      style: feature => {
        const code = String(feature.get("ISO_A2")).toUpperCase();
        const value = dataRef.current.byCode.get(code);
        const hovered = hoveredRef.current === feature.get("ISO_A2");
        const fill = value !== undefined ? dataRef.current.colorFor(value) : EMPTY_FILL;
        return new Style({
          fill: new Fill({ color: fill }),
          stroke: new Stroke({
            color: hovered ? (isDark ? "#fff" : "#1f2937") : value !== undefined ? fill : EMPTY_STROKE,
            width: hovered ? 1.5 : 0.75,
          }),
        });
      },
    });
    vectorLayerRef.current = layer;
    map.addLayer(layer);
  }, [countriesGeoData, byCode, colorFor, isDark]);

  // Keep the map container mounted (the init effect runs once) and surface
  // configuration problems as an overlay instead of unmounting.
  const overlay = !mapping.countryColumn
    ? "Select a country column with 2-letter ISO codes (US, GB)."
    : byCode.size === 0
      ? "No rows matched 2-letter country codes. Use ISO-2 codes (US, GB), not full names."
      : null;

  return (
    <div ref={measureRef} className="relative h-full w-full overflow-hidden rounded">
      <div ref={mapRef} className="h-full w-full" style={{ background: "none", outline: "none" }} />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 px-3 text-center text-xs text-neutral-500 dark:bg-neutral-900/70">
          {overlay}
        </div>
      )}
      {/* Portal to the body: dashboard cards sit behind a CSS transform (react-grid-layout),
          which would otherwise anchor this fixed tooltip to the card and clip it. */}
      {tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] max-w-xs rounded-md border border-neutral-200 bg-white p-2 text-xs text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
            style={{ left: tooltip.x, top: tooltip.y - 10, transform: "translate(-50%, -100%)" }}
          >
            <div className="mb-1 flex items-center gap-1.5 font-medium">
              {tooltip.code && <CountryFlag country={tooltip.code} />}
              {tooltip.name}
            </div>
            <div className="tabular-nums text-neutral-600 dark:text-neutral-300">
              {tooltip.value !== null ? formatValue(tooltip.value, format) : "No data"}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
