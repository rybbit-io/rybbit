import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableSortIndicator } from "@/components/ui/table";
import { FilterParameter } from "@rybbit/shared";
import {
  ColumnDef,
  ColumnHelper,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useDebounce, useIntersectionObserver } from "@uidotdev/usehooks";
import { Loader2, SquareArrowOutUpRight } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useInfiniteMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { MetricResponse } from "../../../../../api/analytics/endpoints";
import { addFilter } from "../../../../../lib/store";
import { cn, formatSecondsAsMinutesAndSeconds } from "../../../../../lib/utils";

interface StandardSectionDialogProps {
  title: string;
  ratio: number;
  getKey: (item: MetricResponse) => string;
  getLabel: (item: MetricResponse) => ReactNode;
  getValue: (item: MetricResponse) => string;
  getFilterLabel?: (item: MetricResponse) => string;
  getLink?: (item: MetricResponse) => string;
  countLabel?: string;
  filterParameter: FilterParameter;
  expanded?: boolean;
  close: () => void;
}

const columnHelper = createColumnHelper<MetricResponse>();

export function StandardSectionDialog({
  title,
  ratio,
  getKey,
  getLabel,
  getValue,
  getFilterLabel,
  getLink,
  countLabel,
  filterParameter,
  expanded,
  close,
}: StandardSectionDialogProps) {
  const { data, isLoading, isFetching, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteMetric({
      parameter: filterParameter,
      limit: 100,
    });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const [sorting, setSorting] = useState<SortingState>([{ id: "count", desc: true }]);

  // Use the intersection observer hook
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px", // Load more when user is 200px from the bottom
  });

  // Flatten the pages data
  const allItems = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!allItems) return [];

    const labelFnToUse = getFilterLabel || getValue;

    return allItems.filter((item: MetricResponse) => {
      const label = typeof labelFnToUse(item) === "string" ? (labelFnToUse(item) as string) : labelFnToUse(item);

      return String(label).toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [allItems, getFilterLabel, getValue, debouncedSearchTerm]);

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor("value", {
        header: title,
        cell: ({ row }) => (
          <div className="flex flex-row gap-1 items-center text-left">
            {getLabel(row.original)}
            {getLink && (
              <a href={getLink(row.original)} target="_blank" onClick={e => e.stopPropagation()}>
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
        header: "Sessions",
        cell: info => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue().toLocaleString()}</div>
        ),
      }),
      columnHelper.accessor("percentage", {
        header: "Session %",
        cell: info => (
          <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue().toFixed(1)}%</div>
        ),
      }),
    ];

    // Only check for additional columns if we have data
    if (filteredData.length > 0) {
      const hasPageviews =
        filteredData[0]?.pageviews !== undefined && filteredData[0]?.pageviews_percentage !== undefined;
      if (hasPageviews) {
        cols.push(
          columnHelper.accessor("pageviews", {
            header: "Pageviews",
            cell: info => (
              <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue()?.toLocaleString()}</div>
            ),
          }) satisfies ColumnDef<MetricResponse, number>
        );
        cols.push(
          columnHelper.accessor("pageviews_percentage", {
            header: "Pageviews %",
            cell: info => (
              <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue()?.toFixed(1)}%</div>
            ),
          }) satisfies ColumnDef<MetricResponse, number>
        );
      }

      const hasDuration = filteredData[0]?.time_on_page_seconds !== undefined;
      if (hasDuration) {
        cols.push(
          columnHelper.accessor("time_on_page_seconds", {
            header: "Duration",
            cell: info => (
              <div className="text-right">{formatSecondsAsMinutesAndSeconds(Math.round(info.getValue() ?? 0))}</div>
            ),
          }) satisfies ColumnDef<MetricResponse, number>
        );
      }

      const hasBounceRate = filteredData[0]?.bounce_rate !== undefined;
      if (hasBounceRate) {
        cols.push(
          columnHelper.accessor("bounce_rate", {
            header: "Bounce Rate",
            cell: info => (
              <div className="flex flex-row gap-1 items-center sm:justify-end">{info.getValue()?.toFixed(1)}%</div>
            ),
          }) satisfies ColumnDef<MetricResponse, number>
        );
      }
    }

    return cols;
  }, [filteredData, title, getLabel, getLink]);

  // Fetch next page when intersection observer detects the target is visible
  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  // Set up table instance
  const table = useReactTable({
    data: filteredData || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    manualSorting: false,
    sortDescFirst: true,
  });

  if (isLoading || !data) {
    return (
      <Dialog open={expanded} onOpenChange={close}>
        <DialogContent className="max-w-[1000px] w-[calc(100vw-2rem)] p-2 sm:p-4">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-600 dark:text-neutral-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  const totalCount = data.pages[0]?.totalCount || 0;

  return (
    <Dialog open={expanded} onOpenChange={close}>
      <DialogContent className="max-w-[1000px] w-screen max-h-[1000px] h-[calc(100vh-2rem)] p-2 sm:p-4 flex flex-col gap-2">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          type="text"
          placeholder={`Filter ${allItems.length} items...`}
          className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-xs"
          value={searchTerm}
          inputSize="sm"
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="max-h-[85vh] overflow-auto relative overflow-x-auto">
          <table className="w-full text-xs text-left min-w-max">
            <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-850 [&_tr]:border-b-0">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b-0">
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={cn(
                        "h-8 px-2 text-left align-middle font-medium text-neutral-500 dark:text-neutral-400 first:rounded-l-lg last:rounded-r-lg",
                        "font-medium whitespace-nowrap cursor-pointer select-none",
                        index === 0 ? "text-left" : "text-right"
                      )}
                      style={{
                        minWidth: header.id === "user_id" ? "100px" : "auto",
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className={cn("flex items-center gap-1", index !== 0 && "justify-end")}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        <TableSortIndicator sortDirection={header.column.getIsSorted()} />
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0 bg-white dark:bg-neutral-900">
              {table.getRowModel().rows.map(row => {
                return (
                  <tr
                    key={row.id}
                    className="border-b border-b-neutral-100 transition-colors hover:bg-neutral-100/50 dark:border-b-neutral-800 dark:hover:bg-neutral-800/20 cursor-pointer group"
                    onClick={() =>
                      addFilter({
                        parameter: filterParameter,
                        value: [getValue(row.original)],
                        type: "equals",
                      })
                    }
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "p-2 align-middle [&:has([role=checkbox])]:pr-0 *:[role=checkbox]:translate-y-[2px]",
                          "relative",
                          cellIndex !== 0 && "text-right"
                        )}
                      >
                        <span className="relative z-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Infinite scroll loading indicator and observer anchor */}
          {filteredData.length > 0 && (
            <div ref={ref} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more...
                </div>
              )}
              {!hasNextPage && !isFetchingNextPage && (
                <div className="text-neutral-500 dark:text-neutral-500 text-xs">All items loaded</div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
