"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { CustomQueryRow } from "../../../../api/analytics/endpoints";
import { TableSortIndicator } from "../../../../components/ui/table";
import type { SortState } from "../types";
import { formatCellValue, getNextSortState } from "../utils";

type ResultsTableProps = {
  columns: string[];
  rows: CustomQueryRow[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
};

export function ResultsTable({ columns, rows, sort, onSortChange }: ResultsTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 26,
    overscan: 16,
  });
  const gridTemplateColumns = `repeat(${columns.length}, minmax(160px, 1fr))`;
  const minWidth = `${columns.length * 180}px`;

  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={headerScrollRef}
        className="shrink-0 overflow-hidden border-b border-neutral-100 dark:border-neutral-800"
      >
        <div
          role="row"
          className="grid min-h-7 bg-neutral-50 text-[11px] font-medium text-neutral-500 dark:bg-neutral-850 dark:text-neutral-400"
          style={{ gridTemplateColumns, minWidth }}
        >
          {columns.map(column => {
            const sortDirection = sort?.column === column ? sort.direction : undefined;

            return (
              <div
                key={column}
                role="columnheader"
                aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none"}
                className="min-w-0 border-r border-neutral-100 last:border-r-0 dark:border-neutral-800"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSortChange(getNextSortState(sort, column));
                    scrollContainerRef.current?.scrollTo({ top: 0 });
                  }}
                  className="flex h-7 w-full items-center justify-between gap-2 px-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="truncate">{column}</span>
                  <TableSortIndicator sortDirection={sortDirection} className="shrink-0" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto" onScroll={handleBodyScroll}>
        <div
          className="relative bg-white dark:bg-neutral-900"
          style={{ height: rowVirtualizer.getTotalSize(), minWidth }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.key}
                role="row"
                className="absolute left-0 grid min-h-[26px] w-full border-b border-neutral-100 bg-white text-[11px] transition-colors hover:bg-neutral-0 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/20"
                style={{
                  gridTemplateColumns,
                  minWidth,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map(column => (
                  <div
                    key={column}
                    role="cell"
                    className="min-w-0 truncate whitespace-nowrap border-r border-neutral-100 px-1.5 py-1 font-mono last:border-r-0 dark:border-neutral-800"
                    title={formatCellValue(row[column])}
                  >
                    {formatCellValue(row[column])}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
