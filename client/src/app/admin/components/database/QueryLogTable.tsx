"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DateTime } from "luxon";
import { format as formatSql } from "sql-formatter";
import { useClickhouseQueryLog } from "@/api/admin/hooks/useClickhouseStats";
import { QueryLogEntry, QueryLogParams } from "@/api/admin/endpoints/clickhouseStats";
import { getTimezone } from "../../../../lib/store";

function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

type SortColumn = QueryLogParams["sortBy"];
type SortOrder = "asc" | "desc";

function SortableHeader({
  column,
  label,
  currentSort,
  currentOrder,
  onSort,
}: {
  column: string;
  label: string;
  currentSort: SortColumn;
  currentOrder: SortOrder;
  onSort: (col: string) => void;
}) {
  const isActive = currentSort === column;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

export function QueryLogTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortColumn>("event_time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [queryKind, setQueryKind] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<QueryLogEntry | null>(null);

  const params: QueryLogParams = {
    page,
    pageSize,
    sortBy,
    sortOrder,
    ...(queryKind && { queryKind }),
    ...(type && { type }),
  };

  const { data, isLoading, isFetching } = useClickhouseQueryLog(params);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  if (data?.unavailable) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        <p>Feature unavailable</p>
        <p className="text-xs mt-1">system.query_log is disabled to save disk space</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Kind:</span>
          <Select value={queryKind || "all"} onValueChange={(v) => { setQueryKind(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Select">Select</SelectItem>
              <SelectItem value="Insert">Insert</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Status:</span>
          <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="QueryFinish">Success</SelectItem>
              <SelectItem value="ExceptionWhileProcessing">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-neutral-400">Updating...</span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden dark:border-neutral-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="event_time" label="Time" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <TableHead>User</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <SortableHeader column="query_duration_ms" label="Duration" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader column="read_rows" label="Rows Read" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader column="read_bytes" label="Bytes Read" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader column="written_rows" label="Rows Written" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader column="memory_usage" label="Memory" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <TableHead>Query</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(pageSize)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  </TableRow>
                ))
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    No queries found in the last 24 hours
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((entry, i) => {
                  const eventTime = DateTime.fromSQL(entry.eventTime, { zone: "utc" }).setZone(getTimezone());
                  const isError = entry.type === "ExceptionWhileProcessing";
                  return (
                    <TableRow key={`${entry.queryId}-${i}`} className={isError ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {eventTime.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}
                      </TableCell>
                      <TableCell className="text-xs">{entry.user}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {entry.queryKind || "Other"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isError ? (
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-xs whitespace-nowrap ${entry.queryDurationMs > 5000 ? "text-amber-500" : ""}`}>
                        {formatDuration(entry.queryDurationMs)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatNumber(entry.readRows)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatBytes(entry.readBytes)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatNumber(entry.writtenRows)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatBytes(entry.memoryUsage)}</TableCell>
                      <TableCell>
                        <div
                          className="max-w-sm truncate font-mono text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          {entry.query}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Query Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={(open) => { if (!open) setSelectedEntry(null); }}>
        <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Query Details</SheetTitle>
            {selectedEntry && (
              <SheetDescription>
                {DateTime.fromSQL(selectedEntry.eventTime, { zone: "utc" }).toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}
                {" \u00b7 "}{selectedEntry.queryKind || "Other"}
                {" \u00b7 "}{selectedEntry.type === "ExceptionWhileProcessing" ? "Error" : "OK"}
              </SheetDescription>
            )}
          </SheetHeader>
          {selectedEntry && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">User</span>
                  <p className="font-medium">{selectedEntry.user}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Duration</span>
                  <p className="font-medium">{formatDuration(selectedEntry.queryDurationMs)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Rows Read</span>
                  <p className="font-medium">{formatNumber(selectedEntry.readRows)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Bytes Read</span>
                  <p className="font-medium">{formatBytes(selectedEntry.readBytes)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Rows Written</span>
                  <p className="font-medium">{formatNumber(selectedEntry.writtenRows)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Memory</span>
                  <p className="font-medium">{formatBytes(selectedEntry.memoryUsage)}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Query</span>
                <pre className="mt-1 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-[60vh]">
                  {(() => { try { return formatSql(selectedEntry.query, { language: "sql" }); } catch { return selectedEntry.query; } })()}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, data.total)} of {data.total.toLocaleString()} queries
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-neutral-400">Page size:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page <= 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-neutral-400">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="icon" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
