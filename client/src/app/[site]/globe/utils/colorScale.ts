import { scalePow } from "d3-scale";

export function createColorScale(data?: any[] | null): (value: number) => string {
  if (!data) return () => "#222";

  const getComputedColor = (cssVar: string) => {
    const hslValues = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return `hsl(${hslValues})`;
  };

  const accentColor = getComputedColor("--accent-400");
  const hslMatch = accentColor.match(/hsl\(([^)]+)\)/);
  const hslValues = hslMatch ? hslMatch[1].split(" ") : ["0", "0%", "50%"];
  const [h, s, l] = hslValues;

  const values = data.map((d: any) => d.count);
  const maxValue = Math.max(...values);

  return scalePow<string>()
    .exponent(0.4)
    .domain([0, maxValue])
    .range([`hsla(${h}, ${s}, ${l}, 0.05)`, `hsla(${h}, ${s}, ${l}, 0.8)`]);
}
