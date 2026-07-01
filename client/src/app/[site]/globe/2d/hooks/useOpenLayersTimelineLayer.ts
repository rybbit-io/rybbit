import Feature, { FeatureLike } from "ol/Feature";
import OLMap from "ol/Map";
import { unByKey as dispose } from "ol/Observable";
import Overlay from "ol/Overlay";
import Point from "ol/geom/Point";
import type { EventsKey } from "ol/events";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import Cluster from "ol/source/Cluster";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Style, Text } from "ol/style";
import { useEffect, useRef, useState } from "react";
import type { GetSessionsResponse } from "../../../../../api/analytics/endpoints";
import { generateAvatarSVG } from "../../3d/hooks/timelineLayer/timelineMarkerHelpers";
import { useActiveSessions, useTimelineStore } from "../../timelineStore";
import { CLUSTER_MAX_ZOOM, CLUSTERING_THRESHOLD, MIN_CLUSTER_SIZE } from "../../utils/clusteringConstants";
import { buildTooltipHTML } from "../../utils/timelineTooltipBuilder";

// OpenLayers-specific clustering constants
const CLUSTER_RADIUS = 50; // pixels (OpenLayers specific)
const AVATAR_MARKER_STYLE =
  "cursor: pointer; border-radius: 50%; overflow: hidden; width: 32px; height: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transform: translate(-50%, -50%);";

interface TimelineLayerProps {
  mapInstanceRef: React.RefObject<OLMap | null>;
  mapViewRef: React.RefObject<string>;
  mapView: string;
}

type OverlayData = {
  overlay: Overlay;
  element: HTMLDivElement;
  session: GetSessionsResponse[number];
  cleanup: () => void;
};

