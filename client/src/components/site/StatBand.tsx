"use client";

import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeltaValue } from "@/lib/delta";
import { cn } from "@/lib/utils";
import { Delta } from "./Delta";

export interface StatBandCell {
  /** React key. Defaults to the label. */
  id?: string;
  /** A 12px icon, e.g. `<Files className="h-3 w-3" />`. */
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  /** Change against the comparison period, from `percentDelta` or `pointDelta` (lib/delta). */
  delta?: DeltaValue | null;
  /** False for metrics where a rise is bad news. Only read with `delta`. */
  upIsGood?: boolean;
  /** One quiet line under the value. */
  sub?: ReactNode;
  /** Hover text for the value, e.g. the unrounded number. */
  title?: string;
  /** Overrides the band's `isLoading` for this cell. */
  isLoading?: boolean;
}

export type StatBandColumns = 1 | 2 | 3 | 4 | 5 | 6;

// Cells per row at each width, for each wide-screen column count: [base, sm, lg].
const ROW_SIZES: Record<StatBandColumns, readonly [number, number, number]> = {
  1: [1, 1, 1],
  2: [2, 2, 2],
  3: [2, 3, 3],
  4: [2, 2, 4],
  5: [2, 3, 5],
  6: [2, 3, 6],
};

// Indexed by [breakpoint][count]. Written out in full so Tailwind sees every class.
const GRID_COLUMNS = [
  ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6"],
  ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4", "sm:grid-cols-5", "sm:grid-cols-6"],
  ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6"],
];
const COLUMN_SPAN = [
  ["", "col-span-1", "col-span-2", "col-span-3", "col-span-4", "col-span-5", "col-span-6"],
  ["", "sm:col-span-1", "sm:col-span-2", "sm:col-span-3", "sm:col-span-4", "sm:col-span-5", "sm:col-span-6"],
  ["", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3", "lg:col-span-4", "lg:col-span-5", "lg:col-span-6"],
];

// A breakpoint repeats the one below it unless its count differs.
const responsive = (lookup: string[][], counts: readonly number[]) =>
  counts.map((count, breakpoint) => (count === counts[breakpoint - 1] ? "" : lookup[breakpoint][count])).join(" ");

/**
 * How many columns the last cell takes at each width so the last row is never
 * short: an empty grid track would show the seam colour as a grey block.
 */
const lastCellSpans = (cellCount: number, rowSizes: readonly number[]) =>
  rowSizes.map(size => (cellCount % size === 0 ? 1 : size - (cellCount % size) + 1));

function Cell({ cell, isLoading, className }: { cell: StatBandCell; isLoading: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0 bg-white px-3.5 py-2.5 dark:bg-neutral-900", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {cell.icon}
        <span className="truncate">{cell.label}</span>
      </div>
      {isLoading ? (
        // As tall as the value line it stands in for, so the band does not grow when data arrives.
        <div className="mt-0.5 flex h-6 items-center">
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      ) : (
        <div className="mt-0.5 flex items-baseline gap-2">
          <div
            className={cn(
              "min-w-0 truncate text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-50",
              // Alone, the value takes the whole line; a delta sits right after it instead.
              !cell.delta && "flex-1"
            )}
            title={cell.title}
          >
            {cell.value}
          </div>
          <Delta value={cell.delta} upIsGood={cell.upIsGood} />
        </div>
      )}
      {cell.sub != null &&
        (isLoading ? (
          <div className="mt-0.5 flex h-4 items-center">
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ) : (
          <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{cell.sub}</div>
        ))}
    </div>
  );
}

export interface StatBandProps {
  /** Falsy entries are skipped, so a cell can be conditional inline. */
  cells: (StatBandCell | false | null | undefined)[];
  /** Shows a skeleton in place of every value. */
  isLoading?: boolean;
  /**
   * Cells per row on a wide screen; narrower screens wrap to 3 and then 2.
   * Defaults to the number of cells, up to 6.
   */
  columns?: StatBandColumns;
  className?: string;
}

/**
 * The summary strip that opens a site page: flat cells separated by hairline
 * seams (gap-px over the border colour), each a label, a figure, and
 * optionally its change against the comparison period and one line of context.
 */
export function StatBand({ cells, isLoading = false, columns, className }: StatBandProps) {
  const visible = cells.filter((cell): cell is StatBandCell => !!cell);
  if (visible.length === 0) return null;

  const rowSizes = ROW_SIZES[columns ?? (Math.min(visible.length, 6) as StatBandColumns)];
  const spans = lastCellSpans(visible.length, rowSizes);
  const lastCellSpan = spans.some(span => span > 1) ? responsive(COLUMN_SPAN, spans) : undefined;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-neutral-100 dark:border-neutral-850", className)}>
      <div className={cn("grid gap-px bg-neutral-100 dark:bg-neutral-850", responsive(GRID_COLUMNS, rowSizes))}>
        {visible.map((cell, index) => (
          <Cell
            key={cell.id ?? cell.label}
            cell={cell}
            isLoading={cell.isLoading ?? isLoading}
            className={index === visible.length - 1 ? lastCellSpan : undefined}
          />
        ))}
      </div>
    </div>
  );
}
