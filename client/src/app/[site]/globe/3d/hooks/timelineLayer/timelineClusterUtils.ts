import mapboxgl from "mapbox-gl";
import { isNil, round } from "lodash";
import type { GetSessionsResponse } from "../../../../../../api/analytics/endpoints";
import { SOURCE_ID, MIN_CLUSTER_SIZE } from "./timelineLayerConstants";
import { spreadOverlappingPoints } from "./timelineLayerManager";

/**
 * Query and expand features from the map, including expanding small clusters
 * to their individual constituent points.
 */
export async function getUnclusteredFeatures(
  mapInstance: mapboxgl.Map,
  shouldShowClusters: boolean,
  activeSessions: GetSessionsResponse,
  spreadStartZoom: number
): Promise<any[]> {
  const zoom = mapInstance.getZoom();
  const spreadCoordinates = spreadOverlappingPoints(activeSessions, zoom, spreadStartZoom);

  if (!shouldShowClusters) {
    // When clustering is disabled, show all sessions as individual markers with spreading
    return activeSessions
      .filter(s => !isNil(s.lat) && !isNil(s.lon))
      .map(session => {
        const coords = spreadCoordinates.get(session.session_id) || [round(session.lon, 4), round(session.lat, 4)];
        return {
          properties: session,
          geometry: {
            type: "Point" as const,
            coordinates: coords,
          },
        };
      });
  }

  // When clustering is enabled, show unclustered points and expand small clusters
  const features = mapInstance.querySourceFeatures(SOURCE_ID, {
    sourceLayer: undefined,
  });

  const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
  const unclusteredFeatures: any[] = [];
  const promises: Promise<void>[] = [];

  features.forEach(f => {
    if (!f.properties) return;

    if (!f.properties.cluster) {
      // Regular unclustered point
      unclusteredFeatures.push(f);
    } else if (f.properties.point_count && f.properties.point_count < MIN_CLUSTER_SIZE) {
      // Small cluster - expand it to get individual points
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
    // Clusters with >= MIN_CLUSTER_SIZE points are shown as cluster circles, ignore them here
  });

  // Wait for all cluster expansions to complete
  await Promise.all(promises);

  return unclusteredFeatures;
}

/**
 * Initialize Mapbox source with clustering configuration
 */
export function initializeClusterSource(mapInstance: mapboxgl.Map, clusterMaxZoom: number, clusterRadius: number) {
  mapInstance.addSource(SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
    cluster: true,
    clusterMaxZoom,
    clusterRadius,
  });
}

/**
 * Setup cluster expansion zoom behavior on click
 */
export function setupClusterClickHandler(mapInstance: mapboxgl.Map, layerId: string): () => void {
  const handleClusterClick = (e: mapboxgl.MapMouseEvent) => {
    const features = mapInstance.queryRenderedFeatures(e.point, {
      layers: [layerId],
    });

    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || !zoom) return;

      const coordinates = (features[0].geometry as any).coordinates;
      mapInstance.easeTo({
        center: coordinates,
        zoom: zoom,
        duration: 500,
      });
    });
  };

  mapInstance.on("click", layerId, handleClusterClick);

  return () => {
    mapInstance.off("click", layerId, handleClusterClick);
  };
}
