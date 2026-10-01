"use client";

import { apply } from "ol-mapbox-style";
import Map from "ol/Map";
import View from "ol/View";
import Attribution from "ol/control/Attribution";
import LayerGroup from "ol/layer/Group";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import { useEffect, useRef } from "react";
import type { GetSessionsResponse } from "../../../../../api/analytics/endpoints";
import { useCountries, useSubdivisions } from "../../../../../lib/geo";
import { cn } from "../../../../../lib/utils";
import type { Breakdown } from "../../globeStore";
import { canvasToBlob, registerMapController } from "../../utils/mapController";
import type { MapTone } from "../../utils/mapStyles";
import type { CityPoint, OnlinePoint, PlaceFill } from "../../utils/mapTypes";
import { useOpenLayersChoroplethLayer } from "../hooks/useOpenLayersChoroplethLayer";
import { useOpenLayersCitiesLayer } from "../hooks/useOpenLayersCitiesLayer";
import { useOpenLayersOnlineLayer } from "../hooks/useOpenLayersOnlineLayer";
import { useOpenLayersTimelineLayer } from "../hooks/useOpenLayersTimelineLayer";

const INITIAL_CENTER = [0, 20];
const INITIAL_ZOOM = 2;

interface OpenLayersMapProps {
  breakdown: Breakdown;
  styleUrl: string;
  tone: MapTone;
  /** Fills for the breakdown's places, keyed by country or region code. */
  places: globalThis.Map<string, PlaceFill>;
  cityPoints: CityPoint[];
  strokeColor: string;
  selectedKey: string | null;
  onlinePoints: OnlinePoint[];
  showOnline: boolean;
  activeSessions: GetSessionsResponse;
  windowKey: number | null;
  onSessionSelect: (session: GetSessionsResponse[number]) => void;
}

/**
 * Draws every layer canvas onto one, the way the map composes them on screen.
 * HTML overlays (session avatars) are not canvases and are left out.
 */
function snapshotMap(map: Map): Promise<Blob> {
  return new Promise((resolve, reject) => {
    map.once("rendercomplete", () => {
      const [width, height] = map.getSize() ?? [0, 0];
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const context = output.getContext("2d");
      if (!context || width === 0 || height === 0) {
        reject(new Error("The map could not be exported"));
        return;
      }

      // The basemap's ground colour is an element behind the layer canvases, not
      // part of them; without it the land would be exported transparent.
      const viewport = map.getViewport();
      const ground = viewport.querySelector<HTMLElement>(".ol-mapbox-style-background") ?? map.getTargetElement();
      context.fillStyle = getComputedStyle(ground).backgroundColor;
      context.fillRect(0, 0, width, height);

      viewport.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas, canvas.ol-layer").forEach(canvas => {
        if (canvas.width === 0) return;
        const container = canvas.parentElement;
        const opacity = container?.style.opacity || canvas.style.opacity;
        context.globalAlpha = opacity === "" ? 1 : Number(opacity);

        const matrix = canvas.style.transform
          .match(/^matrix\(([^(]*)\)$/)?.[1]
          .split(",")
          .map(Number);
        if (matrix && matrix.length === 6) {
          context.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        } else {
          context.setTransform(1, 0, 0, 1, 0, 0);
        }

        // The basemap paints its background on the layer's container, not its canvas.
        const background = container?.style.backgroundColor;
        if (background) {
          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(canvas, 0, 0);
      });

      context.globalAlpha = 1;
      context.setTransform(1, 0, 0, 1, 0, 0);
      canvasToBlob(output).then(resolve, reject);
    });
    map.renderSync();
  });
}

export function OpenLayersMap({
  breakdown,
  styleUrl,
  tone,
  places,
  cityPoints,
  strokeColor,
  selectedKey,
  onlinePoints,
  showOnline,
  activeSessions,
  windowKey,
  onSessionSelect,
}: OpenLayersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const { data: countriesGeoData } = useCountries();
  const { data: subdivisionsGeoData } = useSubdivisions();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const view = new View({
      center: fromLonLat(INITIAL_CENTER),
      zoom: INITIAL_ZOOM,
      minZoom: 1,
      maxZoom: 18,
    });
    const map = new Map({
      target: mapRef.current,
      layers: [],
      view,
      controls: [new Attribution({ collapsible: false })],
    });
    mapInstanceRef.current = map;

    const zoomBy = (delta: number) => view.animate({ zoom: (view.getZoom() ?? INITIAL_ZOOM) + delta, duration: 200 });
    const unregister = registerMapController({
      zoomIn: () => zoomBy(1),
      zoomOut: () => zoomBy(-1),
      resetView: () => view.animate({ center: fromLonLat(INITIAL_CENTER), zoom: INITIAL_ZOOM, duration: 300 }),
      snapshot: () => snapshotMap(map),
    });

    return () => {
      unregister();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // The basemap sits under every data layer and is swapped when the style changes.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const baseLayer = new LayerGroup();
    void apply(baseLayer, styleUrl);
    map.getLayers().insertAt(0, baseLayer);

    return () => {
      map.removeLayer(baseLayer);
    };
  }, [styleUrl]);

  useOpenLayersChoroplethLayer({
    mapInstanceRef,
    geoData: countriesGeoData,
    codeProperty: "ISO_A2",
    enabled: breakdown === "country",
    places,
    strokeColor,
    selectedKey,
  });

  useOpenLayersChoroplethLayer({
    mapInstanceRef,
    geoData: subdivisionsGeoData,
    codeProperty: "iso_3166_2",
    enabled: breakdown === "region",
    places,
    strokeColor,
    selectedKey,
  });

  useOpenLayersCitiesLayer({
    mapInstanceRef,
    enabled: breakdown === "city",
    points: cityPoints,
    strokeColor,
    selectedKey,
  });

  useOpenLayersOnlineLayer({ mapInstanceRef, enabled: showOnline, points: onlinePoints, tone });

  useOpenLayersTimelineLayer({
    mapInstanceRef,
    enabled: breakdown === "sessions",
    activeSessions,
    windowKey,
    onSessionSelect,
  });

  return <div ref={mapRef} className={cn("h-full w-full", tone === "dark" ? "bg-neutral-950" : "bg-neutral-100")} />;
}
