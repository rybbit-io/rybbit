/**
 * Shared clustering constants for both 2D and 3D globe maps
 */

// Clustering configuration
// Maximum zoom level where clustering is applied. Beyond this zoom, all points are shown individually
export const CLUSTER_MAX_ZOOM = 11;

// Minimum number of points required to form a visible cluster
export const MIN_CLUSTER_SIZE = 20;

// Only enable clustering when total session count exceeds this threshold (performance optimization)
export const CLUSTERING_THRESHOLD = 500;

// Point spreading configuration (for overlapping coordinates)
// Zoom level at which points at the same location start spreading apart
export const SPREAD_START_ZOOM = 8;

// Maximum offset in degrees to apply when spreading points (roughly 11 meters at equator)
export const SPREAD_RADIUS_DEGREES = 0.006;