export function useOpenLayersTimelineLayer({ mapInstanceRef, mapViewRef, mapView }: TimelineLayerProps) {
  const activeSessions = useActiveSessions();
  const { currentTime } = useTimelineStore();
  const overlaysMapRef = useRef<Map<string, OverlayData>>(new Map());
  const clusterLayerRef = useRef<VectorLayer<Cluster> | null>(null);
  const tooltipOverlayRef = useRef<Overlay | null>(null);
  const openTooltipSessionIdRef = useRef<string | null>(null);
  const tooltipSessionRef = useRef<GetSessionsResponse[number] | null>(null);
  const [selectedSession, setSelectedSession] = useState<GetSessionsResponse[number] | null>(null);
  const currentZoomRef = useRef<number>(2);

  // Close tooltip when timeline time changes
  useEffect(() => {
    if (tooltipOverlayRef.current && openTooltipSessionIdRef.current) {
      tooltipOverlayRef.current.setPosition(undefined);
      openTooltipSessionIdRef.current = null;
      tooltipSessionRef.current = null;
    }
  }, [currentTime]);

  // Track zoom level changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleZoomChange = () => {
      const zoom = map.getView().getZoom() || 2;
      currentZoomRef.current = zoom;
    };

    // Set initial zoom
    handleZoomChange();

    const moveEndKey = map.on("moveend", handleZoomChange);

    return () => {
      dispose(moveEndKey);
    };
  }, [mapInstanceRef]);

  // Initialize tooltip overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleTooltipClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>(".view-session-btn");
      if (!button) return;

      event.stopPropagation();

      const session = tooltipSessionRef.current;
      if (!session) return;

      setSelectedSession(session);
      tooltipOverlayRef.current?.setPosition(undefined);
      openTooltipSessionIdRef.current = null;
      tooltipSessionRef.current = null;
    };

    if (!tooltipOverlayRef.current) {
      const tooltipElement = document.createElement("div");
      tooltipElement.className = "ol-timeline-tooltip";
      tooltipElement.style.cssText = "position: absolute; z-index: 1000;";

      tooltipElement.addEventListener("click", handleTooltipClick);

      const tooltip = new Overlay({
        element: tooltipElement,
        positioning: "top-left",
        offset: [-46, -46], // Offset to align tooltip avatar center with marker center (12px padding + 18px half-avatar)
        stopEvent: true,
      });

      map.addOverlay(tooltip);
      tooltipOverlayRef.current = tooltip;
    }

    return () => {
      if (tooltipOverlayRef.current) {
        const element = tooltipOverlayRef.current.getElement();
        element?.removeEventListener("click", handleTooltipClick);
        map.removeOverlay(tooltipOverlayRef.current);
        tooltipOverlayRef.current = null;
      }
    };
  }, [mapInstanceRef]);

  // Update clusters/overlays when active sessions change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const overlaysMap = overlaysMapRef.current;

    // Hide everything if not in timeline view
    if (mapView !== "timeline") {
      // Clear overlays
      overlaysMap.forEach(({ overlay, cleanup }) => {
        cleanup();
        map.removeOverlay(overlay);
      });
      overlaysMap.clear();

      // Clear cluster layer
      if (clusterLayerRef.current) {
        map.removeLayer(clusterLayerRef.current);
        clusterLayerRef.current = null;
      }
      return;
    }

    let clusterMoveEndKey: EventsKey | EventsKey[] | null = null;

    // Determine if we should use clustering
    const shouldCluster = activeSessions.length > CLUSTERING_THRESHOLD && currentZoomRef.current < CLUSTER_MAX_ZOOM;

    if (shouldCluster) {
      // Create features for clustering
      const features = activeSessions.flatMap(session => {
        if (!session.lat || !session.lon) return [];

        const feature = new Feature({
          geometry: new Point(fromLonLat([session.lon, session.lat])),
        });

        feature.setProperties({
          session_id: session.session_id,
          session,
        });

        return [feature];
      });

      // Create vector source
      const vectorSource = new VectorSource({
        features,
      });

      // Create cluster source
      const clusterSource = new Cluster({
        distance: CLUSTER_RADIUS,
        source: vectorSource,
      });

      // Style function for clusters (matching Mapbox styling)
      const styleFunction = (feature: FeatureLike) => {
        const clusterFeatures = feature.get("features");
        const size = clusterFeatures ? clusterFeatures.length : 1;

        if (size >= MIN_CLUSTER_SIZE) {
          // Determine color based on cluster size (matching Mapbox steps)
          let color: string;
          if (size >= 100) {
            color = "#34d399"; // green-400
          } else if (size >= 30) {
            color = "#10b981"; // green-500
          } else {
            color = "#059669"; // green-600
          }

          // Determine radius based on cluster size (matching Mapbox steps)
          let radius: number;
          if (size >= 30) {
            radius = 25;
          } else if (size >= 10) {
            radius = 20;
          } else {
            radius = 15;
          }

          return new Style({
            image: new Circle({
              radius,
              fill: new Fill({
                color,
              }),
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({
                color: "#ffffff",
              }),
              font: "bold 14px sans-serif",
            }),
          });
        } else {
          // Small cluster - invisible (we'll use overlays for these)
          return new Style({});
        }
      };

      // Function to update unclustered overlays
      const updateUnclusteredOverlays = () => {
        // Get unclustered features (clusters with size < MIN_CLUSTER_SIZE) and create overlays for them
        const extent = map.getView().calculateExtent(map.getSize());
        const clusterFeatures = clusterSource.getFeaturesInExtent(extent);
        const unclusteredSessions: GetSessionsResponse = [];

        clusterFeatures.forEach(clusterFeature => {
          const features = clusterFeature.get("features");
          if (features && features.length < MIN_CLUSTER_SIZE) {
            // Extract all sessions from small clusters
            features.forEach((feature: Feature) => {
              const session = feature.get("session");
              if (session) {
                unclusteredSessions.push(session);
              }
            });
          }
        });

        // Update overlays for unclustered sessions
        const currentSessionIds = new Set(unclusteredSessions.map(s => s.session_id));

        // Remove overlays that are no longer unclustered
        const toRemove: string[] = [];
        overlaysMap.forEach(({ overlay, cleanup }, sessionId) => {
          if (!currentSessionIds.has(sessionId)) {
            cleanup();
            map.removeOverlay(overlay);
            toRemove.push(sessionId);
          }
        });
        toRemove.forEach(id => overlaysMap.delete(id));

        // Create or update overlays for unclustered sessions
        unclusteredSessions.forEach(session => {
          if (!session?.session_id || !session.lat || !session.lon) return;

          const existing = overlaysMap.get(session.session_id);

          if (existing) {
            // Update position if needed
            const currentPos = existing.overlay.getPosition();
            const newPos = fromLonLat([session.lon, session.lat]);
            if (!currentPos || currentPos[0] !== newPos[0] || currentPos[1] !== newPos[1]) {
              existing.overlay.setPosition(newPos);
            }
          } else {
            // Create new overlay (same code as non-clustering case)
            const avatarContainer = document.createElement("div");
            avatarContainer.className = "timeline-avatar-marker";
            avatarContainer.style.cssText = AVATAR_MARKER_STYLE;

            const avatarSVG = generateAvatarSVG(session.user_id, 32);
            avatarContainer.innerHTML = avatarSVG;

            const handleAvatarClick = (e: MouseEvent) => {
              e.stopPropagation();

              if (openTooltipSessionIdRef.current === session.session_id && tooltipOverlayRef.current) {
                tooltipOverlayRef.current.setPosition(undefined);
                openTooltipSessionIdRef.current = null;
                tooltipSessionRef.current = null;
                return;
              }

              if (tooltipOverlayRef.current) {
                const html = buildTooltipHTML(session, session.lon, session.lat);
                tooltipOverlayRef.current.getElement()!.innerHTML = html;
                tooltipOverlayRef.current.setPosition(fromLonLat([session.lon, session.lat]));
                openTooltipSessionIdRef.current = session.session_id;
                tooltipSessionRef.current = session;
              }
            };

            avatarContainer.addEventListener("click", handleAvatarClick);

            const overlay = new Overlay({
              element: avatarContainer,
              positioning: "center-center",
              stopEvent: false,
            });

            overlay.setPosition(fromLonLat([session.lon, session.lat]));
            map.addOverlay(overlay);

            // Cleanup function to remove marker event listeners
            const cleanup = () => {
              avatarContainer.removeEventListener("click", handleAvatarClick);
            };

            overlaysMap.set(session.session_id, { overlay, element: avatarContainer, session, cleanup });
          }
        });
      };

      // Create or update cluster layer
      if (!clusterLayerRef.current) {
        const clusterLayer = new VectorLayer({
          source: clusterSource,
          style: styleFunction,
          zIndex: 100,
        });

        map.addLayer(clusterLayer);
        clusterLayerRef.current = clusterLayer;
      } else {
        clusterLayerRef.current.setSource(clusterSource);
        clusterLayerRef.current.setStyle(styleFunction);
      }

      // Wait for next render cycle to query cluster features
      requestAnimationFrame(() => {
        updateUnclusteredOverlays();
      });

      // Also update overlays when map moves/zooms (clusters change)
      const handleMoveEndForClusters = () => {
        updateUnclusteredOverlays();
      };
      clusterMoveEndKey = map.on("moveend", handleMoveEndForClusters);
    } else {
      // Not clustering - use individual overlays
      // Remove cluster layer
      if (clusterLayerRef.current) {
        map.removeLayer(clusterLayerRef.current);
        clusterLayerRef.current = null;
      }

      // Build set of current session IDs
      const currentSessionIds = new Set(activeSessions.map(s => s.session_id));

      // Remove overlays that are no longer active
      const toRemove: string[] = [];
      overlaysMap.forEach(({ overlay, cleanup }, sessionId) => {
        if (!currentSessionIds.has(sessionId)) {
          cleanup();
          map.removeOverlay(overlay);
          toRemove.push(sessionId);
        }
      });
      toRemove.forEach(id => overlaysMap.delete(id));

      // Create or update overlays for active sessions
      activeSessions.forEach(session => {
        if (!session?.session_id || !session.lat || !session.lon) return;

        const existing = overlaysMap.get(session.session_id);

        if (existing) {
          // Update position if needed
          const currentPos = existing.overlay.getPosition();
          const newPos = fromLonLat([session.lon, session.lat]);
          if (!currentPos || currentPos[0] !== newPos[0] || currentPos[1] !== newPos[1]) {
            existing.overlay.setPosition(newPos);
          }
        } else {
          // Create new overlay
          const avatarContainer = document.createElement("div");
          avatarContainer.className = "timeline-avatar-marker";
          avatarContainer.style.cssText = AVATAR_MARKER_STYLE;

          const avatarSVG = generateAvatarSVG(session.user_id, 32);
          avatarContainer.innerHTML = avatarSVG;

          // Add click handler for tooltip
          const handleAvatarClick = (e: MouseEvent) => {
            e.stopPropagation();

            // If clicking the same avatar that has the tooltip open, close it
            if (openTooltipSessionIdRef.current === session.session_id && tooltipOverlayRef.current) {
              tooltipOverlayRef.current.setPosition(undefined);
              openTooltipSessionIdRef.current = null;
              tooltipSessionRef.current = null;
              return;
            }

            // Show tooltip for this session
            if (tooltipOverlayRef.current) {
              const html = buildTooltipHTML(session, session.lon, session.lat);
              tooltipOverlayRef.current.getElement()!.innerHTML = html;
              tooltipOverlayRef.current.setPosition(fromLonLat([session.lon, session.lat]));
              openTooltipSessionIdRef.current = session.session_id;
              tooltipSessionRef.current = session;
            }
          };

          avatarContainer.addEventListener("click", handleAvatarClick);

          const overlay = new Overlay({
            element: avatarContainer,
            positioning: "center-center",
            stopEvent: false,
          });

          overlay.setPosition(fromLonLat([session.lon, session.lat]));
          map.addOverlay(overlay);

          // Cleanup function to remove marker event listeners
          const cleanup = () => {
            avatarContainer.removeEventListener("click", handleAvatarClick);
          };

          overlaysMap.set(session.session_id, { overlay, element: avatarContainer, session, cleanup });
        }
      });
    }

    // Handle cluster clicks to zoom in
    const handleClusterClick = (event: any) => {
      if (!shouldCluster || !clusterLayerRef.current) return;

      const pixel = map.getEventPixel(event.originalEvent);
      const features = map.getFeaturesAtPixel(pixel, {
        layerFilter: layer => layer === clusterLayerRef.current,
      });

      if (features.length > 0) {
        const feature = features[0] as Feature;
        const clusterFeatures = feature.get("features");

        if (clusterFeatures && clusterFeatures.length >= MIN_CLUSTER_SIZE) {
          // Zoom in on the cluster
          const extent = feature.getGeometry()?.getExtent();
          if (extent) {
            const view = map.getView();
            const currentZoom = view.getZoom() ?? view.getMinZoom() ?? 0;
            const targetZoom = currentZoom + 2;
            const viewMaxZoom = view.getMaxZoom();
            const clampedMaxZoom = viewMaxZoom !== undefined ? Math.min(targetZoom, viewMaxZoom) : targetZoom;

            view.fit(extent, {
              duration: 500,
              maxZoom: clampedMaxZoom,
              padding: [50, 50, 50, 50],
            });
          }
        }
      }
    };

    // Handle map click to close tooltip
    const handleMapClick = (event: any) => {
      // First, check for cluster clicks
      handleClusterClick(event);

      // Then close tooltip
      if (tooltipOverlayRef.current && openTooltipSessionIdRef.current) {
        tooltipOverlayRef.current.setPosition(undefined);
        openTooltipSessionIdRef.current = null;
        tooltipSessionRef.current = null;
      }
    };

    const mapClickKey = map.on("click", handleMapClick);

    // Cleanup function
    return () => {
      dispose(mapClickKey);

      if (clusterMoveEndKey) {
        dispose(clusterMoveEndKey);
      }

      overlaysMap.forEach(({ overlay, cleanup }) => {
        cleanup();
        map.removeOverlay(overlay);
      });
      overlaysMap.clear();

      if (clusterLayerRef.current) {
        map.removeLayer(clusterLayerRef.current);
        clusterLayerRef.current = null;
      }
    };
  }, [activeSessions, mapView, mapInstanceRef, mapViewRef]);

  return {
    selectedSession,
    setSelectedSession,
  };
}
