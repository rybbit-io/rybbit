import {
  CLUSTER_MAX_ZOOM,
  MIN_CLUSTER_SIZE,
  CLUSTERING_THRESHOLD,
  SPREAD_START_ZOOM,
  SPREAD_RADIUS_DEGREES,
} from "../../../utils/clusteringConstants";

// Re-export shared constants
export { CLUSTER_MAX_ZOOM, MIN_CLUSTER_SIZE, CLUSTERING_THRESHOLD, SPREAD_START_ZOOM, SPREAD_RADIUS_DEGREES };

// Mapbox layer and source IDs
export const SOURCE_ID = "timeline-sessions";
export const CLUSTER_LAYER_ID = "timeline-clusters";
export const CLUSTER_COUNT_LAYER_ID = "timeline-cluster-count";
export const UNCLUSTERED_LAYER_ID = "timeline-unclustered-point";

// Radius in pixels within which points are grouped into clusters (Mapbox-specific)
export const CLUSTER_RADIUS = 25;

export const PAGE_SIZE = 10000;
export const MAX_PAGES = 10;
