import Feature, { FeatureLike } from "ol/Feature";
import Map from "ol/Map";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { RefObject, useEffect } from "react";
import type { MapTone } from "../../utils/mapStyles";
import { ONLINE_HALO_WIDTH, onlineDotRadius, onlineDotStyle, OnlinePoint } from "../../utils/mapTypes";

interface OnlineLayerProps {
  mapInstanceRef: RefObject<Map | null>;
  enabled: boolean;
  points: OnlinePoint[];
  tone: MapTone;
}

/**
 * Visitors online now: a dot with a soft ring per location, sized by how many
 * sessions are there. Drawn above the breakdown and not interactive, so the
 * place underneath stays hoverable.
 */
export function useOpenLayersOnlineLayer({ mapInstanceRef, enabled, points, tone }: OnlineLayerProps) {
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !enabled || points.length === 0) return;

    const dot = onlineDotStyle(tone);
    const layer = new VectorLayer({
      source: new VectorSource({
        features: points.map(point => {
          const feature = new Feature({ geometry: new Point(fromLonLat([point.lon, point.lat])) });
          feature.set("count", point.count);
          return feature;
        }),
      }),
      style: (feature: FeatureLike) => {
        const radius = onlineDotRadius(feature.get("count"));
        return [
          new Style({
            image: new Circle({
              radius: radius + ONLINE_HALO_WIDTH,
              fill: new Fill({ color: dot.haloFill }),
              stroke: new Stroke({ color: dot.haloStroke, width: 0.75 }),
            }),
          }),
          new Style({
            image: new Circle({
              radius,
              fill: new Fill({ color: dot.fill }),
              stroke: new Stroke({ color: dot.stroke, width: 0.75 }),
            }),
          }),
        ];
      },
      zIndex: 50,
    });
    map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
    };
  }, [mapInstanceRef, enabled, points, tone]);
}
