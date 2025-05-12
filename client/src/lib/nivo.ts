import { Theme } from "@nivo/theming";

type RecursivePartial<T> = {
  [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
    T[P] extends object | undefined ? RecursivePartial<T[P]> :
    T[P];
};

export const nivoTheme: RecursivePartial<Theme> = {
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
