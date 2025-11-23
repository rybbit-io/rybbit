import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { MapView } from "../../components/ModeSelector";

export function useLayerVisibility(
  map: React.RefObject<mapboxgl.Map | null>,
  mapView: MapView,
  mapLoaded: boolean
) {
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (map.current.getLayer("countries-fill")) {
      map.current.setLayoutProperty(
        "countries-fill",
        "visibility",
        mapView === "countries" ? "visible" : "none"
      );
    }
    if (map.current.getLayer("countries-outline")) {
      map.current.setLayoutProperty(
        "countries-outline",
        "visibility",
        mapView === "countries" ? "visible" : "none"
      );
    }
    if (map.current.getLayer("subdivisions-fill")) {
      map.current.setLayoutProperty(
        "subdivisions-fill",
        "visibility",
        mapView === "subdivisions" ? "visible" : "none"
      );
    }
    if (map.current.getLayer("subdivisions-outline")) {
      map.current.setLayoutProperty(
        "subdivisions-outline",
        "visibility",
        mapView === "subdivisions" ? "visible" : "none"
      );
    }
    if (map.current.getLayer("realtime-coordinates-layer")) {
      map.current.setLayoutProperty(
        "realtime-coordinates-layer",
        "visibility",
        mapView === "coordinates" ? "visible" : "none"
      );
    }
    // Note: Timeline view uses HTML markers instead of layers, visibility is handled in useTimelineLayer
  }, [mapView, mapLoaded, map]);
}
