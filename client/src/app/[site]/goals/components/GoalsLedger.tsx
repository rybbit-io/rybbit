"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { Goal } from "@/api/analytics/endpoints";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LedgerRow, LedgerSort, LedgerSortKey } from "../utils/goalLedger";
import { GoalRow, LEDGER_GRID } from "./GoalRow";
import { TrendPoint } from "./GoalTrendBars";

const HEADER_CELL = "flex h-8 items-center px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400";

function SortHeader({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: LedgerSortKey;
  sort: LedgerSort;
  onSortChange: (sort: LedgerSort) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  // A first click on a figure shows the largest first; on the name, A to Z.
  const firstOrder = sortKey === "name" ? "asc" : "desc";
  const nextOrder = active ? (sort.order === "desc" ? "asc" : "desc") : firstOrder;
  const Icon = !active ? ChevronsUpDown : sort.order === "desc" ? ArrowDown : ArrowUp;

  return (
    <div
      role="columnheader"
      aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"}
      className={cn(HEADER_CELL, className)}
    >
      <button
        type="button"
        onClick={() => onSortChange({ key: sortKey, order: nextOrder })}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:hover:text-neutral-100",
          active && "text-neutral-900 dark:text-neutral-100"
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-40")} aria-hidden="true" />
      </button>
    </div>
  );
}

interface GoalsLedgerProps {
  /** The rows to draw: already searched, sorted and cut to the page. */
  rows: LedgerRow[];
  sort: LedgerSort;
  onSortChange: (sort: LedgerSort) => void;
  comparisonEnabled: boolean;
  isLoadingComparison: boolean;
  /** The largest conversion count among all goals, not only the ones on this page. */
  maxConversions: number;
  siteId: number;
  canWrite: boolean;
  timeSeriesByGoal: Map<number, TrendPoint[]>;
  isLoadingTimeSeries: boolean;
  /** The trend column's heading, from the page's interval: "Daily". */
  trendHeading: string;
  /** "conversions per day": the trend's accessible name and the expanded chart's title. */
  trendLabel: string;
  chartTitle: string;
  onClone: (goal: Goal) => void;
  /** Drawn in place of the rows: the "nothing matches" message. */
  emptyState?: ReactNode;
  /** Under the rows, inside the card: the inline new-goal form. */
  footer?: ReactNode;
}

/**
 * Every goal on one aligned, sortable table: conversions, rate, their change
 * against the comparison period, and the goal over time. A row opens in place
 * to the chart and the sessions behind it.
 */
export function GoalsLedger({
  rows,
  sort,
  onSortChange,
  comparisonEnabled,
  isLoadingComparison,
  maxConversions,
  siteId,
  canWrite,
  timeSeriesByGoal,
  isLoadingTimeSeries,
  trendHeading,
  trendLabel,
  chartTitle,
  onClone,
  emptyState,
  footer,
}: GoalsLedgerProps) {
  const t = useExtracted();
  const grid = comparisonEnabled ? LEDGER_GRID.compare : LEDGER_GRID.plain;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div role="table" aria-label={t("Goals")}>
        <div role="rowgroup">
          <div role="row" className={cn(grid, "bg-neutral-50 dark:bg-neutral-850")}>
            <SortHeader label={t("Goal")} sortKey="name" sort={sort} onSortChange={onSortChange} className="pl-3" />
            <SortHeader
              label={t("Conversions")}
              sortKey="conversions"
              sort={sort}
              onSortChange={onSortChange}
              className="justify-end"
            />
            {comparisonEnabled && (
              <SortHeader
                label={t("Change")}
                sortKey="conversionsChange"
                sort={sort}
                onSortChange={onSortChange}
                className="hidden justify-end lg:flex"
              />
            )}
            <SortHeader
              label={t("Rate")}
              sortKey="rate"
              sort={sort}
              onSortChange={onSortChange}
              className="justify-end"
            />
            {comparisonEnabled && (
              <SortHeader
                label={t("Change")}
                sortKey="rateChange"
                sort={sort}
                onSortChange={onSortChange}
                className="hidden justify-end lg:flex"
              />
            )}
            <div role="columnheader" className={cn(HEADER_CELL, "hidden pl-6 xl:flex")}>
              {trendHeading}
            </div>
            <div role="columnheader" className={HEADER_CELL}>
              <span className="sr-only">{t("Actions")}</span>
            </div>
          </div>
        </div>

        <div role="rowgroup">
          {rows.map(row => (
            <GoalRow
              key={row.goal.goalId}
              row={row}
              siteId={siteId}
              canWrite={canWrite}
              comparisonEnabled={comparisonEnabled}
              isLoadingComparison={isLoadingComparison}
              maxConversions={maxConversions}
              timeSeries={timeSeriesByGoal.get(row.goal.goalId)}
              isLoadingTimeSeries={isLoadingTimeSeries}
              trendLabel={trendLabel}
              chartTitle={chartTitle}
              onClone={onClone}
            />
          ))}
        </div>
      </div>

      {emptyState}
      {footer}
    </div>
  );
}

/** The ledger while the goals load: the same card and row rhythm, no figures. */
export function GoalsLedgerSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900"
      aria-busy="true"
    >
      <div className="h-8 bg-neutral-50 dark:bg-neutral-850" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-b-0 dark:border-neutral-800"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="hidden h-4 w-28 rounded sm:block" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="hidden h-6 w-36 rounded xl:block" />
        </div>
      ))}
    </div>
  );
}
