"use client";

import { ChevronDown, ChevronRight, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Goal } from "@/api/analytics/endpoints";
import { useDeleteGoal } from "@/api/analytics/hooks/goals/useDeleteGoal";
import { Delta } from "@/components/site/Delta";
import { PivotActions } from "@/components/site/PivotActions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { resolvePropertyFilters } from "@/lib/events";
import { cn } from "@/lib/utils";
import { formatRate, goalPattern, goalPivotFilters, LedgerRow } from "../utils/goalLedger";
import { GoalEditor } from "./GoalEditor";
import { GoalExpanded } from "./GoalExpanded";
import { GoalTrendBars, TrendPoint } from "./GoalTrendBars";
import { GoalTypeIcon, useGoalTypeLabels } from "./goalType";

/**
 * The ledger's columns, for the header and every row. Each row is its own
 * grid, so the tracks are fixed widths: goal, conversions, [change], rate,
 * [change], [trend], actions. The two change columns exist only while a
 * comparison is on; below `lg` changes sit under their figures instead, and
 * the trend column appears from `xl`.
 */
export const LEDGER_GRID = {
  compare:
    "grid grid-cols-[minmax(0,1fr)_80px_72px_36px] lg:grid-cols-[minmax(0,1fr)_156px_80px_72px_80px_104px] xl:grid-cols-[minmax(0,1fr)_156px_80px_72px_80px_148px_104px] min-[87.5rem]:grid-cols-[minmax(0,1fr)_172px_88px_76px_88px_164px_196px]",
  plain:
    "grid grid-cols-[minmax(0,1fr)_80px_72px_36px] lg:grid-cols-[minmax(0,1fr)_156px_72px_104px] xl:grid-cols-[minmax(0,1fr)_156px_72px_148px_104px] min-[87.5rem]:grid-cols-[minmax(0,1fr)_172px_76px_164px_196px]",
} as const;

const ROW_BORDER = "border-b border-neutral-100 dark:border-neutral-800";

/** What the goal is: its type and the pattern it matches, plus any property filters. */
function DefinitionChip({ goal }: { goal: Goal }) {
  const t = useExtracted();
  const typeLabels = useGoalTypeLabels();
  const pattern = goalPattern(goal) || t("Any");
  const properties = resolvePropertyFilters(goal.config)
    .map(filter => `${filter.key}: ${filter.value}`)
    .join(", ");

  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1 self-start rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800 sm:self-auto"
      title={properties ? `${pattern} (${properties})` : pattern}
    >
      <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{typeLabels[goal.goalType]}</span>
      <span className="truncate text-neutral-800 dark:text-neutral-200">{pattern}</span>
      {properties && <span className="truncate text-neutral-500 dark:text-neutral-400">{properties}</span>}
    </span>
  );
}

interface GoalRowProps {
  row: LedgerRow;
  siteId: number;
  /** goals:write: edit, clone and delete. */
  canWrite: boolean;
  /** Whether a comparison period is selected: the change columns exist. */
  comparisonEnabled: boolean;
  /** The comparison period's figures are still on their way. */
  isLoadingComparison: boolean;
  /** The largest conversion count among all goals: the bar's full width. */
  maxConversions: number;
  timeSeries?: TrendPoint[];
  isLoadingTimeSeries: boolean;
  /** "conversions per day", for the trend's accessible name. */
  trendLabel: string;
  chartTitle: string;
  onClone: (goal: Goal) => void;
}

