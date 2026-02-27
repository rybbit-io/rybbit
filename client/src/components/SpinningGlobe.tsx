"use client";

import { isNil, round, throttle } from "lodash";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GetSessionsResponse } from "../api/analytics/endpoints";
import { useConfigs } from "../lib/configs";
import "../app/[site]/globe/globe.css";

// Constants
const SOURCE_ID = "demo-sessions";
const CLUSTER_LAYER_ID = "demo-clusters";
const CLUSTER_COUNT_LAYER_ID = "demo-cluster-count";
const UNCLUSTERED_LAYER_ID = "demo-unclustered-point";
const CLUSTER_MAX_ZOOM = 11;
const CLUSTER_RADIUS = 25;
const MIN_CLUSTER_SIZE = 20;
const CLUSTERING_THRESHOLD = 500;
const SPREAD_START_ZOOM = 8;
const SPREAD_RADIUS_DEGREES = 0.006;

// Import avatar generation
import BoringAvatar from "boring-avatars";
import { createElement } from "react";
// @ts-ignore - React 19 has built-in types
import { renderToStaticMarkup } from "react-dom/server";
import { AVATAR_COLORS } from "./Avatar";

function generateAvatarSVG(userId: string, size: number): string {
  const avatarElement = createElement(BoringAvatar, {
    size,
    name: userId,
    variant: "beam",
    colors: AVATAR_COLORS,
  });
  return renderToStaticMarkup(avatarElement);
}

// Hash function for deterministic spreading
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function spreadOverlappingPoints(sessions: GetSessionsResponse, zoom: number): Map<string, [number, number]> {
  const coordinateMap = new Map<string, [number, number]>();

  if (zoom < SPREAD_START_ZOOM) {
    return coordinateMap;
  }

  const spreadIntensity = Math.min((zoom - SPREAD_START_ZOOM) / 6, 1);
  const spreadRadius = SPREAD_RADIUS_DEGREES * spreadIntensity;

  const locationGroups = new Map<string, GetSessionsResponse>();

  sessions.forEach(session => {
    if (isNil(session.lat) || isNil(session.lon)) return;

    const roundedLon = round(session.lon, 4);
    const roundedLat = round(session.lat, 4);
    const key = `${roundedLat},${roundedLon}`;

    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(session);
  });

  locationGroups.forEach((group, key) => {
    if (group.length === 1) {
      const session = group[0];
      coordinateMap.set(session.session_id, [round(session.lon, 4), round(session.lat, 4)]);
    } else {
      const [latStr, lonStr] = key.split(",");
      const baseLat = parseFloat(latStr);
      const baseLon = parseFloat(lonStr);

      group.forEach(session => {
        const seed = hashStringToNumber(session.session_id);
        const random1 = seededRandom(seed);
        const random2 = seededRandom(seed + 1);
        const angle = random1 * 2 * Math.PI;
        const radius = Math.sqrt(random2) * spreadRadius;
        const latRad = baseLat * (Math.PI / 180);
        const lonAdjustment = Math.cos(latRad);
        const offsetLat = Math.sin(angle) * radius;
        const offsetLon = (Math.cos(angle) * radius) / lonAdjustment;

        coordinateMap.set(session.session_id, [baseLon + offsetLon, baseLat + offsetLat]);
      });
    }
  });

  return coordinateMap;
}

type MarkerData = {
  marker: mapboxgl.Marker;
  element: HTMLDivElement;
};

// Spin configuration
const SECONDS_PER_REVOLUTION = 120;
const MAX_SPIN_ZOOM = 5;
const SLOW_SPIN_ZOOM = 3;

