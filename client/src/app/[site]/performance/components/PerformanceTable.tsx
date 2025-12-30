"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSortIndicator,
} from "@/components/ui/table";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Monitor, Smartphone, Tablet, SquareArrowOutUpRight } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { useGetSite } from "../../../../api/admin/sites";
import { useGetPerformanceByDimension } from "../../../../api/analytics/hooks/performance/useGetPerformanceByDimension";
import { PerformanceByDimensionItem } from "../../../../api/analytics/endpoints";
import { Pagination } from "../../../../components/pagination";
import { FilterParameter } from "@rybbit/shared";
import { useStore, addFilter, removeFilter } from "../../../../lib/store";
import { PerformanceMetric, usePerformanceStore } from "../performanceStore";
import { formatMetricValue, getMetricColor, getMetricUnit } from "../utils/performanceUtils";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { Browser } from "../../components/shared/icons/Browser";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { getCountryName } from "../../../../lib/utils";
import { MetricTooltip } from "./shared/MetricTooltip";
import { CardLoader } from "../../../../components/ui/card";

const MetricCell = ({
  metric,
  value,
  percentile,
}: {
  metric: PerformanceMetric;
  value: number | null | undefined;
  percentile: string;
}) => {
  if (value === null || value === undefined) {
    return <span className="text-neutral-500">-</span>;
  }

  return (
    <span className={getMetricColor(metric, value)}>
      {formatMetricValue(metric, value)}
      <span className="text-xs ml-1 text-neutral-400">{getMetricUnit(metric, value)}</span>
    </span>
  );
};

const columnHelper = createColumnHelper<PerformanceByDimensionItem>();

interface PerformanceTableProps {
  dimension: string;
  title: string;
}

// Custom hook for filter handling logic
const useFilterToggle = () => {
  const filters = useStore(state => state.filters);

  const toggleFilter = useCallback(
    (parameter: FilterParameter, value: string) => {
      const foundFilter = filters.find(f => f.parameter === parameter && f.value.some(v => v === value));
      if (foundFilter) {
        removeFilter(foundFilter);
      } else {
        addFilter({
          parameter,
          value: [value],
          type: "equals",
        });
      }
    },
    [filters]
  );

  return toggleFilter;
};

