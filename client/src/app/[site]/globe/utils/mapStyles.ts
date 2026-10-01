/**
 * Whether a basemap is dark or light. The data colour is the same hue on both,
 * but a light basemap needs a darker shade of it to stay readable.
 */
export type MapTone = "dark" | "light";

export type MapStyleId =
  | "standard"
  | "standard-satellite"
  | "outdoors"
  | "light"
  | "dark"
  | "satellite"
  | "navigation-day"
  | "navigation-night"
  | "bright"
  | "liberty";

export interface MapStyle {
  id: MapStyleId;
  url: string;
  tone: MapTone;
}

/** Mapbox styles for the 3D globe. */
export const GLOBE_STYLES: MapStyle[] = [
  { id: "standard", url: "mapbox://styles/mapbox/standard", tone: "light" },
  { id: "standard-satellite", url: "mapbox://styles/mapbox/standard-satellite", tone: "dark" },
  { id: "outdoors", url: "mapbox://styles/mapbox/outdoors-v12", tone: "light" },
  { id: "light", url: "mapbox://styles/mapbox/light-v11", tone: "light" },
  { id: "dark", url: "mapbox://styles/mapbox/dark-v11", tone: "dark" },
  { id: "satellite", url: "mapbox://styles/mapbox/satellite-v9", tone: "dark" },
  { id: "navigation-day", url: "mapbox://styles/mapbox/navigation-day-v1", tone: "light" },
  { id: "navigation-night", url: "mapbox://styles/mapbox/navigation-night-v1", tone: "dark" },
];

/** OpenFreeMap styles for the flat map. */
export const FLAT_STYLES: MapStyle[] = [
  { id: "dark", url: "https://tiles.openfreemap.org/styles/dark", tone: "dark" },
  { id: "light", url: "https://tiles.openfreemap.org/styles/positron", tone: "light" },
  { id: "bright", url: "https://tiles.openfreemap.org/styles/bright", tone: "light" },
  { id: "liberty", url: "https://tiles.openfreemap.org/styles/liberty", tone: "light" },
];

export const DEFAULT_PLACE_STYLE = "mapbox://styles/mapbox/dark-v11";
export const DEFAULT_SESSION_STYLE = "mapbox://styles/mapbox/standard";
export const DEFAULT_FLAT_STYLE = "https://tiles.openfreemap.org/styles/dark";

export const findMapStyle = (url: string): MapStyle | undefined =>
  [...GLOBE_STYLES, ...FLAT_STYLES].find(style => style.url === url);

export const mapStyleTone = (url: string): MapTone => findMapStyle(url)?.tone ?? "dark";
