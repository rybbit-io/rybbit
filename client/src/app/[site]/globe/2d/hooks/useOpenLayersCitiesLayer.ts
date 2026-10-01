import Feature, { FeatureLike } from "ol/Feature";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import Map from "ol/Map";
import { unByKey } from "ol/Observable";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
import { RefObject, useEffect, useRef } from "react";
import { useGlobeStore } from "../../globeStore";
import { CityPoint, citySizeMultiplier } from "../../utils/mapTypes";

interface CitiesLayerProps {
  mapInstanceRef: RefObject<Map | null>;
  enabled: boolean;
  points: CityPoint[];
  strokeColor: string;
  selectedKey: string | null;
}

const SELECTED_STROKE = "#ffffff";

/**
 * Cities as circles, sized by their sessions (or the chosen count) and filled
 * on the map's colour scale. Hover and selection go to the globe store.
 */
export function useOpenLayersCitiesLayer({
  mapInstanceRef,
  enabled,
  points,
  strokeColor,
  selectedKey,
}: CitiesLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const stateRef = useRef({ strokeColor, selectedKey, hoveredKey: null as string | null });

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !enabled) return;

    const state = stateRef.current;
    const topSize = Math.sqrt(points.reduce((max, point) => Math.max(max, point.size), 0) || 1);
    const sizeMultiplier = citySizeMultiplier(points.length);

    // Radius grows with the square root of the count, and doubles every four zoom levels.
    const radiusFor = (size: number, zoom: number): number => {
      const normalized = Math.max(0, Math.min(1, (Math.sqrt(Math.max(size, 1)) - 1) / Math.max(topSize - 1, 1)));
      const zoomFactor = Math.pow(2, zoom / 4);
      const minRadius = 1 * zoomFactor * sizeMultiplier;
      const maxRadius = 4 * zoomFactor * sizeMultiplier;
      return minRadius + normalized * (maxRadius - minRadius);
    };

    const layer = new VectorLayer({
      source: new VectorSource({
        features: points.map(point => {
          const feature = new Feature({ geometry: new Point(fromLonLat([point.lon, point.lat])) });
          feature.setProperties({ key: point.key, size: point.size, fill: point.fill, hoverFill: point.hoverFill });
          return feature;
        }),
      }),
      style: (feature: FeatureLike) => {
        const key = feature.get("key") as string;
        const selected = key === state.selectedKey;
        return new Style({
          image: new Circle({
            radius: radiusFor(feature.get("size"), map.getView().getZoom() ?? 2),
            fill: new Fill({ color: key === state.hoveredKey ? feature.get("hoverFill") : feature.get("fill") }),
            stroke: new Stroke({
              color: selected ? SELECTED_STROKE : state.strokeColor,
              width: selected ? 2 : 1,
            }),
          }),
          zIndex: selected ? 1 : 0,
        });
      },
    });
    layerRef.current = layer;
    map.addLayer(layer);

    const { setHover, toggleSelected } = useGlobeStore.getState();
    const keyAt = (event: MapBrowserEvent): string | null => {
      const feature = map.forEachFeatureAtPixel(event.pixel, found => found, {
        layerFilter: candidate => candidate === layer,
      });
      return feature ? (feature.get("key") as string) : null;
    };

    const setHovered = (key: string | null) => {
      if (key === state.hoveredKey) return;
      state.hoveredKey = key;
      layer.changed();
      map.getTargetElement().style.cursor = key ? "pointer" : "";
    };

    const handlePointerMove = (event: MapBrowserEvent) => {
      if (event.dragging) return;
      const key = keyAt(event);
      setHovered(key);
      const [width, height] = map.getSize() ?? [0, 0];
      setHover(key ? { key, x: event.pixel[0], y: event.pixel[1], width, height } : null);
    };

    const handleClick = (event: MapBrowserEvent) => {
      toggleSelected(keyAt(event));
    };

    const handlePointerLeave = () => {
      setHovered(null);
      setHover(null);
    };

    // Circle sizes depend on the zoom level.
    const handleMoveEnd = () => layer.changed();

    const keys = [
      map.on("pointermove", handlePointerMove),
      map.on("click", handleClick),
      map.on("moveend", handleMoveEnd),
    ];
    const viewport = map.getViewport();
    viewport.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      unByKey(keys);
      viewport.removeEventListener("pointerleave", handlePointerLeave);
      handlePointerLeave();
      map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [mapInstanceRef, enabled, points]);

  useEffect(() => {
    Object.assign(stateRef.current, { strokeColor, selectedKey });
    layerRef.current?.changed();
  }, [strokeColor, selectedKey]);
}
