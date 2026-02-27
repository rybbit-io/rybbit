import React, { useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnDef,
  FilterFn,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UptimeMonitor, useMonitors } from "@/api/uptime/monitors";
import { Skeleton } from "@/components/ui/skeleton";
import { getTimezone } from "@/lib/store";
import { Radio, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { StatusOrb } from "./StatusOrb";
import { UptimeBar } from "./UptimeBar";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Pagination } from "../../../../components/pagination";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";

interface MonitorsTableProps {
  onMonitorClick?: (monitor: UptimeMonitor) => void;
}

// Define the fuzzy filter function
const fuzzyFilter: FilterFn<UptimeMonitor> = (row, columnId, value, addMeta) => {
  const search = value.toLowerCase();
  const monitor = row.original;

  // Search in name (if it exists)
  if (monitor.name && monitor.name.toLowerCase().includes(search)) return true;

  // Search in URL/host
  if (monitor.monitorType === "http" && monitor.httpConfig?.url?.toLowerCase().includes(search)) return true;
  if (monitor.monitorType === "tcp" && monitor.tcpConfig?.host?.toLowerCase().includes(search)) return true;

  // Search in type
  if (monitor.monitorType.toLowerCase().includes(search)) return true;

  return false;
};

const formatLastPing = (lastCheckedAt?: string) => {
  if (!lastCheckedAt) return "-";

  const lastPing = DateTime.fromSQL(lastCheckedAt, {
    zone: "utc",
  }).setZone(getTimezone());

  const now = DateTime.now();
  const diffMs = now.toMillis() - lastPing.toMillis();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return "just now";
};

const formatPercentage = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return `${value.toFixed(1)}%`;
};

// Create column helper
const columnHelper = createColumnHelper<UptimeMonitor>();

// Sort header component
const SortHeader = ({ column, children }: any) => {
  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted ? isSorted === "asc" : true)}
      className="p-0 hover:bg-transparent"
    >
      {children}
      {isSorted ? (
        isSorted === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
};

export function MonitorsTable({ onMonitorClick }: MonitorsTableProps) {
  const { data: monitors = [], isLoading } = useMonitors();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "status",
        header: () => <Radio className="ml-2 w-4 h-4" />,
        cell: ({ row }) => (
          <div className="text-center">
            <StatusOrb status={row.original.status?.currentStatus || "unknown"} />
          </div>
        ),
        size: 48,
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => <SortHeader column={column}>Monitor</SortHeader>,
        cell: ({ row }) => {
          const displayName =
            row.original.name ||
            (row.original.monitorType === "http"
              ? row.original.httpConfig?.url
              : `${row.original.tcpConfig?.host}:${row.original.tcpConfig?.port}`);
          const subtext = row.original.name
            ? row.original.monitorType === "http"
              ? row.original.httpConfig?.url
              : `${row.original.tcpConfig?.host}:${row.original.tcpConfig?.port}`
            : null;

          return (
            <div>
              <div className="font-medium">{displayName}</div>
              {subtext && <div className="text-xs text-neutral-500">{subtext}</div>}
            </div>
          );
        },
      }),
      columnHelper.accessor("monitorType", {
        header: ({ column }) => <SortHeader column={column}>Type</SortHeader>,
        cell: ({ getValue }) => {
          const type = getValue();
          return (
            <span
              className={cn(
                "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full",
                type === "http" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
              )}
            >
              {type.toUpperCase()}
            </span>
          );
        },
        size: 96,
      }),
      columnHelper.display({
        id: "uptime-bar",
        header: "Last 7 Days",
        cell: ({ row }) => <UptimeBar monitorId={row.original.id} />,
        size: 192,
      }),
      columnHelper.accessor(row => row.status?.lastCheckedAt, {
        id: "lastPing",
        header: ({ column }) => <SortHeader column={column}>Last Ping</SortHeader>,
        cell: ({ getValue }) => <span className="text-neutral-300">{formatLastPing(getValue())}</span>,
        size: 112,
      }),
      columnHelper.accessor(row => row.status?.uptimePercentage7d, {
        id: "uptimePercentage",
        header: ({ column }) => (
          <SortHeader column={column}>
            <span className="whitespace-nowrap">Uptime %</span>
          </SortHeader>
        ),
        cell: ({ getValue }) => <div className="text-right text-neutral-300">{formatPercentage(getValue())}</div>,
        size: 80,
      }),
    ],
    []
  );

  // Create table instance
  const table = useReactTable({
    data: monitors,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter,
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search monitors by name, URL, or type..."
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        className="max-w-sm bg-neutral-900"
      />
      <div className="rounded-lg border border-neutral-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize() === 150 ? undefined : header.getSize(),
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-4 rounded-full mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-neutral-500 py-8">
                  {globalFilter ? "No monitors match your search" : "No monitors configured"}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-neutral-900/50"
                  onClick={() => onMonitorClick?.(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && monitors.length > 0 && (
        <Pagination
          table={table}
          data={{
            items: table.getFilteredRowModel().rows.map(row => row.original),
            total: table.getFilteredRowModel().rows.length,
          }}
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName="monitors"
        />
      )}
    </div>
  );
}
