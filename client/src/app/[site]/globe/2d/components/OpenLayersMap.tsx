"use client";

import { useRef, useEffect } from "react";
import { apply } from "ol-mapbox-style";
import Attribution from "ol/control/Attribution";
import LayerGroup from "ol/layer/Group";
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";
import { useOpenLayersCountriesLayer } from "../hooks/useOpenLayersCountriesLayer";
import { useOpenLayersSubdivisionsLayer } from "../hooks/useOpenLayersSubdivisionsLayer";
import { useOpenLayersCoordinatesLayer } from "../hooks/useOpenLayersCoordinatesLayer";
import { useOpenLayersTimelineLayer } from "../hooks/useOpenLayersTimelineLayer";

interface OpenLayersMapProps {
  mapView: "countries" | "subdivisions" | "coordinates" | "timeline";
  onSessionSelect?: (session: any) => void;
}

export function OpenLayersMap({ mapView, onSessionSelect }: OpenLayersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const mapViewRef = useRef<typeof mapView>(mapView);

  // Update mapView ref when it changes
  useEffect(() => {
    mapViewRef.current = mapView;
  }, [mapView]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const baseLayer = new LayerGroup();
    void apply(baseLayer, "https://tiles.openfreemap.org/styles/dark");

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([0, 20]),
        zoom: 2,
        minZoom: 1,
        maxZoom: 18,
      }),
      controls: [new Attribution({ collapsible: false })],
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, []);

  // Use layer hooks
  useOpenLayersCountriesLayer({
    mapInstanceRef,
    mapViewRef,
    mapView,
  });

  useOpenLayersSubdivisionsLayer({
    mapInstanceRef,
    mapViewRef,
    mapView,
  });

  useOpenLayersCoordinatesLayer({
    mapInstanceRef,
    mapViewRef,
    mapView,
  });

  const { selectedSession, setSelectedSession } = useOpenLayersTimelineLayer({
    mapInstanceRef,
    mapViewRef,
    mapView,
  });

  // Pass selected session to parent
  useEffect(() => {
    if (selectedSession && onSessionSelect) {
      onSessionSelect(selectedSession);
      setSelectedSession(null);
    }
  }, [selectedSession, onSessionSelect, setSelectedSession]);

  return <div ref={mapRef} className="w-full h-full" />;
}
