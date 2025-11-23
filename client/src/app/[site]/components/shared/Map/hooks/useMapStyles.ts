import { useMemo } from "react";
import { scalePow } from "d3-scale";
import type { ProcessedData } from "../types";

export function useMapStyles(
  mapView: "countries" | "subdivisions",
  countryData: ProcessedData[] | null,
  subdivisionData: ProcessedData[] | null
) {
  const colorScale = useMemo(() => {
    if (mapView === "countries" && !countryData) return () => "#eee";
    if (mapView === "subdivisions" && !subdivisionData) return () => "#eee";

    const dataToUse = mapView === "countries" ? countryData : subdivisionData;

    const getComputedColor = (cssVar: string) => {
      const hslValues = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      return `hsl(${hslValues})`;
    };

    const accentColor = getComputedColor("--accent-400");

    const hslMatch = accentColor.match(/hsl\(([^)]+)\)/);
    const hslValues = hslMatch ? hslMatch[1].split(" ") : ["0", "0%", "50%"];
    const [h, s, l] = hslValues;

    const values = dataToUse?.map((d: any) => d.count) || [0];
    const maxValue = Math.max(...values);

    return scalePow<string>()
      .exponent(0.4)
      .domain([0, maxValue])
      .range([`hsla(${h}, ${s}, ${l}, 0.05)`, `hsla(${h}, ${s}, ${l}, 0.8)`]);
  }, [countryData, subdivisionData, mapView]);

  return { colorScale };
}
