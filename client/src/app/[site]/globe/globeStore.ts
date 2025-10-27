import { create } from "zustand";
import { MapView } from "./components/ModeSelector";
import { IS_CLOUD } from "../../../lib/const";

interface GlobeStore {
  mapView: MapView;
  setMapView: (view: MapView) => void;
  mapMode: "3D" | "2D";
  setMapMode: (mode: "3D" | "2D") => void;
  mapStyle: string;
  setMapStyle: (style: string) => void;
  timelineStyle: string;
  setTimelineStyle: (style: string) => void;
}

export const useGlobeStore = create<GlobeStore>(set => ({
  mapView: "timeline",
  setMapView: view => set({ mapView: view }),
  mapMode: IS_CLOUD ? "3D" : "2D",
  setMapMode: mode => set({ mapMode: mode }),
  mapStyle: "mapbox://styles/mapbox/standard",
  setMapStyle: style => set({ mapStyle: style }),
  timelineStyle: "mapbox://styles/mapbox/standard",
  setTimelineStyle: style => set({ timelineStyle: style }),
}));
