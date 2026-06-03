"use client";

import type { DashboardCard } from "@rybbit/shared";
import { GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboardCard } from "../../../../api/analytics/hooks/useDashboardCard";
import { Button } from "../../../../components/ui/button";
import { ResultsTable } from "../../query/components/ResultsTable";
import type { SortState } from "../../query/types";
import { getColumns, sortRows } from "../../query/utils";
import { DashboardBarChart } from "./charts/DashboardBarChart";
import { DashboardLineChart } from "./charts/DashboardLineChart";

type DashboardCardViewProps = {
  siteId: number;
  card: DashboardCard;
  editMode: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

export function DashboardCardView({ siteId, card, editMode, onEdit, onRemove }: DashboardCardViewProps) {
  const { data, isLoading, error } = useDashboardCard(siteId, card.id, card.sql);
  const [sort, setSort] = useState<SortState>(null);

  const rows = data?.data ?? [];
  const columns = useMemo(() => getColumns(rows), [rows]);
  const activeSort = sort && columns.includes(sort.column) ? sort : null;
  const sortedRows = useMemo(() => sortRows(rows, activeSort), [rows, activeSort]);
  const truncated = data?.meta && data.meta.rowCount >= data.meta.maxRows;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-neutral-150 bg-neutral-50 px-2 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex min-w-0 items-center gap-1.5">
          {editMode && (
            <GripVertical className="dashboard-card-drag-handle h-4 w-4 shrink-0 cursor-grab text-neutral-400" />
          )}
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{card.title}</span>
          {truncated && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              {data?.meta.maxRows} row limit
            </span>
          )}
        </div>
        {editMode && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button type="button" size="smIcon" variant="ghost" onClick={onEdit} aria-label="Edit card">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="smIcon" variant="ghost" onClick={onRemove} aria-label="Remove card">
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-1">
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
        ) : card.vizType === "line" ? (
          <div className="min-h-0 flex-1">
            <DashboardLineChart rows={rows} mapping={card.mapping} />
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <DashboardBarChart rows={rows} mapping={card.mapping} />
          </div>
        )}
      </div>
    </div>
  );
}
