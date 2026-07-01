"use client";

import type { DashboardCard } from "@rybbit/shared";
import { Copy, GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboardCard } from "../../../../api/analytics/hooks/useDashboardCard";
import { cn } from "../../../../lib/utils";
import { Button } from "../../../../components/ui/button";
import { ResultsTable } from "../../query/components/ResultsTable";
import type { SortState } from "../../query/types";
import { getColumns, sortRows } from "../../query/utils";
import { DashboardBarChart } from "./charts/DashboardBarChart";
import { DashboardBarList } from "./charts/DashboardBarList";
import { DashboardCalendar } from "./charts/DashboardCalendar";
import { DashboardLineChart } from "./charts/DashboardLineChart";
import { DashboardMap } from "./charts/DashboardMap";
import { DashboardPie } from "./charts/DashboardPie";
import { DashboardStat } from "./charts/DashboardStat";

type DashboardCardViewProps = {
  siteId: number;
  card: DashboardCard;
  editMode: boolean;
  onEdit: () => void;
  onClone: () => void;
  onRemove: () => void;
};

export function DashboardCardView({ siteId, card, editMode, onEdit, onClone, onRemove }: DashboardCardViewProps) {
  const { data, isLoading, isFetching, error } = useDashboardCard(siteId, card.id, card.sql);
  const [sort, setSort] = useState<SortState>(null);

  const rows = data?.data ?? [];
  const columns = useMemo(() => getColumns(rows), [rows]);
  const activeSort = sort && columns.includes(sort.column) ? sort : null;
  const sortedRows = useMemo(() => sortRows(rows, activeSort), [rows, activeSort]);
  const truncated = data?.meta && data.meta.rowCount >= data.meta.maxRows;
  // Tables manage their own scroll and must clip; charts must let Nivo tooltips
  // escape the card edges, so they render without clipping.
  const isTable = card.vizType === "table";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-neutral-150 bg-white dark:border-neutral-850 dark:bg-neutral-900",
        isTable ? "overflow-hidden" : "overflow-visible"
      )}
    >
      <div
        className={cn(
          "flex h-9 shrink-0 items-center justify-between rounded-t-lg border-b border-neutral-150 bg-neutral-50 px-2 dark:border-neutral-800 dark:bg-neutral-950",
          // The whole header is the drag handle in edit mode (the grip is just a hint).
          editMode && "dashboard-card-drag-handle cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {editMode && <GripVertical className="h-4 w-4 shrink-0 text-neutral-400" />}
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{card.title}</span>
          {isFetching && !isLoading && (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-neutral-400" aria-label="Updating" />
          )}
          {truncated && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              {data?.meta.maxRows} row limit
            </span>
          )}
        </div>
        {editMode && (
          <div className="dashboard-card-no-drag flex shrink-0 items-center gap-0.5">
            <Button type="button" size="smIcon" variant="ghost" onClick={onEdit} aria-label="Edit card">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="smIcon" variant="ghost" onClick={onClone} aria-label="Duplicate card">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="smIcon" variant="ghost" onClick={onRemove} aria-label="Remove card">
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        )}
      </div>

      <div className={cn("relative flex min-h-0 flex-1 flex-col p-1", isTable ? "overflow-hidden" : "overflow-visible")}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-red-500">
            {error instanceof Error ? error.message : "Failed to run query"}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500">No data</div>
        ) : card.vizType === "table" ? (
          <ResultsTable columns={columns} rows={sortedRows} sort={activeSort} onSortChange={setSort} />
        ) : (
          <div className="min-h-0 flex-1">
            {card.vizType === "line" ? (
              <DashboardLineChart rows={rows} mapping={card.mapping} />
            ) : card.vizType === "area" ? (
              <DashboardLineChart rows={rows} mapping={card.mapping} area />
            ) : card.vizType === "bar" ? (
              <DashboardBarChart rows={rows} mapping={card.mapping} />
            ) : card.vizType === "hbar" ? (
              <DashboardBarList rows={rows} mapping={card.mapping} />
            ) : card.vizType === "pie" ? (
              <DashboardPie rows={rows} mapping={card.mapping} />
            ) : card.vizType === "stat" ? (
              <DashboardStat rows={rows} mapping={card.mapping} />
            ) : card.vizType === "map" ? (
              <DashboardMap rows={rows} mapping={card.mapping} />
            ) : card.vizType === "calendar" ? (
              <DashboardCalendar rows={rows} mapping={card.mapping} />
            ) : (
              <DashboardBarChart rows={rows} mapping={card.mapping} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
