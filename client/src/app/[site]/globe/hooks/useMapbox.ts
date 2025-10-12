import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

export function useMapbox(containerRef: React.RefObject<HTMLDivElement | null>) {
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: containerRef.current,
      // style: "mapbox://styles/mapbox/standard",
      style: "mapbox://styles/mapbox/dark-v11",
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

      // Customize land color
      // map.current.setPaintProperty("land", "background-color", "#1a365d"); // dark blue

      // Customize water/ocean color
      map.current.setPaintProperty("water", "fill-color", "#0a1929"); // darker blue

      map.current.setFog({
        color: "rgb(61, 76, 89)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.0,
        "space-color": "rgb(12, 12, 16)",
        "star-intensity": 0.6,
      });

      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [containerRef]);

  return { map, mapLoaded };
}
