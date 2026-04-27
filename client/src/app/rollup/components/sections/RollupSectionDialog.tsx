"use client";
import { FilterParameter } from "@rybbit/shared";
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";
import { Loader2, SquareArrowOutUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode, useMemo, useState } from "react";
import { MetricResponse } from "@/api/analytics/endpoints";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { TableSortIndicator } from "@/components/ui/table";
import { cn, formatSecondsAsMinutesAndSeconds } from "@/lib/utils";
import { useRollupMetric } from "../../hooks/useRollupMetric";

const columnHelper = createColumnHelper<MetricResponse>();

export function RollupSectionDialog({
  title,
  filterParameter,
  siteIds,
  getLabel,
  getValue,
  getFilterLabel,
  getLink,
  expanded,
  close,
}: {
  title: string;
  filterParameter: FilterParameter;
  siteIds: number[];
  getLabel: (item: MetricResponse) => ReactNode;
  getValue: (item: MetricResponse) => string;
  getFilterLabel?: (item: MetricResponse) => string;
  getLink?: (item: MetricResponse) => string;
  expanded: boolean;
  close: () => void;
}) {
  const t = useExtracted();
  const { data, isLoading } = useRollupMetric({
    siteIds,
    parameter: filterParameter,
    limit: 1000,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "count", desc: true },
  ]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const labelFn = getFilterLabel || getValue;
    const term = debouncedSearchTerm.toLowerCase();
    if (!term) return data;
    return data.filter((item) => String(labelFn(item)).toLowerCase().includes(term));
  }, [data, getFilterLabel, getValue, debouncedSearchTerm]);

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor("value", {
        header: title,
        cell: ({ row }) => (
          <div className="flex flex-row gap-1 items-center text-left">
            {getLabel(row.original)}
            {getLink && (
              <a
                rel="noopener noreferrer"
                href={getLink(row.original)}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                <SquareArrowOutUpRight
                  className="ml-0.5 w-3.5 h-3.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                  strokeWidth={3}
                />
              </a>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("count", {
        header: t("Sessions"),
        cell: (info) => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">
            {info.getValue().toLocaleString()}
          </div>
        ),
      }),
      columnHelper.accessor("percentage", {
        header: t("Session %"),
        cell: (info) => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">
            {info.getValue().toFixed(1)}%
          </div>
        ),
      }),
    ];

    if (filteredData.length > 0) {
      const sample = filteredData[0];
      if (sample.pageviews !== undefined) {
        cols.push(
          columnHelper.accessor("pageviews", {
            header: t("Pageviews"),
            cell: (info) => (
              <div className="flex flex-row gap-1 items-center sm:justify-end">
                {info.getValue()?.toLocaleString()}
              </div>
            ),
          }) satisfies ColumnDef<MetricResponse, number | undefined>
        );
      }
      if (sample.time_on_page_seconds !== undefined) {
        cols.push(
          columnHelper.accessor("time_on_page_seconds", {
            header: t("Duration"),
            cell: (info) => (
              <div className="text-right">
                {formatSecondsAsMinutesAndSeconds(
                  Math.round(info.getValue() ?? 0)
                )}
              </div>
            ),
          }) satisfies ColumnDef<MetricResponse, number | undefined>
        );
      }
      if (sample.bounce_rate !== undefined) {
        cols.push(
          columnHelper.accessor("bounce_rate", {
            header: t("Bounce Rate"),
            cell: (info) => (
              <div className="flex flex-row gap-1 items-center sm:justify-end">
                {info.getValue()?.toFixed(1)}%
              </div>
            ),
          }) satisfies ColumnDef<MetricResponse, number | undefined>
        );
      }
    }

    return cols;
  }, [filteredData, title, getLabel, getLink, t]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: false,
    sortDescFirst: true,
  });

  if (isLoading) {
    return (
      <ResponsiveDialog open={expanded} onOpenChange={close}>
        <ResponsiveDialogContent className="max-w-[1000px] w-[calc(100vw-2rem)] p-2 sm:p-4">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-600 dark:text-neutral-400" />
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog open={expanded} onOpenChange={close}>
      <ResponsiveDialogContent className="max-w-[1000px] w-screen max-h-[1000px] h-[calc(100vh-2rem)] p-2 sm:p-4 flex flex-col gap-2">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <Input
          type="text"
          placeholder={t("Filter {count} items...", {
            count: String(data.length),
          })}
          className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-xs"
          value={searchTerm}
          inputSize="sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="max-h-[85vh] overflow-auto relative overflow-x-auto">
          <table className="w-full text-xs text-left min-w-max">
            <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-850 [&_tr]:border-b-0">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b-0">
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={cn(
                        "h-8 px-2 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400 first:rounded-l-lg last:rounded-r-lg",
                        "font-medium whitespace-nowrap cursor-pointer select-none",
                        index === 0 ? "text-left" : "text-right"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          index !== 0 && "justify-end"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        <TableSortIndicator
                          sortDirection={header.column.getIsSorted()}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0 bg-white dark:bg-neutral-900">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-b-neutral-100 dark:border-b-neutral-800"
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "p-2 align-middle relative",
                        cellIndex !== 0 && "text-right"
                      )}
                    >
                      <span className="relative z-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
