import mapboxgl from "mapbox-gl";
import { useEffect } from "react";
import { useGlobeStore } from "../../globeStore";
import { CityPoint, citySizeMultiplier } from "../../utils/mapTypes";
import { ONLINE_HALO_LAYER_ID } from "./useOnlineLayer";

const SOURCE_ID = "cities";
const LAYER_ID = "cities-layer";

// Radius grows with the square root of the count and with the zoom level.
const radiusExpression = (topSize: number, sizeMultiplier: number): mapboxgl.ExpressionSpecification => {
  const atZoom = (min: number, max: number): mapboxgl.ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["sqrt", ["max", ["get", "size"], 1]],
    1,
    min * sizeMultiplier,
    Math.max(topSize, 1.0001),
    max * sizeMultiplier,
  ];
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    0,
    atZoom(1, 5),
    5,
    atZoom(3, 10),
    10,
    atZoom(7, 20),
    15,
    atZoom(15, 40),
  ];
};

/**
 * Cities as circles on the globe, sized by their sessions (or the chosen
 * count) and filled on the map's colour scale. Hover and selection go to the
 * globe store.
 */
export function useCitiesLayer({
  map,
  mapLoaded,
  enabled,
  points,
  strokeColor,
  selectedKey,
}: {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  enabled: boolean;
  points: CityPoint[];
  strokeColor: string;
  selectedKey: string | null;
}) {
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded) return;
    if (mapInstance.getLayer(LAYER_ID)) {
      mapInstance.setLayoutProperty(LAYER_ID, "visibility", enabled ? "visible" : "none");
    }
  }, [map, mapLoaded, enabled]);

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded || !enabled) return;

    const topSize = Math.sqrt(points.reduce((max, point) => Math.max(max, point.size), 0) || 1);
    const radius = radiusExpression(topSize, citySizeMultiplier(points.length));

    const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: points.map(point => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lon, point.lat] },
        properties: { key: point.key, size: point.size, fill: point.fill },
      })),
    };

    if (mapInstance.getSource(SOURCE_ID)) {
      (mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(data);
      mapInstance.setPaintProperty(LAYER_ID, "circle-radius", radius);
    } else {
      mapInstance.addSource(SOURCE_ID, { type: "geojson", data });
      mapInstance.addLayer(
        {
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": radius,
            "circle-color": ["get", "fill"],
            "circle-stroke-width": 1,
            "circle-stroke-color": strokeColor,
          },
        },
        // Under the online-now dots when they are already on the map.
        mapInstance.getLayer(ONLINE_HALO_LAYER_ID) ? ONLINE_HALO_LAYER_ID : undefined
      );
    }

    const { setHover, toggleSelected } = useGlobeStore.getState();

    const setCursor = (cursor: string) => {
      const canvas = mapInstance.getCanvas() as HTMLCanvasElement | undefined;
      if (canvas) {
        canvas.style.cursor = cursor;
      }
    };

    const handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
      const key = e.features?.[0]?.properties?.key as string | undefined;
      if (!key) return;
      setCursor("pointer");
      const container = mapInstance.getContainer();
      setHover({ key, x: e.point.x, y: e.point.y, width: container.clientWidth, height: container.clientHeight });
    };

    const handleMouseLeave = () => {
      setCursor("");
      setHover(null);
    };

    const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const key = e.features?.[0]?.properties?.key as string | undefined;
      if (key) toggleSelected(key);
    };

    mapInstance.on("mousemove", LAYER_ID, handleMouseMove);
    mapInstance.on("mouseleave", LAYER_ID, handleMouseLeave);
    mapInstance.on("click", LAYER_ID, handleClick);

    return () => {
      mapInstance.off("mousemove", LAYER_ID, handleMouseMove);
      mapInstance.off("mouseleave", LAYER_ID, handleMouseLeave);
      mapInstance.off("click", LAYER_ID, handleClick);
      handleMouseLeave();
    };
  }, [map, mapLoaded, enabled, points, strokeColor]);

  // The selected city gets a white ring.
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded || !mapInstance.getLayer(LAYER_ID)) return;
    const isSelected: mapboxgl.ExpressionSpecification = ["==", ["get", "key"], selectedKey ?? ""];
    mapInstance.setPaintProperty(LAYER_ID, "circle-stroke-color", ["case", isSelected, "#ffffff", strokeColor]);
    mapInstance.setPaintProperty(LAYER_ID, "circle-stroke-width", ["case", isSelected, 2, 1]);
  }, [map, mapLoaded, enabled, points, strokeColor, selectedKey]);
}
