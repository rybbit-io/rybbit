import mapboxgl from "mapbox-gl";
import type { GetSessionsResponse } from "../../../../../../api/analytics/endpoints";
import { generateAvatarSVG } from "./timelineMarkerHelpers";
import { getUnclusteredFeatures } from "./timelineClusterUtils";
import { buildTooltipHTML } from "../../../utils/timelineTooltipBuilder";

export type MarkerData = {
  marker: mapboxgl.Marker;
  element: HTMLDivElement;
  cleanup: () => void;
};

/**
 * Create an avatar marker for a session
 */
export function createAvatarMarker(
  session: GetSessionsResponse[number],
  lng: number,
  lat: number,
  mapInstance: mapboxgl.Map,
  popupRef: React.RefObject<mapboxgl.Popup | null>,
  openTooltipSessionIdRef: React.MutableRefObject<string | null>,
  map: React.RefObject<mapboxgl.Map | null>,
  setSelectedSession: (session: GetSessionsResponse[number]) => void
): { marker: mapboxgl.Marker; element: HTMLDivElement; cleanup: () => void } {
  const avatarContainer = document.createElement("div");
  avatarContainer.className = "timeline-avatar-marker";
  avatarContainer.style.cursor = "pointer";
  avatarContainer.style.borderRadius = "50%";
  avatarContainer.style.overflow = "hidden";
  avatarContainer.style.width = "32px";
  avatarContainer.style.height = "32px";
  avatarContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

  const avatarSVG = generateAvatarSVG(session.user_id, 32);
  avatarContainer.innerHTML = avatarSVG;

  const marker = new mapboxgl.Marker({
    element: avatarContainer,
    anchor: "center",
  })
    .setLngLat([lng, lat])
    .addTo(mapInstance);

  // Add click event for tooltip
  const toggleTooltip = (e: MouseEvent) => {
    e.stopPropagation();
    if (!map.current || !popupRef.current) return;

    // If clicking the same marker that has the tooltip open, close it
    if (popupRef.current.isOpen() && openTooltipSessionIdRef.current === session.session_id) {
      popupRef.current.remove();
      openTooltipSessionIdRef.current = null;
      return;
    }

    // If clicking a different marker (or no tooltip is open), show this one
    if (popupRef.current.isOpen()) {
      popupRef.current.remove();
    }

    const html = buildTooltipHTML(session, lng, lat);

    popupRef.current.setLngLat([lng, lat]).setHTML(html).addTo(map.current);
    openTooltipSessionIdRef.current = session.session_id;

    // Add click handler to the button
    const button = document.querySelector(`[data-session-id="${session.session_id}"]`);
    if (button) {
      button.addEventListener("click", e => {
        e.stopPropagation();
        setSelectedSession(session);
        popupRef.current?.remove();
        openTooltipSessionIdRef.current = null;
      });
    }
  };

  avatarContainer.addEventListener("click", toggleTooltip);

  const cleanup = () => {
    avatarContainer.removeEventListener("click", toggleTooltip);
  };

  return { marker, element: avatarContainer, cleanup };
}

/**
 * Update all markers on the map based on current unclustered features
 */
export async function updateMarkers(
  mapInstance: mapboxgl.Map,
  markersMap: Map<string, MarkerData>,
  shouldShowClusters: boolean,
  activeSessions: GetSessionsResponse,
  popupRef: React.RefObject<mapboxgl.Popup | null>,
  openTooltipSessionIdRef: React.MutableRefObject<string | null>,
  map: React.RefObject<mapboxgl.Map | null>,
  setSelectedSession: (session: GetSessionsResponse[number]) => void,
  spreadStartZoom: number
): Promise<void> {
  // Get unclustered features (including expanded small clusters)
  const unclusteredFeatures = await getUnclusteredFeatures(
    mapInstance,
    shouldShowClusters,
    activeSessions,
    spreadStartZoom
  );

  // Build set of current session IDs
  const currentSessionIds = new Set(unclusteredFeatures.map(f => f.properties?.session_id).filter(Boolean));

  // Remove markers that are no longer unclustered
  const toRemove: string[] = [];
  markersMap.forEach(({ marker, cleanup }, sessionId) => {
    if (!currentSessionIds.has(sessionId)) {
      cleanup();
      marker.remove();
      toRemove.push(sessionId);
    }
  });
  toRemove.forEach(id => markersMap.delete(id));

  // Create or update markers for unclustered sessions
  unclusteredFeatures.forEach(feature => {
    const session = feature.properties as GetSessionsResponse[number];
    if (!session?.session_id) return;

    const existing = markersMap.get(session.session_id);
    const [lng, lat] = (feature.geometry as any).coordinates;

    if (existing) {
      // Update position if needed
      const currentLngLat = existing.marker.getLngLat();
      if (currentLngLat.lng !== lng || currentLngLat.lat !== lat) {
        existing.marker.setLngLat([lng, lat]);
      }
    } else {
      // Create new marker
      const markerData = createAvatarMarker(
        session,
        lng,
        lat,
        mapInstance,
        popupRef,
        openTooltipSessionIdRef,
        map,
        setSelectedSession
      );
      markersMap.set(session.session_id, markerData);
    }
  });
}

/**
 * Remove all markers from the map and clear the markers map
 */
export function clearAllMarkers(markersMap: Map<string, MarkerData>): void {
  markersMap.forEach(({ marker, cleanup }) => {
    cleanup();
    marker.remove();
  });
  markersMap.clear();
}
