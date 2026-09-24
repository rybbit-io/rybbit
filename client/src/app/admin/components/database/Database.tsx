"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClickhouseStats } from "@/api/admin/hooks/useClickhouseStats";
import { RowsTrendChart } from "./RowsTrendChart";
import { InsertRateChart } from "./InsertRateChart";
import { QueryLogTable } from "./QueryLogTable";
import { RefreshControls } from "./RefreshControls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "../shared/Panel";
import { StatStrip } from "../shared/StatStrip";

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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  }
  return bytes + " B";
}

function TableStatsTable({ tableStats, isLoading }: { tableStats: any[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!tableStats || tableStats.length === 0) {
    return (
      <div className="py-8 text-center text-neutral-500 dark:text-neutral-400">
        No table statistics available
      </div>
    );
  }

  return (
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
              <TableCell className="text-right text-xs tabular-nums">{formatNumber(table.totalRows)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{table.compressedSize}</TableCell>
              <TableCell className="text-right text-xs tabular-nums">{table.uncompressedSize}</TableCell>
              <TableCell className="text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {compressionRatio}%
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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

  const tableStats = stats?.tableStats;
  const totalRows = tableStats?.reduce((sum, t) => sum + t.totalRows, 0) ?? 0;
  const totalCompressedBytes = tableStats?.reduce((sum, t) => sum + t.compressedBytes, 0) ?? 0;
  const totalUncompressedBytes = tableStats?.reduce((sum, t) => sum + t.uncompressedBytes, 0) ?? 0;
  const totalParts = tableStats?.reduce((sum, t) => sum + t.partsCount, 0) ?? 0;
  const compressionRatio =
    totalUncompressedBytes > 0 ? ((1 - totalCompressedBytes / totalUncompressedBytes) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">ClickHouse</h2>
        <RefreshControls lastUpdated={lastUpdated} onRefresh={handleRefresh} isRefetching={isRefetching} />
      </div>

      <StatStrip
        isLoading={statsLoading}
        stats={[
          {
            label: "Total rows",
            value: tableStats ? formatNumber(totalRows) : "-",
            hint: tableStats ? `across ${tableStats.length} tables` : undefined,
          },
          {
            label: "Compressed",
            value: tableStats ? formatBytes(totalCompressedBytes) : "-",
            hint: tableStats ? `${compressionRatio}% compression` : undefined,
          },
          {
            label: "Uncompressed",
            value: tableStats ? formatBytes(totalUncompressedBytes) : "-",
            hint: tableStats ? "original size" : undefined,
          },
          {
            label: "Parts",
            value: tableStats ? formatNumber(totalParts) : "-",
            hint: tableStats ? "active data parts" : undefined,
          },
        ]}
      />

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="query-log">Query Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Table statistics" flush>
              <TableStatsTable tableStats={tableStats} isLoading={statsLoading} />
            </Panel>

            <Panel title="Insert rate (last 24h)">
              <InsertRateChart
                insertRate={stats?.insertRate}
                isLoading={statsLoading}
                isUnavailable={isInsertRateUnavailable}
              />
            </Panel>
          </div>

          <Panel
            title="Rows inserted by table"
            actions={
              <Select value={String(rowsDays)} onValueChange={v => setRowsDays(Number(v))}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
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
            }
          >
            <RowsTrendChart rowsByDate={stats?.rowsByDate} isLoading={statsLoading} days={rowsDays} />
          </Panel>
        </TabsContent>

        <TabsContent value="query-log" className="mt-4">
          <Panel title="Query log" actions={<span className="text-xs text-neutral-500 dark:text-neutral-400">last 24 hours</span>}>
            <QueryLogTable />
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
