"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { UptimeMonitor, useMonitor, useMonitorStats, useMonitorUptime } from "../../../../api/uptime/monitors";
import { StandardPage } from "../../../../components/StandardPage";
import { INTERVAL_OPTIONS } from "../components/dialog/GeneralTab";
import { MonitorActions } from "../components/MonitorActions";
import { MonitorResponseTimeChart } from "../components/MonitorResponseTimeChart";
import { StatusOrb } from "../components/StatusOrb";
import { useUptimeStore } from "../components/uptimeStore";
import { getHoursFromTimeRange } from "../components/utils";
import { EventsTable } from "./components/EventsTable";
import { FilterBar } from "./components/FilterBar";

interface StatCardProps {
  label: string;
  value: string;
  isLoading?: boolean;
}

const formatResponseTime = (value?: number) => {
  if (!value) return "-";
  return `${Math.round(value)}ms`;
};

const formatPercentage = (value?: number) => {
  if (!value) return "-";
  return `${value.toFixed(1)}%`;
};

const formatUptime = (seconds?: number) => {
  if (!seconds) return "-";
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

const formatInterval = (seconds?: number) => {
  const interval = INTERVAL_OPTIONS.find((interval) => interval.value === seconds);
  return interval?.label || `${seconds}s`;
};

function StatCard({ label, value, isLoading }: StatCardProps) {
  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-850">
      <div className="p-3 pb-0 text-sm text-neutral-500 flex items-center gap-2 font-normal">{label}</div>
      <div className="p-3 py-2">
        {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-xl font-semibold">{value}</p>}
      </div>
    </div>
  );
}

const getMonitorName = (monitor: UptimeMonitor) => {
  return (
    monitor.name ||
    (monitor.monitorType === "http" ? monitor.httpConfig?.url : `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`)
  );
};

const MonitorHeader = ({ monitor, isLoadingMonitor }: { monitor?: UptimeMonitor; isLoadingMonitor: boolean }) => {
  if (isLoadingMonitor) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-64" /> {/* Monitor name */}
          <Skeleton className="h-4 w-4 rounded-full" /> {/* Status orb */}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Skeleton className="h-4 w-4" /> {/* Status text */}
          <span className="text-neutral-500">•</span>
          <Skeleton className="h-4 w-40" /> {/* URL/host */}
          <span className="text-neutral-500">•</span>
          <Skeleton className="h-4 w-28" /> {/* Interval */}
        </div>
      </div>
    );
  }
  if (!monitor) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{getMonitorName(monitor)}</h1>
        <StatusOrb status={monitor.status?.currentStatus || "unknown"} size="lg" />
      </div>
      <p className="text-sm text-neutral-300 mt-1 flex items-center gap-2">
        <span
          className={cn("font-medium", monitor.status?.currentStatus === "up" ? "text-green-400" : "text-red-500/80")}
        >
          {monitor.status?.currentStatus === "up" ? "Up" : "Down"}
        </span>
        •
        <span>
          {monitor.monitorType === "http"
            ? monitor.httpConfig?.url
            : `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`}
        </span>
        •<span>every {formatInterval(monitor.intervalSeconds)}</span>
      </p>
    </div>
  );
};

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const monitorId = parseInt(params.monitorId as string);

  const { timeRange, selectedRegion } = useUptimeStore();
  const { data: monitor, isLoading: isLoadingMonitor } = useMonitor(monitorId);
  const { data: stats, isLoading: isLoadingStats } = useMonitorStats(monitorId, {
    hours: getHoursFromTimeRange(timeRange),
    region: selectedRegion,
  });

  const { data: uptimeData, isLoading: isLoadingUptime } = useMonitorUptime(monitorId);

  if (!monitor && !isLoadingMonitor) {
    return (
      <StandardPage showSidebar={false}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Monitor not found</h2>
          <Button onClick={() => router.push("/uptime")} variant="outline">
            Back to Monitors
          </Button>
        </div>
      </StandardPage>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/uptime/monitors")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-start justify-between">
          <MonitorHeader monitor={monitor} isLoadingMonitor={isLoadingMonitor} />
          <MonitorActions monitor={monitor} />
        </div>
        <FilterBar monitor={monitor} isLoading={isLoadingMonitor} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Uptime" value={formatPercentage(stats?.stats.uptimePercentage)} isLoading={isLoadingStats} />
          <StatCard
            label="Current Uptime"
            value={formatUptime(uptimeData?.currentUptimeSeconds)}
            isLoading={isLoadingUptime}
          />
          <StatCard label="P50" value={formatResponseTime(stats?.stats.responseTime.p50)} isLoading={isLoadingStats} />
          <StatCard label="P90" value={formatResponseTime(stats?.stats.responseTime.p90)} isLoading={isLoadingStats} />
          <StatCard label="P95" value={formatResponseTime(stats?.stats.responseTime.p95)} isLoading={isLoadingStats} />
          <StatCard label="P99" value={formatResponseTime(stats?.stats.responseTime.p99)} isLoading={isLoadingStats} />
        </div>

        {/* Response Time Chart */}
        <MonitorResponseTimeChart monitor={monitor} monitorId={monitorId} isLoading={isLoadingMonitor} />
        <EventsTable monitor={monitor} monitorId={monitorId} />
      </div>
    </>
  );
}
