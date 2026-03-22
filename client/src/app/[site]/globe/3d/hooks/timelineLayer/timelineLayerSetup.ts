import mapboxgl from "mapbox-gl";
import {
  SOURCE_ID,
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  UNCLUSTERED_LAYER_ID,
} from "./timelineLayerConstants";
import { MIN_CLUSTER_SIZE } from "../../../utils/clusteringConstants";

/**
 * Create and configure the popup for session tooltips
 */
export function createTooltipPopup(): mapboxgl.Popup {
  return new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "globe-tooltip",
    anchor: "top-left",
    offset: [-30, -30],
  });
}

/**
 * Add all cluster layers to the map (circles, labels, unclustered points)
 */
export function addClusterLayers(mapInstance: mapboxgl.Map): void {
  // Add cluster circle layer
  mapInstance.addLayer({
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
  mapInstance.addLayer({
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

  // Add unclustered point layer (hidden, used for querying)
  mapInstance.addLayer({
    id: UNCLUSTERED_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 0,
      "circle-opacity": 0,
    },
  });
}

/**
 * Disable all transitions on cluster layers for instant appearance/disappearance
 */
export function disableClusterTransitions(mapInstance: mapboxgl.Map): void {
  mapInstance.setPaintProperty(CLUSTER_LAYER_ID, "circle-opacity-transition", { duration: 0 });
  mapInstance.setPaintProperty(CLUSTER_LAYER_ID, "circle-radius-transition", { duration: 0 });
  mapInstance.setPaintProperty(CLUSTER_LAYER_ID, "circle-color-transition", { duration: 0 });
  mapInstance.setPaintProperty(CLUSTER_COUNT_LAYER_ID, "text-opacity-transition", { duration: 0 });
}

/**
 * Setup cursor change on cluster hover
 */
export function setupClusterHoverHandlers(mapInstance: mapboxgl.Map, layerId: string): () => void {
  const handleClusterMouseEnter = () => {
    mapInstance.getCanvas().style.cursor = "pointer";
  };

  const handleClusterMouseLeave = () => {
    mapInstance.getCanvas().style.cursor = "";
  };

  mapInstance.on("mouseenter", layerId, handleClusterMouseEnter);
  mapInstance.on("mouseleave", layerId, handleClusterMouseLeave);

  return () => {
    mapInstance.off("mouseenter", layerId, handleClusterMouseEnter);
    mapInstance.off("mouseleave", layerId, handleClusterMouseLeave);
  };
}
