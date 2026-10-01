"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useState } from "react";
import "./globe.css";

import type { GetSessionsResponse } from "../../../api/analytics/endpoints";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useConfigs } from "../../../lib/configs";
import { useCountries, useSubdivisions } from "../../../lib/geo";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { OpenLayersMap } from "./2d/components/OpenLayersMap";
import { MapboxMap } from "./3d/components/MapboxMap";
import { useTimelineLayer } from "./3d/hooks/timelineLayer/useTimelineLayer";
import { useChoroplethLayer } from "./3d/hooks/useChoroplethLayer";
import { useCitiesLayer } from "./3d/hooks/useCitiesLayer";
import { useMapbox } from "./3d/hooks/useMapbox";
import { useOnlineLayer } from "./3d/hooks/useOnlineLayer";
import { GlobeRail } from "./components/GlobeRail";
import { GlobeStatBand } from "./components/GlobeStatBand";
import { GlobeToolbar } from "./components/GlobeToolbar";
import { MapControls } from "./components/MapControls";
import { MapLegend } from "./components/MapLegend";
import { PlaceCard } from "./components/PlaceCard";
import { ReplayBar } from "./components/ReplayBar";
import { SessionPanel } from "./components/SessionPanel";
import { useGlobeStore, useMapStyle } from "./globeStore";
import { useGlobeData } from "./hooks/useGlobeData";
import { useGlobeReplay } from "./hooks/useGlobeReplay";
import { useOnlineLocations } from "./hooks/useOnlineLocations";
import { placeCountryCode } from "./utils/places";

// How far the hover card sits from the pointer.
const HOVER_OFFSET = 14;

