import { cn } from "@/lib/utils";

const WIDTH = 84;
const HEIGHT = 24;
// Keeps the stroke inside the box at the peak and at zero.
const PAD = 2;

interface EventSparklineProps {
  /** One value per bucket, oldest first. */
  values: number[];
  /** Read out in place of the drawing, e.g. "Events per day, peak 142". */
  label: string;
  /** Draws in neutral instead of the data hue: an event that has stopped. */
  muted?: boolean;
  className?: string;
}

/**
 * A row's trend. Plain SVG rather than a chart instance: the table can hold a
 * thousand of these, and they need neither axes nor a tooltip.
 */
export function EventSparkline({ values, label, muted = false, className }: EventSparklineProps) {
  if (values.length < 2) {
    return (
      <div
        className={cn("h-px w-[84px] bg-neutral-200 dark:bg-neutral-800", className)}
        role="img"
        aria-label={label}
      />
    );
  }

  const max = Math.max(...values, 1);
  const step = WIDTH / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const color = muted ? "hsl(var(--neutral-400))" : "hsl(var(--dataviz))";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      className={cn("block overflow-visible", className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
