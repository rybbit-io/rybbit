"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
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

const MIN_COLUMN_WIDTH = 80;
const DEFAULT_COLUMN_WIDTH = 180;

export function ResultsTable({ columns, rows, sort, onSortChange }: ResultsTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerCellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  // Holds the teardown for an in-flight column drag so it can be run on unmount.
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 26,
    overscan: 16,
  });

  const startResize = (column: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth =
      columnWidths[column] ?? headerCellRefs.current[column]?.getBoundingClientRect().width ?? DEFAULT_COLUMN_WIDTH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX);
      setColumnWidths(prev => ({ ...prev, [column]: nextWidth }));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      resizeCleanupRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    resizeCleanupRef.current = handleMouseUp;
  };

  // Tear down any in-flight drag if the table unmounts mid-resize.
  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const gridTemplateColumns = columns
    .map(column => (columnWidths[column] ? `${columnWidths[column]}px` : "minmax(160px, 1fr)"))
    .join(" ");
  const minWidth = `${columns.reduce((total, column) => total + (columnWidths[column] ?? DEFAULT_COLUMN_WIDTH), 0)}px`;

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
                ref={element => {
                  headerCellRefs.current[column] = element;
                }}
                role="columnheader"
                aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none"}
                className="relative min-w-0 border-r border-neutral-100 last:border-r-0 dark:border-neutral-800"
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
                <div
                  role="separator"
                  aria-orientation="vertical"
                  onMouseDown={event => startResize(column, event)}
                  onClick={event => event.stopPropagation()}
                  className="absolute right-0 top-0 z-10 h-full w-1.5 translate-x-1/2 cursor-col-resize select-none hover:bg-blue-400/60"
                />
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