export function SpinningGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersMapRef = useRef<Map<string, MarkerData>>(new Map());
  const isUserInteractingRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { configs, isLoading: isLoadingConfigs } = useConfigs();

  // Fetch demo sessions
  const { data: sessionsData } = useQuery<{ data: GetSessionsResponse }>({
    queryKey: ["demo-sessions"],
    queryFn: async () => {
      const response = await fetch(
        "https://demo.rybbit.com/api/sites/81/sessions?past_minutes_start=240&past_minutes_end=0&filters=[]&page=1&limit=100"
      );
      return response.json();
    },
    staleTime: Infinity,
  });

  const sessions = sessionsData?.data || [];

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !configs?.mapboxToken || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = configs.mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      projection: { name: "globe" },
      zoom: 1.5,
      center: [0, 20],
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("style.load", () => {
      // Apply custom styling
      try {
        if (map.getLayer("water")) {
          map.setPaintProperty("water", "fill-color", "#0a1929");
        }
      } catch (error) {
        // Layer may not exist
      }

      try {
        map.setFog({
          color: "rgb(61, 76, 89)",
          "high-color": "rgb(36, 92, 223)",
          "horizon-blend": 0.01,
          "space-color": "rgb(12, 12, 16)",
          "star-intensity": 0.6,
        });
      } catch (error) {
        // Fog may not be supported
      }

      // Add clustering source
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: CLUSTER_RADIUS,
      });

      // Add cluster circle layer
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], MIN_CLUSTER_SIZE]],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#059669", 10, "#059669", 30, "#10b981", 100, "#34d399"],
          "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25],
        },
      });

      // Add cluster count layer
      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], MIN_CLUSTER_SIZE]],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Add unclustered point layer (hidden, for querying)
      map.addLayer({
        id: UNCLUSTERED_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 0,
          "circle-opacity": 0,
        },
      });

      // Cluster click handler
      map.on("click", CLUSTER_LAYER_ID, e => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !zoom) return;
          const coordinates = (features[0].geometry as any).coordinates;
          map.easeTo({ center: coordinates, zoom, duration: 500 });
        });
      });

      // Cursor change on cluster hover
      map.on("mouseenter", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      // Spin globe function using easeTo for smooth animation
      const spinGlobe = () => {
        if (!mapRef.current) return;
        const zoom = mapRef.current.getZoom();
        if (!isUserInteractingRef.current && zoom < MAX_SPIN_ZOOM) {
          let distancePerSecond = 360 / SECONDS_PER_REVOLUTION;
          if (zoom > SLOW_SPIN_ZOOM) {
            // Slow spinning at higher zooms
            const zoomDif = (MAX_SPIN_ZOOM - zoom) / (MAX_SPIN_ZOOM - SLOW_SPIN_ZOOM);
            distancePerSecond *= zoomDif;
          }
          const center = mapRef.current.getCenter();
          center.lng -= distancePerSecond;
          // Smoothly animate the map over one second
          mapRef.current.easeTo({ center, duration: 1000, easing: n => n });
        }
      };

      // Pause spinning on interaction
      map.on("mousedown", () => {
        isUserInteractingRef.current = true;
      });

      // Restart spinning after interaction ends
      map.on("mouseup", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });
      map.on("dragend", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });
      map.on("pitchend", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });
      map.on("rotateend", () => {
        isUserInteractingRef.current = false;
        spinGlobe();
      });

      // When animation completes, spin again (creates continuous rotation)
      map.on("moveend", () => {
        spinGlobe();
      });

      setMapLoaded(true);

      // Start spinning
      spinGlobe();
    });

    return () => {
      // Clear markers
      markersMapRef.current.forEach(({ marker }) => marker.remove());
      markersMapRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [configs?.mapboxToken]);

  // Update sessions data and markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || sessions.length === 0) return;

    const mapInstance = mapRef.current;
    const markersMap = markersMapRef.current;
    const shouldShowClusters = sessions.length > CLUSTERING_THRESHOLD;

    // Update GeoJSON data
    const updateGeoJSONData = () => {
      const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (!source) return;

      const zoom = mapInstance.getZoom();
      const spreadCoordinates = spreadOverlappingPoints(sessions, zoom);

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: sessions
          .filter(s => !isNil(s.lat) && !isNil(s.lon))
          .map(session => {
            const coords = spreadCoordinates.get(session.session_id) || [round(session.lon, 4), round(session.lat, 4)];
            return {
              type: "Feature",
              properties: session,
              geometry: {
                type: "Point",
                coordinates: coords,
              },
            };
          }),
      };

      source.setData(geojson);
    };

    // Show/hide cluster layers
    const visibility = shouldShowClusters ? "visible" : "none";
    if (mapInstance.getLayer(CLUSTER_LAYER_ID)) {
      mapInstance.setLayoutProperty(CLUSTER_LAYER_ID, "visibility", visibility);
    }
    if (mapInstance.getLayer(CLUSTER_COUNT_LAYER_ID)) {
      mapInstance.setLayoutProperty(CLUSTER_COUNT_LAYER_ID, "visibility", visibility);
    }

    // Update markers function
    const updateMarkers = async () => {
      const zoom = mapInstance.getZoom();
      const spreadCoordinates = spreadOverlappingPoints(sessions, zoom);

      let unclusteredFeatures: any[] = [];

      if (!shouldShowClusters) {
        // Show all sessions as individual markers
        unclusteredFeatures = sessions
          .filter(s => !isNil(s.lat) && !isNil(s.lon))
          .map(session => {
            const coords = spreadCoordinates.get(session.session_id) || [round(session.lon, 4), round(session.lat, 4)];
            return {
              properties: session,
              geometry: { type: "Point", coordinates: coords },
            };
          });
      } else {
        // Get unclustered features from map
        const features = mapInstance.querySourceFeatures(SOURCE_ID);
        const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        const promises: Promise<void>[] = [];

        features.forEach(f => {
          if (!f.properties) return;

          if (!f.properties.cluster) {
            unclusteredFeatures.push(f);
          } else if (f.properties.point_count && f.properties.point_count < MIN_CLUSTER_SIZE) {
            const promise = new Promise<void>(resolve => {
              source.getClusterLeaves(f.properties!.cluster_id, f.properties!.point_count, 0, (err, leaves) => {
                if (!err && leaves) {
                  unclusteredFeatures.push(...leaves);
                }
                resolve();
              });
            });
            promises.push(promise);
          }
        });

        await Promise.all(promises);
      }

      // Build set of current session IDs
      const currentSessionIds = new Set(unclusteredFeatures.map(f => f.properties?.session_id).filter(Boolean));

      // Remove markers no longer visible
      const toRemove: string[] = [];
      markersMap.forEach(({ marker }, sessionId) => {
        if (!currentSessionIds.has(sessionId)) {
          marker.remove();
          toRemove.push(sessionId);
        }
      });
      toRemove.forEach(id => markersMap.delete(id));

      // Create or update markers
      unclusteredFeatures.forEach(feature => {
        const session = feature.properties as GetSessionsResponse[number];
        if (!session?.session_id) return;

        const existing = markersMap.get(session.session_id);
        const [lng, lat] = feature.geometry.coordinates;

        if (existing) {
          const currentLngLat = existing.marker.getLngLat();
          if (currentLngLat.lng !== lng || currentLngLat.lat !== lat) {
            existing.marker.setLngLat([lng, lat]);
          }
        } else {
          // Create avatar marker
          const avatarContainer = document.createElement("div");
          avatarContainer.className = "timeline-avatar-marker";
          avatarContainer.style.cursor = "pointer";
          avatarContainer.style.borderRadius = "50%";
          avatarContainer.style.overflow = "hidden";
          avatarContainer.style.width = "32px";
          avatarContainer.style.height = "32px";
          avatarContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          avatarContainer.innerHTML = generateAvatarSVG(session.user_id, 32);

          const marker = new mapboxgl.Marker({
            element: avatarContainer,
            anchor: "center",
          })
            .setLngLat([lng, lat])
            .addTo(mapInstance);

          markersMap.set(session.session_id, { marker, element: avatarContainer });
        }
      });
    };

    // Initial update
    updateGeoJSONData();
    updateMarkers();

    // Throttled updates on map events
    const throttledUpdate = throttle(
      () => {
        updateGeoJSONData();
        updateMarkers();
      },
      150,
      { leading: true, trailing: true }
    );

    mapInstance.on("zoom", throttledUpdate);
    mapInstance.on("move", throttledUpdate);
    mapInstance.on("sourcedata", throttledUpdate);

    return () => {
      throttledUpdate.cancel();
      mapInstance.off("zoom", throttledUpdate);
      mapInstance.off("move", throttledUpdate);
      mapInstance.off("sourcedata", throttledUpdate);
      // Clear markers on cleanup
      markersMap.forEach(({ marker }) => marker.remove());
      markersMap.clear();
    };
  }, [sessions, mapLoaded]);

  if (isLoadingConfigs || !configs?.mapboxToken) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&_.mapboxgl-ctrl-bottom-left]:hidden! [&_.mapboxgl-ctrl-logo]:hidden!"
    />
  );
}
