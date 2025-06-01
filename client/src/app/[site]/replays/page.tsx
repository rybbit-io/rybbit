"use client";

import { useState } from "react";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import {
  useGetReplaySessions,
  type ReplaySession,
} from "../../../api/analytics/replay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { TablePagination } from "../../../components/pagination";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Play, Clock, User, Globe, HardDrive } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DateTime } from "luxon";

export default function ReplaysPage() {
  const pathname = usePathname();
  const siteId = pathname.split("/")[1];

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [userIdFilter, setUserIdFilter] = useState("");

  const { data, isLoading, error } = useGetReplaySessions({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    user_id: userIdFilter || undefined,
  });

  const formatDuration = (durationMs: number) => {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDateTime = (dateString: string) => {
    return DateTime.fromISO(dateString).toFormat("MMM dd, yyyy HH:mm");
  };

  // Create a simple pagination controller for the TablePagination component
  const paginationController = {
    getState: () => ({ pagination }),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => {
      if (!data?.pagination) return false;
      return pagination.pageIndex < data.pagination.totalPages - 1;
    },
    getPageCount: () => data?.pagination?.totalPages || 1,
    setPageIndex: (index: number) => {
      setPagination((prev) => ({ ...prev, pageIndex: index }));
    },
    previousPage: () => {
      setPagination((prev) => ({
        ...prev,
        pageIndex: Math.max(0, prev.pageIndex - 1),
      }));
    },
    nextPage: () => {
      setPagination((prev) => ({
        ...prev,
        pageIndex: Math.min(
          (data?.pagination?.totalPages || 1) - 1,
          prev.pageIndex + 1
        ),
      }));
    },
  };

  return (
    <DisabledOverlay message="Session Replays">
      <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
        <SubHeader />

        <div className="space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : data?.pagination?.total || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Duration
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading
                    ? "..."
                    : data?.sessions?.length
                    ? formatDuration(
                        data.sessions.reduce(
                          (acc, session) => acc + session.duration_ms,
                          0
                        ) / data.sessions.length
                      )
                    : "0s"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Storage
                </CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading
                    ? "..."
                    : data?.sessions?.length
                    ? formatFileSize(
                        data.sessions.reduce(
                          (acc, session) => acc + session.compressed_size_bytes,
                          0
                        )
                      )
                    : "0 KB"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Filter by User ID
                  </label>
                  <Input
                    placeholder="Enter user ID..."
                    value={userIdFilter}
                    onChange={(e) => setUserIdFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setUserIdFilter("")}
                    disabled={!userIdFilter}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Session Replays</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8 text-red-500">
                  Error loading sessions: {error.message}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Page URL</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Loading sessions...
                          </TableCell>
                        </TableRow>
                      ) : data?.sessions?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            No session replays found
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.sessions?.map((session: ReplaySession) => (
                          <TableRow key={session.session_id}>
                            <TableCell>
                              <div className="font-mono text-xs">
                                {session.session_id.slice(0, 8)}...
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-xs">
                                  {session.user_id.slice(0, 8)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {formatDuration(session.duration_ms)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {session.event_count}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 max-w-[200px]">
                                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span
                                  className="text-xs truncate"
                                  title={session.page_url}
                                >
                                  {session.page_url}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(session.start_time)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">
                                {formatFileSize(session.compressed_size_bytes)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/${siteId}/replays/${session.session_id}`}
                              >
                                <Button size="sm" variant="outline">
                                  <Play className="h-4 w-4 mr-1" />
                                  Play
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {data?.sessions && data.sessions.length > 0 && (
                    <div className="mt-4">
                      <TablePagination
                        table={paginationController}
                        data={{
                          items: data.sessions,
                          total: data.pagination.total,
                        }}
                        pagination={pagination}
                        setPagination={setPagination}
                        isLoading={isLoading}
                        itemName="sessions"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DisabledOverlay>
  );
}
