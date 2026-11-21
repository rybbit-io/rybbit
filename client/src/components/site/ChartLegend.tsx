import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChartLegendItem {
  /** React key. Defaults to the label when it is a string. */
  id?: string;
  label: ReactNode;
  /** Any CSS colour, e.g. `hsl(var(--dataviz))`. */
  color: string;
  /** Draws a dashed line instead of a dot: the comparison series. */
  dashed?: boolean;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

/**
 * Names a chart's series: a dot per series, a dashed line for the comparison
 * period. Read-only; the events page keeps its own toggling legend.
 */
export function ChartLegend({ items, className }: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300",
        className
      )}
    >
      {items.map((item, index) => (
        <li
          key={item.id ?? (typeof item.label === "string" ? item.label : index)}
          className="inline-flex items-center gap-1.5"
        >
          {item.dashed ? (
            <span
              className="inline-block w-3 border-t border-dashed"
              style={{ borderColor: item.color }}
              aria-hidden="true"
            />
          ) : (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
