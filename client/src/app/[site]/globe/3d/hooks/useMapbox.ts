import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useConfigs } from "../../../../../lib/configs";
import { useGlobeStore } from "../../globeStore";

export function useMapbox(containerRef: React.RefObject<HTMLDivElement | null>, enabled: boolean = true) {
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { configs } = useConfigs();
  const { mapStyle } = useGlobeStore();

  // Function to apply custom styling (fog, water color, etc.)
  const applyCustomStyling = (mapInstance: mapboxgl.Map) => {
    // Customize water/ocean color if the layer exists
    try {
      if (mapInstance.getLayer("water")) {
        mapInstance.setPaintProperty("water", "fill-color", "#0a1929");
      }
    } catch (error) {
      console.warn("Could not set water color:", error);
    }

    // Set fog for starry background
    try {
      mapInstance.setFog({
        color: "rgb(61, 76, 89)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.01,
        "space-color": "rgb(12, 12, 16)",
        "star-intensity": 0.6,
      });
    } catch (error) {
      console.warn("Could not set fog:", error);
    }
  };

  useEffect(() => {
    if (!enabled || !containerRef.current || !configs?.mapboxToken) {
      // Clean up if disabled or no container
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
      return;
    }

    // Don't reinitialize if already exists
    if (map.current) {
      return;
    }

    mapboxgl.accessToken = configs.mapboxToken;

    map.current = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      projection: { name: "globe" },
      zoom: 1.5,
      center: [0, 20],
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
    });

    map.current.on("style.load", () => {
      if (!map.current) return;
      applyCustomStyling(map.current);
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [enabled, containerRef, configs?.mapboxToken]);

  // Handle style changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    const handleStyleLoad = () => {
      // Wait for map to be idle (fully rendered) before applying custom styling
      mapInstance.once("idle", () => {
        applyCustomStyling(mapInstance);
        // Re-enable mapLoaded so other layers can re-add themselves
        setMapLoaded(true);
      });
    };

    // Set mapLoaded to false to trigger other layers to clean up
    setMapLoaded(false);

    mapInstance.once("style.load", handleStyleLoad);
    mapInstance.setStyle(mapStyle);

    // Cleanup function
    return () => {
      mapInstance.off("style.load", handleStyleLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]); // Only depend on mapStyle, not mapLoaded

  return { map, mapLoaded };
}
