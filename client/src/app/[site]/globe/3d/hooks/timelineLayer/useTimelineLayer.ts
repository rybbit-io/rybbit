import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState, useCallback } from "react";
import { throttle } from "lodash";
import type { GetSessionsResponse } from "../../../../../../api/analytics/endpoints";
import { useTimelineStore, useActiveSessions } from "../../../timelineStore";
import { initializeClusterSource, setupClusterClickHandler } from "./timelineClusterUtils";
import {
  SOURCE_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTERING_THRESHOLD,
  SPREAD_START_ZOOM,
} from "./timelineLayerConstants";
import { setClusterLayersVisibility, updateGeoJSONData } from "./timelineLayerManager";
import { updateMarkers as updateMarkersUtil, clearAllMarkers, type MarkerData } from "./timelineMarkerManager";
import {
  createTooltipPopup,
  addClusterLayers,
  disableClusterTransitions,
  setupClusterHoverHandlers,
} from "./timelineLayerSetup";

export function useTimelineLayer({
  map,
  mapLoaded,
  mapView,
}: {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  mapView: string;
}) {
  const activeSessions = useActiveSessions();
  const { currentTime } = useTimelineStore();
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const markersMapRef = useRef<Map<string, MarkerData>>(new Map());
  const openTooltipSessionIdRef = useRef<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<GetSessionsResponse[number] | null>(null);

  // Close tooltip when timeline time changes
  useEffect(() => {
    if (popupRef.current && popupRef.current.isOpen()) {
      popupRef.current.remove();
      openTooltipSessionIdRef.current = null;
    }
  }, [currentTime]);

  // Initialize Mapbox source and layers for clustering
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    // Initialize popup once
    if (!popupRef.current) {
      popupRef.current = createTooltipPopup();
    }

    // Add source and layers if they don't exist
    if (!mapInstance.getSource(SOURCE_ID)) {
      initializeClusterSource(mapInstance, CLUSTER_MAX_ZOOM, CLUSTER_RADIUS);
      addClusterLayers(mapInstance);
      disableClusterTransitions(mapInstance);
    }

    // Setup interaction handlers
    const cleanupClusterClick = setupClusterClickHandler(mapInstance, CLUSTER_LAYER_ID);
    const cleanupClusterHover = setupClusterHoverHandlers(mapInstance, CLUSTER_LAYER_ID);

    return () => {
      cleanupClusterClick();
      cleanupClusterHover();
    };
  }, [map, mapLoaded]);

  // Update GeoJSON data and HTML markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    const markersMap = markersMapRef.current;

    // Hide layers and markers if not in timeline view
    if (mapView !== "timeline") {
      setClusterLayersVisibility(mapInstance, false);
      clearAllMarkers(markersMap);
      return;
    }

    // Show/hide cluster layers based on number of sessions
    const shouldShowClusters = activeSessions.length > CLUSTERING_THRESHOLD;
    setClusterLayersVisibility(mapInstance, shouldShowClusters);

    // Update GeoJSON data source
    updateGeoJSONData(mapInstance, activeSessions, SPREAD_START_ZOOM);

    // Update GeoJSON when zoom changes (for point spreading)
    const handleZoomChange = () => {
      updateGeoJSONData(mapInstance, activeSessions, SPREAD_START_ZOOM);
    };

    // Function to update HTML markers for unclustered points
    const updateMarkers = async () => {
      await updateMarkersUtil(
        mapInstance,
        markersMap,
        shouldShowClusters,
        activeSessions,
        popupRef,
        openTooltipSessionIdRef,
        map,
        setSelectedSession,
        SPREAD_START_ZOOM
      );
    };

    // Throttle the marker updates to run at most once every 150ms
    const throttledUpdateMarkers = throttle(updateMarkers, 150, {
      leading: true,
      trailing: true,
    });

    // Initial update
    updateMarkers();

    // Update GeoJSON and markers on zoom (for point spreading)
    mapInstance.on("zoom", handleZoomChange);
    mapInstance.on("zoom", throttledUpdateMarkers);
    mapInstance.on("move", throttledUpdateMarkers);
    mapInstance.on("sourcedata", throttledUpdateMarkers);

    // Handle map click to close tooltip
    const handleMapClick = () => {
      if (popupRef.current && popupRef.current.isOpen()) {
        popupRef.current.remove();
        openTooltipSessionIdRef.current = null;
      }
    };

    mapInstance.on("click", handleMapClick);

    // Cleanup function
    return () => {
      clearAllMarkers(markersMap);
      throttledUpdateMarkers.cancel(); // Cancel any pending throttled calls
      mapInstance.off("zoom", handleZoomChange);
      mapInstance.off("zoom", throttledUpdateMarkers);
      mapInstance.off("move", throttledUpdateMarkers);
      mapInstance.off("sourcedata", throttledUpdateMarkers);
      mapInstance.off("click", handleMapClick);
    };
  }, [activeSessions, mapLoaded, map, mapView]);

  return {
    selectedSession,
    setSelectedSession,
  };
}