export default function GlobePage() {
  useSetPageTitle("Globe");
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapArea = useRef<HTMLDivElement>(null);
  const [selectedSession, setSelectedSession] = useState<GetSessionsResponse[number] | null>(null);

  const breakdown = useGlobeStore(state => state.breakdown);
  const mapMode = useGlobeStore(state => state.mapMode);
  const showOnline = useGlobeStore(state => state.showOnline);
  const hover = useGlobeStore(state => state.hover);
  const selectedKey = useGlobeStore(state => state.selectedKey);
  const toggleSelected = useGlobeStore(state => state.toggleSelected);
  const mapStyle = useMapStyle();

  const replay = useGlobeReplay();
  const data = useGlobeData(replay);
  const online = useOnlineLocations();
  const { data: countriesGeoData } = useCountries();
  const { data: subdivisionsGeoData } = useSubdivisions();

  const showsPlaces = breakdown !== "sessions";
  const strokeColor = data.scale.tint(0.35);
  const windowKey = replay.windowStart ? replay.windowStart.toMillis() : null;

  // The globe (Mapbox) is driven from here; the flat map (OpenLayers) owns its layers.
  const is3D = mapMode === "3D";
  const { map, mapLoaded } = useMapbox(mapContainer, is3D, mapStyle);
  const globeReady = is3D && mapLoaded;
  // Without a Mapbox token the globe is a message, and controls for a map that is not there would mislead.
  const { configs } = useConfigs();
  const hasMap = !is3D || !!configs?.mapboxToken;

  useChoroplethLayer({
    map,
    mapLoaded: globeReady,
    id: "countries",
    geoData: countriesGeoData,
    codeProperty: "ISO_A2",
    enabled: breakdown === "country",
    places: data.fills,
    selectedKey,
  });

  useChoroplethLayer({
    map,
    mapLoaded: globeReady,
    id: "subdivisions",
    geoData: subdivisionsGeoData,
    codeProperty: "iso_3166_2",
    enabled: breakdown === "region",
    places: data.fills,
    selectedKey,
  });

  useCitiesLayer({
    map,
    mapLoaded: globeReady,
    enabled: breakdown === "city",
    points: data.cityPoints,
    strokeColor,
    selectedKey,
  });

  useOnlineLayer({ map, mapLoaded: globeReady, enabled: showOnline, points: online.locations, tone: data.tone });

  useTimelineLayer({
    map,
    mapLoaded: globeReady,
    enabled: breakdown === "sessions",
    activeSessions: replay.activeSessions,
    windowKey,
    onSessionSelect: setSelectedSession,
  });

  const selectedEntry = showsPlaces && selectedKey ? data.byKey.get(selectedKey) : undefined;
  const hoverEntry = showsPlaces && hover && hover.key !== selectedKey ? data.byKey.get(hover.key) : undefined;
  const placeCount = data.totals?.places ?? data.entries.length;
  const onlineIn = (key: string) => (showOnline ? online.byCountry.get(placeCountryCode(data.level, key)) : undefined);

  // On a narrow screen the list sits below the map, so what a row opens (the
  // place card, the session panel) would appear out of sight above it.
  const revealMap = () => mapArea.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const selectPlaceFromList = (key: string) => {
    if (key !== selectedKey) revealMap();
    toggleSelected(key);
  };
  const selectSessionFromList = (session: GetSessionsResponse[number]) => {
    revealMap();
    setSelectedSession(session);
  };

  return (
    <DisabledOverlay message="Globe" featurePath="globe">
      <div className="flex flex-col xl:h-dvh">
        <div className="shrink-0 space-y-3 p-2 md:p-4 md:pb-3">
          <SubHeader />
          <GlobeStatBand online={online} />
          <GlobeToolbar />
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-100 dark:border-neutral-850 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              ref={mapArea}
              className="relative h-[55dvh] min-h-[340px] overflow-hidden xl:h-auto xl:min-h-0 xl:flex-1"
            >
              {is3D ? (
                <MapboxMap mapContainer={mapContainer} />
              ) : (
                <OpenLayersMap
                  key="openlayers-map"
                  breakdown={breakdown}
                  styleUrl={mapStyle}
                  tone={data.tone}
                  places={data.fills}
                  cityPoints={data.cityPoints}
                  strokeColor={strokeColor}
                  selectedKey={selectedKey}
                  onlinePoints={online.locations}
                  showOnline={showOnline}
                  activeSessions={replay.activeSessions}
                  windowKey={windowKey}
                  onSessionSelect={setSelectedSession}
                />
              )}

              {hasMap && <MapControls className="absolute right-2 top-2 z-10 md:right-4 md:top-4" />}

              {hasMap && (
                <MapLegend
                  className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] md:bottom-4 md:left-4"
                  scale={showsPlaces ? data.scale : null}
                  level={data.level}
                  metric={data.metric}
                  showOnline={showOnline}
                  tone={data.tone}
                />
              )}

              {selectedEntry && (
                <PlaceCard
                  className="absolute left-2 top-2 z-20 max-w-[calc(100%-3.5rem)] md:left-4 md:top-4"
                  entry={selectedEntry}
                  level={data.level}
                  metric={data.metric}
                  totals={data.totals}
                  placeCount={placeCount}
                  online={onlineIn(selectedEntry.key)}
                  windowed={data.windowed}
                  pinned
                  onClose={() => toggleSelected(null)}
                />
              )}

              {hover && hoverEntry && (
                // Follows the pointer, on whichever side of it has room, and never takes pointer events from the map.
                <div
                  className="pointer-events-none absolute z-30 hidden md:block"
                  style={{
                    left: hover.x,
                    top: hover.y,
                    transform: `translate(${
                      hover.x > hover.width / 2 ? `calc(-100% - ${HOVER_OFFSET}px)` : `${HOVER_OFFSET}px`
                    }, ${hover.y > hover.height / 2 ? `calc(-100% - ${HOVER_OFFSET}px)` : `${HOVER_OFFSET}px`})`,
                  }}
                >
                  <PlaceCard
                    entry={hoverEntry}
                    level={data.level}
                    metric={data.metric}
                    totals={data.totals}
                    placeCount={placeCount}
                    online={onlineIn(hoverEntry.key)}
                    windowed={data.windowed}
                  />
                </div>
              )}

              {selectedSession && (
                <SessionPanel
                  className="absolute inset-x-2 bottom-2 z-40 max-h-[calc(100%-1rem)] md:inset-x-4 md:bottom-4 md:max-h-[calc(100%-2rem)]"
                  session={selectedSession}
                  onClose={() => setSelectedSession(null)}
                />
              )}
            </div>

            <ReplayBar replay={replay} className="shrink-0" />
          </div>

          <GlobeRail
            className="border-t border-neutral-100 dark:border-neutral-850 xl:w-[344px] xl:shrink-0 xl:border-l xl:border-t-0"
            data={data}
            windowSessions={replay.index >= 0 ? replay.activeSessions : null}
            windowLoading={replay.sessionsLoading}
            onSessionSelect={selectSessionFromList}
            onPlaceSelect={selectPlaceFromList}
          />
        </div>
      </div>
    </DisabledOverlay>
  );
}
