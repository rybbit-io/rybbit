"use client";

import { useRef, useEffect } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
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

    // Create base tile layer with CartoDB Dark Matter (no labels)
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        attributions:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }),
    });

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat([0, 20]),
        zoom: 2,
        minZoom: 1,
        maxZoom: 18,
      }),
      controls: [],
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
