import React from "react";
import { DateTime } from "luxon";
import { TableCell, TableRow } from "@/components/ui/table";
import { getTimezone } from "@/lib/store";
import { StatusOrb } from "./StatusOrb";
import { UptimeBar } from "./UptimeBar";
import { UptimeMonitor, useMonitorUptime } from "@/api/uptime/monitors";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MonitorTableRowProps {
  monitor: UptimeMonitor;
  onClick?: () => void;
}

const formatResponseTime = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return `${Math.round(value)}ms`;
};

const formatPercentage = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return `${value.toFixed(1)}%`;
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

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export function MonitorTableRow({ monitor, onClick }: MonitorTableRowProps) {
  const stats = monitor.status;
  const { data: uptimeData, isLoading: isLoadingUptime } = useMonitorUptime(monitor.id);

  return (
    <TableRow className="cursor-pointer hover:bg-neutral-900/50" onClick={onClick}>
      <TableCell className="text-center">
        <StatusOrb status={stats?.currentStatus || "unknown"} />
      </TableCell>
      <TableCell className="font-medium">
        <div>{monitor.name}</div>
        <div className="text-xs text-neutral-500">
          {monitor.monitorType === "http"
            ? monitor.httpConfig?.url
            : `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`}
        </div>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full",
            monitor.monitorType === "http" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
          )}
        >
          {monitor.monitorType.toUpperCase()}
        </span>
      </TableCell>
      <TableCell>
        <UptimeBar monitorId={monitor.id} />
      </TableCell>
      <TableCell>{formatLastPing(stats?.lastCheckedAt)}</TableCell>
      <TableCell className="text-right">{formatPercentage(stats?.uptimePercentage7d)}</TableCell>
      <TableCell className="text-right">
        {isLoadingUptime ? (
          <Skeleton className="h-4 w-16 inline-block" />
        ) : uptimeData ? (
          formatUptime(uptimeData.currentUptimeSeconds)
        ) : (
          "-"
        )}
      </TableCell>
    </TableRow>
  );
}
