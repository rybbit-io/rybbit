"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import "./globe.css";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { SessionCard } from "../../../components/Sessions/SessionCard";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { GlobeSessions } from "./components/GlobeSessions";
import MapViewSelector from "./components/ModeSelector";
import MapStyleSelector from "./components/MapStyleSelector";
import { TimelineScrubber } from "./components/TimelineScrubber";
import { OpenLayersMap } from "./2d/components/OpenLayersMap";
import { MapboxMap } from "./3d/components/MapboxMap";
import { useGlobeStore } from "./globeStore";
import { useTimelineLayer } from "./3d/hooks/timelineLayer/useTimelineLayer";
import { useCoordinatesLayer } from "./3d/hooks/useCoordinatesLayer";
import { useCountriesLayer } from "./3d/hooks/useCountriesLayer";
import { useLayerVisibility } from "./3d/hooks/useLayerVisibility";
import { useMapbox } from "./3d/hooks/useMapbox";
import { useSubdivisionsLayer } from "./3d/hooks/useSubdivisionsLayer";
import { useTimelineStore } from "./timelineStore";
import { useTimelineSessions } from "./3d/hooks/timelineLayer/useTimelineSessions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { WINDOW_SIZE_OPTIONS } from "./timelineUtils";

export default function GlobePage() {
  useSetPageTitle("Globe");
  const mapContainer = useRef<HTMLDivElement>(null);
  const { windowSize, setManualWindowSize } = useTimelineStore();

  // Fetch timeline sessions and update store
  useTimelineSessions();

  const { mapView, mapMode, mapStyle, setMapStyle, timelineStyle, setTimelineStyle } = useGlobeStore();

  // Automatically switch styles based on view
  useEffect(() => {
    if (mapView === "timeline") {
      // Restore timeline style when switching back to timeline view
      if (mapStyle !== timelineStyle) {
        setMapStyle(timelineStyle);
      }
    } else {
      // Force dark-v11 for non-timeline views
      if (mapStyle !== "mapbox://styles/mapbox/dark-v11") {
        setMapStyle("mapbox://styles/mapbox/dark-v11");
      }
    }
  }, [mapView, mapStyle, timelineStyle, setMapStyle]);

  const { map, mapLoaded } = useMapbox(mapContainer, mapMode === "3D");

  useCountriesLayer({
    map,
    mapLoaded: mapMode === "3D" && mapLoaded,
    mapView,
  });

  useSubdivisionsLayer({
    map,
    mapLoaded: mapMode === "3D" && mapLoaded,
    mapView,
  });

  useCoordinatesLayer({
    map,
    mapLoaded: mapMode === "3D" && mapLoaded,
    minutes: 30,
    mapView,
  });

  const { selectedSession, setSelectedSession } = useTimelineLayer({
    map,
    mapLoaded: mapMode === "3D" && mapLoaded,
    mapView,
  });

  useLayerVisibility(map, mapView, mapMode === "3D" && mapLoaded);

  return (
    <DisabledOverlay message="Globe" featurePath="globe">
      <div className="relative w-full h-dvh overflow-hidden">
        <div className="p-2 md:p-4 relative z-50 dark">
          <SubHeader />
        </div>
        <div className="absolute top-0 left-0 right-0 bottom-0 z-10">
          {mapMode === "3D" ? (
            <MapboxMap mapContainer={mapContainer} />
          ) : (
            <OpenLayersMap key="openlayers-map" mapView={mapView} onSessionSelect={setSelectedSession} />
          )}
          <div className="absolute bottom-2 left-2 right-2  md:right-4 md:left-4 z-99999 flex flex-col gap-2 pointer-events-none ">
            <div className="flex items-end gap-2 justify-between overflow-x-auto">
              <div className="pointer-events-auto dark">
                <MapViewSelector />
              </div>
              {mapView === "timeline" ? (
                <div className="pointer-events-auto flex gap-2 dark">
                  {mapMode === "3D" && <MapStyleSelector />}
                  <Select
                    value={windowSize.toString()}
                    onValueChange={(value: string) => {
                      const newSize = parseInt(value, 10);
                      setManualWindowSize(newSize);
                    }}
                  >
                    <SelectTrigger className="w-[60px] h-[30px] text-white" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WINDOW_SIZE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="pointer-events-auto hidden md:block dark">
                  <GlobeSessions />
                </div>
              )}
            </div>
            {mapView === "timeline" && (
              <div className="pointer-events-auto dark">
                <TimelineScrubber />
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <VisuallyHidden>
          <DialogTitle>Session Details</DialogTitle>
        </VisuallyHidden>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-transparent border-0 p-0 shadow-none [&>button]:hidden">
          {selectedSession && <SessionCard session={selectedSession} expandedByDefault />}
        </DialogContent>
      </Dialog>
    </DisabledOverlay>
  );
}
