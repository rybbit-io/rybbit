import mapboxgl from "mapbox-gl";
import { useEffect } from "react";
import { useGlobeStore } from "../../globeStore";
import type { PlaceFill } from "../../utils/mapTypes";
import { ONLINE_HALO_LAYER_ID } from "./useOnlineLayer";

interface ChoroplethLayerProps {
  map: React.RefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  /** Source and layer id prefix: "countries" or "subdivisions". */
  id: string;
  /** The level's outlines as GeoJSON; null until loaded. */
  geoData: object | null;
  /** The feature property holding the place key: "ISO_A2" or "iso_3166_2". */
  codeProperty: string;
  /** Only the breakdown's own layer is built, drawn and listening. */
  enabled: boolean;
  places: Map<string, PlaceFill>;
  selectedKey: string | null;
}

const NO_DATA_FILL = "rgba(0, 0, 0, 0)";

/**
 * A filled-outline layer for countries or regions on the globe. Hover and
 * selection are reported to the globe store; the page draws the card.
 */
export function useChoroplethLayer({
  map,
  mapLoaded,
  id,
  geoData,
  codeProperty,
  enabled,
  places,
  selectedKey,
}: ChoroplethLayerProps) {
  const fillLayer = `${id}-fill`;
  const outlineLayer = `${id}-outline`;
  const selectedLayer = `${id}-selected`;

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded) return;

    for (const layerId of [fillLayer, outlineLayer, selectedLayer]) {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.setLayoutProperty(layerId, "visibility", enabled ? "visible" : "none");
      }
    }
  }, [map, mapLoaded, enabled, fillLayer, outlineLayer, selectedLayer]);

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !geoData || !mapLoaded || !enabled) return;

    const geoDataCopy = JSON.parse(JSON.stringify(geoData));
    geoDataCopy.features.forEach((feature: any) => {
      const place = places.get(feature.properties?.[codeProperty]);
      feature.properties.fillColor = place ? place.fill : NO_DATA_FILL;
      feature.properties.hasData = !!place;
    });

    if (mapInstance.getSource(id)) {
      (mapInstance.getSource(id) as mapboxgl.GeoJSONSource).setData(geoDataCopy);
    } else {
      // Under the online-now dots when they are already on the map.
      const beforeId = mapInstance.getLayer(ONLINE_HALO_LAYER_ID) ? ONLINE_HALO_LAYER_ID : undefined;

      mapInstance.addSource(id, { type: "geojson", data: geoDataCopy });

      mapInstance.addLayer(
        {
          id: fillLayer,
          type: "fill",
          source: id,
          paint: {
            "fill-color": ["get", "fillColor"],
            "fill-opacity": 0.6,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: outlineLayer,
          type: "line",
          source: id,
          paint: {
            "line-color": "#ffffff",
            "line-width": 0.5,
            "line-opacity": 0.2,
          },
        },
        beforeId
      );

      mapInstance.addLayer(
        {
          id: selectedLayer,
          type: "line",
          source: id,
          filter: ["==", ["get", codeProperty], ""],
          paint: {
            "line-color": "#ffffff",
            "line-width": 1.5,
          },
        },
        beforeId
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
      const feature = e.features?.[0];
      const code = feature?.properties?.hasData ? (feature.properties[codeProperty] as string) : null;
      setCursor(code ? "pointer" : "");

      const container = mapInstance.getContainer();
      setHover(
        code
          ? { key: code, x: e.point.x, y: e.point.y, width: container.clientWidth, height: container.clientHeight }
          : null
      );
    };

    const handleMouseLeave = () => {
      setCursor("");
      setHover(null);
    };

    const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      toggleSelected(feature?.properties?.hasData ? (feature.properties[codeProperty] as string) : null);
    };

    mapInstance.on("mousemove", fillLayer, handleMouseMove);
    mapInstance.on("mouseleave", fillLayer, handleMouseLeave);
    mapInstance.on("click", fillLayer, handleClick);

    return () => {
      mapInstance.off("mousemove", fillLayer, handleMouseMove);
      mapInstance.off("mouseleave", fillLayer, handleMouseLeave);
      mapInstance.off("click", fillLayer, handleClick);
      handleMouseLeave();
    };
  }, [map, mapLoaded, enabled, geoData, places, id, codeProperty, fillLayer, outlineLayer, selectedLayer]);

  // The selection ring is a filter on its own layer, so selecting does not rebuild the source.
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded || !mapInstance.getLayer(selectedLayer)) return;
    mapInstance.setFilter(selectedLayer, ["==", ["get", codeProperty], selectedKey ?? ""]);
  }, [map, mapLoaded, enabled, geoData, places, selectedKey, selectedLayer, codeProperty]);
}
