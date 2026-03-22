"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClickhouseStats } from "@/api/admin/hooks/useClickhouseStats";
import { TableStatsCards } from "./TableStatsCards";
import { RowsTrendChart } from "./RowsTrendChart";
import { InsertRateChart } from "./InsertRateChart";
import { QueryLogTable } from "./QueryLogTable";
import { RefreshControls } from "./RefreshControls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + "K";
  }
  return num.toLocaleString();
}

function TableStatsTable({ tableStats, isLoading }: { tableStats: any[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!tableStats || tableStats.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        No table statistics available
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden dark:border-neutral-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Table</TableHead>
            <TableHead className="text-right">Rows</TableHead>
            <TableHead className="text-right">Compressed</TableHead>
            <TableHead className="text-right">Uncompressed</TableHead>
            <TableHead className="text-right">Ratio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableStats.map(table => {
            const compressionRatio =
              table.uncompressedBytes > 0
                ? ((1 - table.compressedBytes / table.uncompressedBytes) * 100).toFixed(1)
                : "0";
            return (
              <TableRow key={table.table}>
                <TableCell className="font-medium font-mono text-xs">{table.table}</TableCell>
                <TableCell className="text-right text-xs">{formatNumber(table.totalRows)}</TableCell>
                <TableCell className="text-right text-xs">{table.compressedSize}</TableCell>
                <TableCell className="text-right text-xs">{table.uncompressedSize}</TableCell>
                <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400">
                  {compressionRatio}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function Database() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [rowsDays, setRowsDays] = useState(30);

  const { data: stats, isLoading: statsLoading, isRefetching: statsRefetching, dataUpdatedAt } = useClickhouseStats(rowsDays);

  // Update last updated time when data changes
  if (dataUpdatedAt && (!lastUpdated || dataUpdatedAt > lastUpdated.getTime())) {
    setLastUpdated(new Date(dataUpdatedAt));
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["clickhouse-stats"] });
    queryClient.invalidateQueries({ queryKey: ["clickhouse-query-log"] });
  };

  const isRefetching = statsRefetching;

  const isInsertRateUnavailable = stats?.unavailableFeatures?.includes("insertRate") ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ClickHouse Database Health</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Monitor database performance and storage metrics
          </p>
        </div>
        <RefreshControls lastUpdated={lastUpdated} onRefresh={handleRefresh} isRefetching={isRefetching} />
      </div>

      <TableStatsCards tableStats={stats?.tableStats} isLoading={statsLoading} />

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="query-log">Query Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Table Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <TableStatsTable tableStats={stats?.tableStats} isLoading={statsLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Insert Rate (Last 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <InsertRateChart insertRate={stats?.insertRate} isLoading={statsLoading} isUnavailable={isInsertRateUnavailable} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rows Inserted by Table</CardTitle>
              <Select value={String(rowsDays)} onValueChange={(v) => setRowsDays(Number(v))}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 180 days</SelectItem>
                  <SelectItem value="365">Last 365 days</SelectItem>
                  <SelectItem value="0">All time</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <RowsTrendChart rowsByDate={stats?.rowsByDate} isLoading={statsLoading} days={rowsDays} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query-log" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Query Log
                <span className="ml-2 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                  (last 24 hours)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QueryLogTable />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