export function GoalRow({
  row,
  siteId,
  canWrite,
  comparisonEnabled,
  isLoadingComparison,
  maxConversions,
  timeSeries,
  isLoadingTimeSeries,
  trendLabel,
  chartTitle,
  onClone,
}: GoalRowProps) {
  const t = useExtracted();
  const { goal, label } = row;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteGoal = useDeleteGoal();

  const pivotFilters = goalPivotFilters(goal);
  const grid = comparisonEnabled ? LEDGER_GRID.compare : LEDGER_GRID.plain;
  // A goal with conversions always shows a sliver; a goal with none shows an empty track.
  const barWidth =
    row.conversions > 0 && maxConversions > 0 ? Math.max(1.5, (row.conversions / maxConversions) * 100) : 0;

  const handleDelete = async () => {
    try {
      await deleteGoal.mutateAsync(goal.goalId);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to delete goal"));
    }
  };

  if (isEditing) {
    return (
      <div role="row" className={cn(ROW_BORDER, "bg-neutral-50 dark:bg-neutral-800/30")}>
        <div role="cell">
          <GoalEditor siteId={siteId} mode="edit" goal={goal} onDone={() => setIsEditing(false)} />
        </div>
      </div>
    );
  }

  const comparisonCell = (value: LedgerRow["conversionsDelta"]) =>
    isLoadingComparison ? <Skeleton className="h-3 w-10 rounded" /> : <Delta value={value} />;

  return (
    <>
      <div
        role="row"
        className={cn(
          grid,
          "cursor-pointer items-center text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/20",
          isExpanded ? "bg-neutral-50 dark:bg-neutral-800/30" : ROW_BORDER
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div role="cell" className="flex min-w-0 items-center gap-1.5 py-2 pl-1.5 pr-2 sm:gap-2 sm:pl-2">
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            className="shrink-0 text-neutral-500 dark:text-neutral-400"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t("Collapse {name}", { name: label }) : t("Expand {name}", { name: label })}
            onClick={event => {
              event.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </Button>
          <GoalTypeIcon type={goal.goalType} className="hidden sm:block" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex-row sm:items-center sm:gap-2">
            <span className="max-w-full truncate font-medium text-neutral-900 dark:text-neutral-50 sm:max-w-[70%] sm:shrink-0">
              {label}
            </span>
            <DefinitionChip goal={goal} />
          </div>
        </div>

        <div role="cell" className="flex items-center justify-end gap-3 px-2">
          <div
            className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 lg:block"
            aria-hidden="true"
          >
            <div className="h-full rounded-full bg-dataviz" style={{ width: `${barWidth}%` }} />
          </div>
          <div className="flex flex-col items-end">
            <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {row.conversions.toLocaleString()}
            </span>
            <Delta value={row.conversionsDelta} className="lg:hidden" />
          </div>
        </div>

        {comparisonEnabled && (
          <div role="cell" className="hidden items-center justify-end px-2 lg:flex">
            {comparisonCell(row.conversionsDelta)}
          </div>
        )}

        <div role="cell" className="flex flex-col items-end px-2">
          <span className="tabular-nums">{formatRate(row.rate)}</span>
          <Delta value={row.rateDelta} className="lg:hidden" />
        </div>

        {comparisonEnabled && (
          <div role="cell" className="hidden items-center justify-end px-2 lg:flex">
            {comparisonCell(row.rateDelta)}
          </div>
        )}

        <div role="cell" className="hidden pl-6 pr-2 xl:block">
          <GoalTrendBars data={timeSeries} isLoading={isLoadingTimeSeries} label={`${label}, ${trendLabel}`} />
        </div>

        <div
          role="cell"
          className="flex items-center justify-end gap-0.5 pr-2"
          onClick={event => event.stopPropagation()}
        >
          {pivotFilters && (
            <>
              <PivotActions
                filters={pivotFilters}
                actions={["sessions", "users"]}
                className="hidden flex-nowrap min-[87.5rem]:flex"
              />
              <PivotActions
                filters={pivotFilters}
                actions={["sessions", "users"]}
                showLabels={false}
                className="hidden flex-nowrap lg:flex min-[87.5rem]:hidden"
              />
            </>
          )}
          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="smIcon"
                  className="shrink-0 text-neutral-500 dark:text-neutral-400"
                  aria-label={t("Edit, clone or delete {name}", { name: label })}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  {t("Edit goal")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onClone(goal)}>
                  <Copy className="h-4 w-4" />
                  {t("Clone goal")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("Delete goal")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isExpanded && (
        <div role="row" className={ROW_BORDER}>
          <div role="cell">
            <GoalExpanded
              row={row}
              siteId={siteId}
              timeSeries={timeSeries}
              isLoadingTimeSeries={isLoadingTimeSeries}
              chartTitle={chartTitle}
            />
          </div>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure you want to delete this goal?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This action cannot be undone. This will permanently delete the goal and remove it from all reports.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              {deleteGoal.isPending ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
