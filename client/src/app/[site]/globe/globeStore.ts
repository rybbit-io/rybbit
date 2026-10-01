import { create } from "zustand";
import { IS_CLOUD } from "../../../lib/const";
import { DEFAULT_FLAT_STYLE, DEFAULT_PLACE_STYLE, DEFAULT_SESSION_STYLE } from "./utils/mapStyles";

/** What the map and the list are split by. "sessions" draws the people themselves. */
export type Breakdown = "country" | "region" | "city" | "sessions";
export type PlaceLevel = Exclude<Breakdown, "sessions">;
export type GlobeMetric = "sessions" | "users" | "pageviews" | "bounce_rate";
export type MapMode = "3D" | "2D";
export type RailTab = "places" | "sessions";

/** The place under the pointer, in pixels from the map's top-left corner. */
export interface MapHover {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GlobeStore {
  breakdown: Breakdown;
  setBreakdown: (breakdown: Breakdown) => void;
  metric: GlobeMetric;
  setMetric: (metric: GlobeMetric) => void;
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;
  // The 3D map remembers one style for places and one for sessions: a
  // choropleth reads best on a plain basemap, avatars on the detailed one.
  placeStyle: string;
  sessionStyle: string;
  flatStyle: string;
  setMapStyle: (style: string) => void;
  showOnline: boolean;
  setShowOnline: (show: boolean) => void;
  hover: MapHover | null;
  setHover: (hover: MapHover | null) => void;
  selectedKey: string | null;
  /** Selects a place; selecting the selected place again clears it. */
  toggleSelected: (key: string | null) => void;
  railTab: RailTab;
  setRailTab: (tab: RailTab) => void;
}

export const useGlobeStore = create<GlobeStore>(set => ({
  breakdown: "country",
  // Place keys differ per level, so a selection does not survive the switch.
  setBreakdown: breakdown => set({ breakdown, hover: null, selectedKey: null }),
  metric: "sessions",
  setMetric: metric => set({ metric }),
  mapMode: IS_CLOUD ? "3D" : "2D",
  setMapMode: mapMode => set({ mapMode, hover: null }),
  placeStyle: DEFAULT_PLACE_STYLE,
  sessionStyle: DEFAULT_SESSION_STYLE,
  flatStyle: DEFAULT_FLAT_STYLE,
  setMapStyle: style =>
    set(state =>
      state.mapMode === "2D"
        ? { flatStyle: style }
        : state.breakdown === "sessions"
          ? { sessionStyle: style }
          : { placeStyle: style }
    ),
  showOnline: true,
  setShowOnline: showOnline => set({ showOnline }),
  hover: null,
  setHover: hover => set({ hover }),
  selectedKey: null,
  toggleSelected: key => set(state => ({ selectedKey: key === state.selectedKey ? null : key })),
  railTab: "places",
  setRailTab: railTab => set({ railTab }),
}));

/** The style the current map engine and breakdown are drawn with. */
export const useMapStyle = () =>
  useGlobeStore(state =>
    state.mapMode === "2D" ? state.flatStyle : state.breakdown === "sessions" ? state.sessionStyle : state.placeStyle
  );
