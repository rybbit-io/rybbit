import { PartialTheme } from "@nivo/theming";

export const nivoTheme: PartialTheme = {
  axis: {
    legend: {
      text: {
        fill: "hsl(var(--neutral-400))",
      },
    },
    ticks: {
      line: {},
      text: {
        fill: "hsl(var(--neutral-400))",
      },
    },
  },
  grid: {
    line: {
      stroke: "hsl(var(--neutral-800))",
      strokeWidth: 1,
    },
  },
  tooltip: {
    basic: {
      fontFamily: "Roboto Mono",
    },
    container: {
      backdropFilter: "blur( 7px )",
      background: "rgb(40, 40, 40, 0.8)",
      color: "rgb(255, 255, 255)",
    },
  },
  crosshair: { line: { stroke: "hsl(var(--neutral-50))" } },
  annotations: {
    text: {
      fill: "hsl(var(--neutral-400))",
    },
  },
  text: {
    fill: "hsl(var(--neutral-400))",
  },
  labels: {
    text: {
      fill: "hsl(var(--neutral-400))",
    },
  },
};
