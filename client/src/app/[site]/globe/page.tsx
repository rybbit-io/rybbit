"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import "./globe.css";
import { useMemo, useRef } from "react";

import { useSingleCol } from "@/api/analytics/useSingleCol";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useCountries, useSubdivisions } from "../../../lib/geo";
import { SubHeader } from "../components/SubHeader/SubHeader";
import MapViewSelector from "./components/ModeSelector";
import { useMapbox } from "./hooks/useMapbox";
import { useCountriesLayer } from "./hooks/useCountriesLayer";
import { useSubdivisionsLayer } from "./hooks/useSubdivisionsLayer";
import { useLayerVisibility } from "./hooks/useLayerVisibility";
import { useCoordinatesLayer } from "./hooks/useCoordinatesLayer";
import { createColorScale } from "./utils/colorScale";
import { processCountryData, processSubdivisionData } from "./utils/processData";
import { useGetSessionLocations } from "../../../api/analytics/useGetSessionLocations";
import { GlobeSessions } from "./components/GlobeSessions";
import { useGlobeStore } from "./globeStore";

export default function GlobePage() {
  useSetPageTitle("Rybbit · Globe");
  const mapContainer = useRef<HTMLDivElement>(null);

  const mapView = useGlobeStore(state => state.mapView);

  const { data: countryData } = useSingleCol({ parameter: "country" });
  const { data: subdivisionData } = useSingleCol({ parameter: "region", limit: 10000 });
  const { data: liveSessionLocations } = useGetSessionLocations();

  const { data: countriesGeoData } = useCountries();
  const { data: subdivisionsGeoData } = useSubdivisions();

  const processedCountryData = useMemo(() => processCountryData(countryData), [countryData]);
  const processedSubdivisionData = useMemo(() => processSubdivisionData(subdivisionData), [subdivisionData]);

  const colorScale = useMemo(() => {
    const dataToUse = mapView === "countries" ? processedCountryData : processedSubdivisionData;
    return createColorScale(dataToUse);
  }, [processedCountryData, processedSubdivisionData, mapView]);

  const { map, mapLoaded } = useMapbox(mapContainer);

  useCountriesLayer({
    map,
    countriesGeoData,
    processedCountryData,
    colorScale,
    countryData,
    mapLoaded,
    mapView,
  });

  useSubdivisionsLayer({
    map,
    subdivisionsGeoData,
    processedSubdivisionData,
    colorScale,
    subdivisionData,
    mapLoaded,
    mapView,
  });

  useCoordinatesLayer({
    map,
    liveSessionLocations,
    mapLoaded,
    minutes: 30,
    mapView,
  });

  useLayerVisibility(map, mapView, mapLoaded);

  return (
    <DisabledOverlay message="Globe" featurePath="globe">
      <div className="relative w-full h-dvh">
        <div className="p-2 md:p-4 relative z-50">
          <SubHeader />
        </div>
        <div className="absolute top-0 left-0 right-0 bottom-0 z-10">
          <div
            ref={mapContainer}
            className="w-full h-full [&_.mapboxgl-ctrl-bottom-left]:!hidden [&_.mapboxgl-ctrl-logo]:!hidden"
          />
          <div className="absolute bottom-0 left-4 z-99999">
            <MapViewSelector />
          </div>
          <div className="absolute bottom-[60px] left-4 z-99999">
            <GlobeSessions />
          </div>
        </div>
      </div>
    </DisabledOverlay>
  );
}
