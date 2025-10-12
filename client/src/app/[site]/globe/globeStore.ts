import { create } from "zustand";
import { MapView } from "./components/ModeSelector";

interface GlobeStore {
  mapView: MapView;
  setMapView: (view: MapView) => void;
}

export const useGlobeStore = create<GlobeStore>(set => ({
  mapView: "coordinates",
  setMapView: view => set({ mapView: view }),
}));
