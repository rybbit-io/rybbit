"use client";

import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { Delta } from "@/components/site/Delta";
import { Skeleton } from "@/components/ui/skeleton";
import { DeltaValue } from "@/lib/delta";
import { cn, formatter } from "@/lib/utils";

export interface LegendRow {
  id: string;
  label: string;
  color: string;
  /** A 14px mark between the dot and the label. */
  icon?: ReactNode;
  /** The series' total over the period. */
  total: number;
  /** Change against the comparison period; null draws nothing. */
  delta?: DeltaValue | null;
  upIsGood?: boolean;
}

interface ChartLegendProps {
  rows: LegendRow[];
  hidden: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Heading of the name column: "Type", "Event". */
  nameLabel: string;
  /** Draws the change column. False when the comparison is turned off. */
  showDelta: boolean;
  /** Reserves the icon column. */
  hasIcons?: boolean;
  isLoading?: boolean;
  note?: ReactNode;
}

/**
 * The chart's legend as a small table: every series with its total for the
 * period and its change, and a click to show or hide its line.
 */
export function ChartLegend({
  rows,
  hidden,
  onToggle,
  nameLabel,
  showDelta,
  hasIcons = false,
  isLoading = false,
  note,
}: ChartLegendProps) {
  const t = useExtracted();
  const columns = cn(
    "grid items-center gap-2",
    hasIcons
      ? showDelta
        ? "grid-cols-[8px_14px_minmax(0,1fr)_44px_60px]"
        : "grid-cols-[8px_14px_minmax(0,1fr)_44px]"
      : showDelta
        ? "grid-cols-[8px_minmax(0,1fr)_44px_60px]"
        : "grid-cols-[8px_minmax(0,1fr)_44px]"
  );

  return (
    <div>
      <div className={cn(columns, "h-8 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400")}>
        <span />
        {hasIcons && <span />}
        <span>{nameLabel}</span>
        <span className="text-right">{t("Events")}</span>
        {showDelta && <span className="text-right">{t("Change")}</span>}
      </div>

      {isLoading
        ? Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex h-7 items-center px-2">
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))
        : rows.map(row => {
            const isHidden = hidden.has(row.id);
            return (
              <button
                key={row.id}
                type="button"
                role="switch"
                aria-checked={!isHidden}
                onClick={() => onToggle(row.id)}
                className={cn(
                  columns,
                  "h-7 w-full cursor-pointer rounded-md px-2 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
                  isHidden && "opacity-50"
                )}
              >
                {isHidden ? (
                  <span className="h-2 w-2 rounded-full border border-neutral-400 dark:border-neutral-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                )}
                {hasIcons && <span className="flex items-center">{row.icon}</span>}
                <span
                  className={cn("truncate text-neutral-700 dark:text-neutral-200", isHidden && "line-through")}
                  title={row.label}
                >
                  {row.label}
                </span>
                <span
                  className="text-right font-medium tabular-nums text-neutral-900 dark:text-neutral-50"
                  title={row.total.toLocaleString()}
                >
                  {formatter(row.total)}
                </span>
                {showDelta && (
                  <span className="flex justify-end">
                    <Delta value={row.delta} upIsGood={row.upIsGood} />
                  </span>
                )}
              </button>
            );
          })}

      {note && (
        <div className="mt-1 border-t border-neutral-100 px-2 pt-2 text-xs text-neutral-500 dark:border-neutral-850 dark:text-neutral-400">
          {note}
        </div>
      )}
    </div>
  );
}
