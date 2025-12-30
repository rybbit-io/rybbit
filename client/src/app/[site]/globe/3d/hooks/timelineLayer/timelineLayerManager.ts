import mapboxgl from "mapbox-gl";
import { isNil, round } from "lodash";
import type { GetSessionsResponse } from "../../../../../../api/analytics/endpoints";
import { CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID, SOURCE_ID, SPREAD_RADIUS_DEGREES } from "./timelineLayerConstants";

/**
 * Simple hash function to generate pseudo-random numbers from a string
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a seeded pseudo-random number between 0 and 1
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Spreads points that share the same coordinates in a scattered pattern
 * Returns a map of session IDs to their spread coordinates
 */
export function spreadOverlappingPoints(
  sessions: GetSessionsResponse,
  zoom: number,
  spreadStartZoom: number
): Map<string, [number, number]> {
  const coordinateMap = new Map<string, [number, number]>();

  // Don't spread if zoom is below threshold
  if (zoom < spreadStartZoom) {
    return coordinateMap;
  }

  // Calculate spread intensity based on zoom level (more spread at higher zoom)
  const spreadIntensity = Math.min((zoom - spreadStartZoom) / 6, 1); // 0 to 1 over 6 zoom levels
  const spreadRadius = SPREAD_RADIUS_DEGREES * spreadIntensity;

  // Group sessions by rounded coordinates
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

  // Spread points in each group in a scattered pattern
  locationGroups.forEach((group, key) => {
    if (group.length === 1) {
      // Single point, no spreading needed
      const session = group[0];
      coordinateMap.set(session.session_id, [round(session.lon, 4), round(session.lat, 4)]);
    } else {
      // Multiple points at same location - scatter them randomly but deterministically
      const [latStr, lonStr] = key.split(",");
      const baseLat = parseFloat(latStr);
      const baseLon = parseFloat(lonStr);

      group.forEach(session => {
        // Use session_id as seed for deterministic but random-looking positions
        const seed = hashStringToNumber(session.session_id);

        // Generate two random values for x and y offsets
        const random1 = seededRandom(seed);
        const random2 = seededRandom(seed + 1);

        // Convert to angle and radius for more natural scatter
        const angle = random1 * 2 * Math.PI;
        const radius = Math.sqrt(random2) * spreadRadius; // sqrt for uniform distribution

        // Adjust longitude offset to account for latitude compression (makes it circular instead of oval)
        // At higher latitudes, degrees of longitude represent less distance than degrees of latitude
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

/**
 * Toggle visibility of cluster layers
 */
export function setClusterLayersVisibility(mapInstance: mapboxgl.Map, visible: boolean): void {
  const visibility = visible ? "visible" : "none";

  if (mapInstance.getLayer(CLUSTER_LAYER_ID)) {
    mapInstance.setLayoutProperty(CLUSTER_LAYER_ID, "visibility", visibility);
  }
  if (mapInstance.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    mapInstance.setLayoutProperty(CLUSTER_COUNT_LAYER_ID, "visibility", visibility);
  }
}

/**
 * Update the GeoJSON data source with active sessions
 */
export function updateGeoJSONData(
  mapInstance: mapboxgl.Map,
  activeSessions: GetSessionsResponse,
  spreadStartZoom: number
): void {
  const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (!source) return;

  const zoom = mapInstance.getZoom();
  const spreadCoordinates = spreadOverlappingPoints(activeSessions, zoom, spreadStartZoom);

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: activeSessions
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
}
