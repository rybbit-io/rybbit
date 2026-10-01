import throttle from "lodash/throttle";
import { useEffect, useRef } from "react";
import type { GetSessionsResponse } from "../../../../../../api/analytics/endpoints";
import { initializeClusterSource, setupClusterClickHandler } from "./timelineClusterUtils";
import { CLUSTER_LAYER_ID, CLUSTER_RADIUS, SOURCE_ID } from "./timelineLayerConstants";
import { setClusterLayersVisibility, updateGeoJSONData } from "./timelineLayerManager";
import {
  addClusterLayers,
  createTooltipPopup,
  disableClusterTransitions,
  setupClusterHoverHandlers,
} from "./timelineLayerSetup";
import { clearAllMarkers, updateMarkers as updateMarkersUtil, type MarkerData } from "./timelineMarkerManager";
import { CLUSTER_MAX_ZOOM, CLUSTERING_THRESHOLD, SPREAD_START_ZOOM } from "../../../utils/clusteringConstants";

export function useTimelineLayer({
  map,
  mapLoaded,
  enabled,
  activeSessions,
  windowKey,
  onSessionSelect,
}: {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  /** Avatars are only drawn in the sessions breakdown. */
  enabled: boolean;
  /** The sessions in the replay window on the map. */
  activeSessions: GetSessionsResponse;
  /** Changes when the replay moves to another window. */
  windowKey: number | null;
  /** "View details" in a session's tooltip. */
  onSessionSelect: (session: GetSessionsResponse[number]) => void;
}) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const markersMapRef = useRef<Map<string, MarkerData>>(new Map());
  const openTooltipSessionIdRef = useRef<string | null>(null);
  // Markers keep their click handlers across renders; they call whichever handler is current.
  const onSessionSelectRef = useRef(onSessionSelect);
  useEffect(() => {
    onSessionSelectRef.current = onSessionSelect;
  }, [onSessionSelect]);

  // Close tooltip when timeline time changes
  useEffect(() => {
    if (popupRef.current && popupRef.current.isOpen()) {
      popupRef.current.remove();
      openTooltipSessionIdRef.current = null;
    }
  }, [windowKey]);

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

    // Hide layers and markers outside the sessions breakdown
    if (!enabled) {
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
        session => onSessionSelectRef.current(session),
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
  }, [activeSessions, mapLoaded, map, enabled]);
}
