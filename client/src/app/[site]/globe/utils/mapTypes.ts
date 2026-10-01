import type { MapTone } from "./mapStyles";

/**
 * What the page hands a map engine to draw. Both engines (Mapbox for the
 * globe, OpenLayers for the flat map) take the same shapes, so the figures and
 * colours are decided once, on the page.
 */

/** A country's or region's fill. */
export interface PlaceFill {
  fill: string;
  /** The fill while the pointer is over the place. */
  hoverFill: string;
}

/** A city drawn as a circle. */
export interface CityPoint extends PlaceFill {
  key: string;
  lat: number;
  lon: number;
  /** What the circle's area stands for: the chosen count, or sessions for a rate. */
  size: number;
}

/** Visitors seen at one coordinate in the last few minutes. */
export interface OnlinePoint {
  lat: number;
  lon: number;
  count: number;
}

export interface OnlineDotStyle {
  fill: string;
  stroke: string;
  haloFill: string;
  haloStroke: string;
}

/** How far the soft ring reaches past the dot, in pixels. */
export const ONLINE_HALO_WIDTH = 3.5;

/**
 * The online-now marker, on either engine and in the legend: a dot with a soft
 * ring, white on a dark basemap and near-black on a light one. Neutral on
 * purpose: it is not part of the colour scale.
 */
export const onlineDotStyle = (tone: MapTone): OnlineDotStyle =>
  tone === "dark"
    ? {
        fill: "rgba(250, 250, 250, 1)",
        stroke: "rgba(10, 10, 10, 1)",
        haloFill: "rgba(250, 250, 250, 0.14)",
        haloStroke: "rgba(250, 250, 250, 0.45)",
      }
    : {
        fill: "rgba(23, 23, 23, 1)",
        stroke: "rgba(250, 250, 250, 1)",
        haloFill: "rgba(23, 23, 23, 0.12)",
        haloStroke: "rgba(23, 23, 23, 0.4)",
      };

/** Dot radius in pixels: area grows with the number of sessions at the location. */
export const onlineDotRadius = (count: number) => 2 + Math.sqrt(Math.max(count, 1)) * 1.25;

/** Cities are drawn larger when there are few of them. */
export const citySizeMultiplier = (total: number) => {
  if (total <= 50) return 3;
  if (total <= 200) return 2;
  if (total <= 500) return 1.5;
  return 1;
};
