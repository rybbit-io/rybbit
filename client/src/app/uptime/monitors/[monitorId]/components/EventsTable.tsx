"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { getTimezone } from "@/lib/store";
import { Loader2 } from "lucide-react";
import { DateTime } from "luxon";
import React, { useMemo, useState } from "react";
import { MonitorEvent, UptimeMonitor, useMonitorEventsInfinite } from "../../../../../api/uptime/monitors";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../components/ui/table";
import { CountryFlag } from "../../../../[site]/components/shared/icons/CountryFlag";
import { useUptimeStore } from "../../components/uptimeStore";
import { REGIONS } from "../../const";
import { EventDetailsRow } from "./EventDetailsRow";
import { InlineTimingWaterfall } from "./InlineTimingWaterfall";

const columnHelper = createColumnHelper<MonitorEvent>();

export function EventsTable({ monitor, monitorId }: { monitor?: UptimeMonitor; monitorId: number }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { selectedRegion } = useUptimeStore();

  const {
    data,
    isLoading: isLoadingEvents,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMonitorEventsInfinite(monitorId, {
    region: selectedRegion,
  });

  // Flatten all pages of events
  const allEvents = useMemo(() => {
    return data?.pages.flatMap(page => page.events) || [];
  }, [data]);

  const toggleRow = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "status",
        header: () => <div className="w-8"></div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.original.status === "success" ? (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
        ),
        size: 40,
      }),
      columnHelper.accessor("timestamp", {
        header: "Time",
        cell: ({ row }) => {
          const timestamp = DateTime.fromSQL(row.original.timestamp, { zone: "utc" });
          return (
            <div className="text-sm">
              <div className="">{timestamp.setZone(getTimezone()).toFormat("MMM dd, HH:mm:ss")}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor("status_code", {
        header: "Status",
        cell: ({ row }) => {
          const code = row.original.status_code;
          if (!code) return <span className="text-neutral-500">-</span>;

          if (code >= 500) {
            return <Badge variant="destructive">{code}</Badge>;
          }
          if (code >= 400) {
            return <Badge variant="warning">{code}</Badge>;
          }
          if (code >= 300) {
            return <Badge variant="info">{code}</Badge>;
          }
          if (code >= 200) {
            return <Badge variant="success">{code}</Badge>;
          }
          return <Badge variant="secondary">{code}</Badge>;
        },
      }),
      columnHelper.accessor("response_time_ms", {
        header: "Latency",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.response_time_ms ? `${Math.round(row.original.response_time_ms)}ms` : "-"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "timings",
        header: "Timings",
        cell: ({ row }) => <InlineTimingWaterfall event={row.original} />,
      }),
      // Conditionally add region column for global monitoring
      ...(monitor?.monitoringType === "global"
        ? [
            columnHelper.accessor("region", {
              header: "Region",
              cell: ({ row }) => {
                const region = REGIONS.find(r => r.code === row.original.region);
                return (
                  <span className="text-sm flex items-center gap-2">
                    <CountryFlag country={region?.countryCode || "US"} className="w-5 h-5" />
                    <span className="text-sm">{region?.name || "-"}</span>
                  </span>
                );
              },
            }),
          ]
        : []),
    ],
    [monitor?.monitoringType]
  );

  // Create table instance
  const table = useReactTable({
    data: allEvents,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              {isLoadingEvents ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {/* Status dot */}
                    <TableCell className="w-10">
                      <div className="flex justify-center">
                        <Skeleton className="h-2 w-2 rounded-full" />
                      </div>
                    </TableCell>
                    {/* Time */}
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    {/* Status Code */}
                    <TableCell>
                      <Skeleton className="h-6 w-12" />
                    </TableCell>
                    {/* Latency */}
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    {/* Timings */}
                    <TableCell>
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    {/* Region - only show for global monitoring */}
                    {monitor?.monitoringType === "global" && (
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-neutral-500 py-8">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <TableRow className="cursor-pointer hover:bg-neutral-900/50" onClick={() => toggleRow(row.id)}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>

                    {expandedRows.has(row.id) && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="p-0">
                          <EventDetailsRow event={row.original} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Infinite scroll loader */}
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more events...
            </Button>
          </div>
        )}

        {/* Load more button (as fallback) */}
        {hasNextPage && !isFetchingNextPage && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
