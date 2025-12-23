export interface TooltipContent {
  name: string;
  code: string;
  count: number;
  percentage: number;
}

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface MapComponentProps {
  height: string;
  mapView?: "countries" | "subdivisions";
}

export interface ProcessedData {
  value: string;
  count: number;
  percentage: number;
}
