import type MapBrowserEvent from "ol/MapBrowserEvent";
import Map from "ol/Map";
import { unByKey } from "ol/Observable";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import { RefObject, useEffect, useRef } from "react";
import { useGlobeStore } from "../../globeStore";
import type { PlaceFill } from "../../utils/mapTypes";

interface ChoroplethLayerProps {
  mapInstanceRef: RefObject<Map | null>;
  /** The level's outlines as GeoJSON; null until loaded. */
  geoData: object | null;
  /** The feature property holding the place key: "ISO_A2" or "iso_3166_2". */
  codeProperty: string;
  /** Only the breakdown's own layer is built, drawn and listening. */
  enabled: boolean;
  places: globalThis.Map<string, PlaceFill>;
  strokeColor: string;
  selectedKey: string | null;
}

const SELECTED_STROKE = "#ffffff";

/**
 * A filled-outline layer for countries or regions. Places without data are
 * not drawn at all, so the basemap shows through and they cannot be hovered.
 * Hover and selection are reported to the globe store; the page draws the card.
 */
export function useOpenLayersChoroplethLayer({
  mapInstanceRef,
  geoData,
  codeProperty,
  enabled,
  places,
  strokeColor,
  selectedKey,
}: ChoroplethLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  // Read by the style function and the pointer handlers, which outlive a render.
  const stateRef = useRef({ places, strokeColor, selectedKey, hoveredKey: null as string | null });

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoData || !enabled) return;

    const state = stateRef.current;
    const layer = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures(geoData, { featureProjection: "EPSG:3857" }),
      }),
      style: feature => {
        const code = feature.get(codeProperty) as string;
        const place = state.places.get(code);
        if (!place) return undefined;

        const selected = code === state.selectedKey;
        return new Style({
          fill: new Fill({ color: code === state.hoveredKey ? place.hoverFill : place.fill }),
          stroke: new Stroke({
            color: selected ? SELECTED_STROKE : state.strokeColor,
            width: selected ? 1.5 : 0.5,
          }),
          zIndex: selected ? 1 : 0,
        });
      },
    });
    layerRef.current = layer;
    map.addLayer(layer);

    const { setHover, toggleSelected } = useGlobeStore.getState();
    const codeAt = (event: MapBrowserEvent): string | null => {
      const feature = map.forEachFeatureAtPixel(event.pixel, found => found, {
        layerFilter: candidate => candidate === layer,
      });
      return feature ? (feature.get(codeProperty) as string) : null;
    };

    const setHovered = (code: string | null) => {
      if (code === state.hoveredKey) return;
      state.hoveredKey = code;
      layer.changed();
      map.getTargetElement().style.cursor = code ? "pointer" : "";
    };

    const handlePointerMove = (event: MapBrowserEvent) => {
      if (event.dragging) return;
      const code = codeAt(event);
      setHovered(code);
      const [width, height] = map.getSize() ?? [0, 0];
      setHover(code ? { key: code, x: event.pixel[0], y: event.pixel[1], width, height } : null);
    };

    const handleClick = (event: MapBrowserEvent) => {
      // A click on empty map clears the selection.
      toggleSelected(codeAt(event));
    };

    const handlePointerLeave = () => {
      setHovered(null);
      setHover(null);
    };

    const keys = [map.on("pointermove", handlePointerMove), map.on("click", handleClick)];
    const viewport = map.getViewport();
    viewport.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      unByKey(keys);
      viewport.removeEventListener("pointerleave", handlePointerLeave);
      handlePointerLeave();
      map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [mapInstanceRef, geoData, codeProperty, enabled]);

  // New figures, colours or selection restyle the existing features in place.
  useEffect(() => {
    Object.assign(stateRef.current, { places, strokeColor, selectedKey });
    layerRef.current?.changed();
  }, [places, strokeColor, selectedKey]);
}
