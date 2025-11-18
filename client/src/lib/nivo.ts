"use client";

import { PartialTheme } from "@nivo/theming";
import { useTheme } from "next-themes";

export const getNivoTheme = (isDark: boolean = true): PartialTheme => ({
  axis: {
    legend: {
      text: {
        fill: isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-600))",
      },
    },
    ticks: {
      line: {},
      text: {
        fill: isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-500))",
      },
    },
  },
  grid: {
    line: {
      stroke: isDark ? "hsl(var(--neutral-800))" : "hsl(var(--neutral-100))",
      strokeWidth: 1,
    },
  },
  tooltip: {
    basic: {
      fontFamily: "Roboto Mono",
    },
    container: {
      backdropFilter: "blur( 7px )",
      background: isDark ? "rgb(40, 40, 40, 0.8)" : "rgb(245, 245, 245, 0.8)",
      color: isDark ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
    },
  },
  crosshair: { line: { stroke: isDark ? "hsl(var(--neutral-50))" : "hsl(var(--neutral-900))" } },
  annotations: {
    text: {
      fill: isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-600))",
    },
  },
  text: {
    fill: isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-600))",
  },
  labels: {
    text: {
      fill: isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-600))",
    },
  },
});

// Custom hook that automatically uses the resolved theme
export const useNivoTheme = (): PartialTheme => {
  const { resolvedTheme } = useTheme();
  return getNivoTheme(resolvedTheme === "dark");
};

// Export default dark theme for backwards compatibility
export const nivoTheme: PartialTheme = getNivoTheme(true);