export function PerformanceTable({ dimension, title }: PerformanceTableProps) {
  const { site } = useStore();
  const { data: siteMetadata } = useGetSite();
  const { selectedPercentile } = usePerformanceStore();
  const toggleFilter = useFilterToggle();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  const [sorting, setSorting] = useState<SortingState>([{ id: "event_count", desc: true }]);

  const {
    data: performanceData,
    isLoading,
    isFetching,
  } = useGetPerformanceByDimension({
    site,
    dimension,
    page: pagination.pageIndex + 1, // API expects 1-based page numbers
    limit: pagination.pageSize,
    sortBy: sorting[0]?.id || "event_count",
    sortOrder: sorting[0]?.desc ? "desc" : "asc",
  });

  const paths = performanceData?.data ?? [];
  const totalCount = performanceData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);

  // Create columns based on selected percentile and dimension
  const columns = useMemo(
    () => [
      columnHelper.accessor(dimension, {
        header:
          dimension === "pathname"
            ? "Path"
            : dimension === "country"
              ? "Country"
              : dimension === "device_type"
                ? "Device Type"
                : dimension === "browser"
                  ? "Browser"
                  : dimension === "operating_system"
                    ? "Operating System"
                    : dimension.charAt(0).toUpperCase() + dimension.slice(1),
        cell: info => {
          const value = info.getValue();
          const displayValue = value || (dimension === "pathname" ? "/" : "Unknown");

          const handleClick = () => {
            if (value) {
              toggleFilter(dimension as FilterParameter, value);
            }
          };

          return (
            <div
              className="text-neutral-900 dark:text-white max-w-[300px] truncate flex items-center gap-2 cursor-pointer hover:underline"
              onClick={handleClick}
            >
              {dimension === "country" && value ? (
                <>
                  <CountryFlag country={value} />
                  {getCountryName(value) || value}
                </>
              ) : dimension === "device_type" ? (
                <>
                  {value === "Desktop" ? (
                    <Monitor className="h-4 w-4" />
                  ) : value === "Mobile" ? (
                    <Smartphone className="h-4 w-4" />
                  ) : value === "Tablet" ? (
                    <Tablet className="h-4 w-4" />
                  ) : null}
                  {value || "Other"}
                </>
              ) : dimension === "browser" && value ? (
                <>
                  <Browser browser={value} />
                  {value || "Other"}
                </>
              ) : dimension === "operating_system" ? (
                <>
                  <OperatingSystem os={value || "Other"} />
                  {value || "Other"}
                </>
              ) : (
                <>
                  {displayValue}
                  {dimension === "pathname" && value && (
                    <a
                      href={`https://${siteMetadata?.domain}${value}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                    >
                      <SquareArrowOutUpRight
                        className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                        strokeWidth={3}
                      />
                    </a>
                  )}
                </>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor(`lcp_${selectedPercentile}`, {
        header: () => (
          <div className="flex items-center gap-1">
            LCP
            <MetricTooltip metric="lcp" />
          </div>
        ),
        cell: info => <MetricCell metric="lcp" value={info.getValue() as number} percentile={selectedPercentile} />,
      }),
      columnHelper.accessor(`cls_${selectedPercentile}`, {
        header: () => (
          <div className="flex items-center gap-1">
            CLS
            <MetricTooltip metric="cls" />
          </div>
        ),
        cell: info => <MetricCell metric="cls" value={info.getValue() as number} percentile={selectedPercentile} />,
      }),
      columnHelper.accessor(`inp_${selectedPercentile}`, {
        header: () => (
          <div className="flex items-center gap-1">
            INP
            <MetricTooltip metric="inp" />
          </div>
        ),
        cell: info => <MetricCell metric="inp" value={info.getValue() as number} percentile={selectedPercentile} />,
      }),
      columnHelper.accessor(`fcp_${selectedPercentile}`, {
        header: () => (
          <div className="flex items-center gap-1">
            FCP
            <MetricTooltip metric="fcp" />
          </div>
        ),
        cell: info => <MetricCell metric="fcp" value={info.getValue() as number} percentile={selectedPercentile} />,
      }),
      columnHelper.accessor(`ttfb_${selectedPercentile}`, {
        header: () => (
          <div className="flex items-center gap-1">
            TTFB
            <MetricTooltip metric="ttfb" />
          </div>
        ),
        cell: info => <MetricCell metric="ttfb" value={info.getValue() as number} percentile={selectedPercentile} />,
      }),
      columnHelper.accessor("event_count", {
        header: "Events",
        cell: info => (
          <div className="text-neutral-600 dark:text-neutral-300">{info.getValue()?.toLocaleString() ?? 0}</div>
        ),
      }),
    ],
    [selectedPercentile]
  );

  const table = useReactTable({
    data: paths,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: updater => {
      setSorting(updater);
      // Reset to first page when sorting changes
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    },
    state: {
      sorting,
    },
    // Disable client-side sorting since we're doing server-side sorting
    enableSortingRemoval: false,
    manualSorting: true,
  });

  // Create pagination controller that matches the interface
  const paginationController = {
    getState: () => ({ pagination }),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => pagination.pageIndex < totalPages - 1,
    getPageCount: () => totalPages,
    setPageIndex: (index: number) => setPagination(prev => ({ ...prev, pageIndex: index })),
    previousPage: () =>
      setPagination(prev => ({
        ...prev,
        pageIndex: Math.max(0, prev.pageIndex - 1),
      })),
    nextPage: () =>
      setPagination(prev => ({
        ...prev,
        pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1),
      })),
  };

  // Transform data to match expected format
  const paginationData = {
    items: paths,
    total: totalCount,
  };

  return (
    <>
      {isFetching && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-300 dark:border-neutral-800">
              <TableHead className="text-neutral-600 dark:text-neutral-300">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="text-neutral-600 dark:text-neutral-300 text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </TableHead>
              <TableHead className="text-neutral-600 dark:text-neutral-300 text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </TableHead>
              <TableHead className="text-neutral-600 dark:text-neutral-300 text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </TableHead>
              <TableHead className="text-neutral-600 dark:text-neutral-300 text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </TableHead>
              <TableHead className="text-neutral-600 dark:text-neutral-300 text-center">
                <Skeleton className="h-4 w-10 mx-auto" />
              </TableHead>
              <TableHead className="text-neutral-600 dark:text-neutral-300 text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead
                      key={header.id}
                      className={`text-neutral-600 dark:text-neutral-300 ${
                        header.column.getCanSort()
                          ? "cursor-pointer hover:text-white transition-colors select-none"
                          : ""
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <TableSortIndicator
                          sortDirection={header.column.getIsSorted()}
                          canSort={header.column.getCanSort()}
                        />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-neutral-500 py-8">
                    No performance data available
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                table={paginationController}
                data={paginationData}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={isLoading}
                itemName={dimension === "pathname" ? "paths" : dimension}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
