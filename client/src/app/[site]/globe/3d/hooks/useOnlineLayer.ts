import mapboxgl from "mapbox-gl";
import { useEffect } from "react";
import type { MapTone } from "../../utils/mapStyles";
import { ONLINE_HALO_WIDTH, onlineDotStyle, OnlinePoint } from "../../utils/mapTypes";
import { CLUSTER_LAYER_ID } from "./timelineLayer/timelineLayerConstants";

const SOURCE_ID = "online-now";
export const ONLINE_HALO_LAYER_ID = "online-now-halo";
const DOT_LAYER_ID = "online-now-dot";

// The same size rule as onlineDotRadius (utils/mapTypes), as a style expression.
const DOT_RADIUS: mapboxgl.ExpressionSpecification = ["+", 2, ["*", 1.25, ["sqrt", ["max", ["get", "count"], 1]]]];

/**
 * Visitors online now on the globe: a dot with a soft ring per location, sized
 * by how many sessions are there. Above the breakdown, below session clusters,
 * and not interactive.
 */
export function useOnlineLayer({
  map,
  mapLoaded,
  enabled,
  points,
  tone,
}: {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  enabled: boolean;
  points: OnlinePoint[];
  tone: MapTone;
}) {
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded) return;

    const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: (enabled ? points : []).map(point => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lon, point.lat] },
        properties: { count: point.count },
      })),
    };

    const source = mapInstance.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    // A new basemap style reloads every layer, so the tone is settled when these are added.
    const dot = onlineDotStyle(tone);
    const beforeId = mapInstance.getLayer(CLUSTER_LAYER_ID) ? CLUSTER_LAYER_ID : undefined;
    mapInstance.addSource(SOURCE_ID, { type: "geojson", data });
    mapInstance.addLayer(
      {
        id: ONLINE_HALO_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["+", DOT_RADIUS, ONLINE_HALO_WIDTH],
          "circle-color": dot.haloFill,
          "circle-stroke-color": dot.haloStroke,
          "circle-stroke-width": 0.75,
        },
      },
      beforeId
    );
    mapInstance.addLayer(
      {
        id: DOT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": DOT_RADIUS,
          "circle-color": dot.fill,
          "circle-stroke-color": dot.stroke,
          "circle-stroke-width": 0.75,
        },
      },
      beforeId
    );
  }, [map, mapLoaded, enabled, points, tone]);
}
