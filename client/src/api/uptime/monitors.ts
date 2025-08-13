import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../utils";
import { timeZone } from "../../lib/dateTimeUtils";

// Validation rule types
export type ValidationRule = 
  | {
      type: "status_code";
      operator: "equals" | "not_equals" | "in" | "not_in";
      value: number | number[];
    }
  | {
      type: "response_time";
      operator: "less_than" | "greater_than";
      value: number;
    }
  | {
      type: "response_body_contains" | "response_body_not_contains";
      value: string;
      caseSensitive?: boolean;
    }
  | {
      type: "header_exists";
      header: string;
    }
  | {
      type: "header_value";
      header: string;
      operator: "equals" | "contains";
      value: string;
    }
  | {
      type: "response_size";
      operator: "less_than" | "greater_than";
      value: number;
    };

export interface UptimeMonitor {
  id: number;
  organizationId: string;
  name: string;
  monitorType: "http" | "tcp";
  intervalSeconds: number;
  enabled: boolean;
  httpConfig?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    auth?: {
      type: "none" | "basic" | "bearer" | "api_key" | "custom_header";
      credentials?: {
        username?: string;
        password?: string;
        token?: string;
        headerName?: string;
        headerValue?: string;
      };
    };
    followRedirects?: boolean;
    timeoutMs?: number;
    ipVersion?: "any" | "ipv4" | "ipv6";
    userAgent?: string;
  };
  tcpConfig?: {
    host: string;
    port: number;
    timeoutMs?: number;
  };
  validationRules: ValidationRule[];
  monitoringType: "local" | "global";
  selectedRegions: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status?: {
    monitorId: number;
    lastCheckedAt?: string;
    currentStatus: "up" | "down" | "unknown";
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    uptimePercentage24h?: number;
    uptimePercentage7d?: number;
    uptimePercentage30d?: number;
    updatedAt: string;
  };
}

export interface MonitorStats {
  hours: number;
  startTime: string;
  endTime: string;
  region?: string;
  bucket?: string;
  monitorType?: string;
  stats: {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    timeoutChecks: number;
    uptimePercentage: number;
    responseTime: {
      avg: number;
      min: number;
      max: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  distribution: Array<{
    hour: string;
    avg_response_time: number;
    avg_dns_time?: number;
    avg_tcp_time?: number;
    avg_tls_time?: number;
    avg_ttfb?: number;
    avg_transfer_time?: number;
    check_count: number;
    success_count: number;
  }>;
}

export interface MonitorUptime {
  monitorId: number;
  totalUptimeSeconds: number;
  currentUptimeSeconds: number;
  totalMonitoringSeconds: number;
  lastDowntime: {
    timestamp: string;
    error?: string;
    errorType?: string;
    status: string;
  } | null;
  monitoringSince: string | null;
  lastCheck: string | null;
  uptimePercentage: number;
  totalChecks: number;
  failedChecks: number;
}

export interface MonitorEvent {
  monitor_id: number;
  organization_id: string;
  timestamp: string;
  monitor_type: string;
  monitor_url: string;
  monitor_name: string;
  region: string;
  status: "success" | "failure" | "timeout";
  status_code?: number;
  response_time_ms: number;
  dns_time_ms?: number;
  tcp_time_ms?: number;
  tls_time_ms?: number;
  ttfb_ms?: number;
  transfer_time_ms?: number;
  validation_errors?: string[];
  response_headers?: Record<string, string>;
  response_size_bytes?: number;
  port?: number;
  error_message?: string;
  error_type?: string;
}

async function getMonitors(params?: {
  organizationId?: string;
  enabled?: boolean;
  monitorType?: "http" | "tcp";
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.organizationId) queryParams.append("organizationId", params.organizationId);
  if (params?.enabled !== undefined) queryParams.append("enabled", params.enabled.toString());
  if (params?.monitorType) queryParams.append("monitorType", params.monitorType);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/uptime/monitors?${queryString}` : "/uptime/monitors";

  return authedFetch<UptimeMonitor[]>(url);
}

async function getMonitor(monitorId: number) {
  return authedFetch<UptimeMonitor>(`/uptime/monitors/${monitorId}`);
}

async function getMonitorStats(
  monitorId: number,
  params?: {
    startTime?: string;
    endTime?: string;
    region?: string;
    hours?: number;
    bucket?: "minute" | "five_minutes" | "ten_minutes" | "fifteen_minutes" | "hour" | "day" | "week" | "month" | "year";
  }
) {
  const queryParams = new URLSearchParams();

  if (params?.region) queryParams.append("region", params.region);
  if (params?.hours) queryParams.append("hours", params.hours.toString());
  if (params?.bucket) queryParams.append("bucket", params.bucket);

  const queryString = queryParams.toString();
  const url = queryString
    ? `/uptime/monitors/${monitorId}/stats?${queryString}`
    : `/uptime/monitors/${monitorId}/stats`;

  return authedFetch<MonitorStats>(url);
}

async function getMonitorEvents(
  monitorId: number,
  params?: {
    status?: "success" | "failure" | "timeout";
    region?: string;
    limit?: number;
    offset?: number;
  }
) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.region) queryParams.append("region", params.region);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const queryString = queryParams.toString();
  const url = queryString
    ? `/uptime/monitors/${monitorId}/events?${queryString}`
    : `/uptime/monitors/${monitorId}/events`;

  return authedFetch<{
    events: MonitorEvent[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }>(url);
}

async function getMonitorUptime(monitorId: number) {
  return authedFetch<MonitorUptime>(`/uptime/monitors/${monitorId}/uptime`);
}

async function getMonitorUptimeBuckets(
  monitorId: number,
  params?: {
    bucket?: "hour" | "day" | "week";
    days?: number;
  }
) {
  const queryParams = new URLSearchParams();
  if (params?.bucket) queryParams.append("bucket", params.bucket);
  if (params?.days) queryParams.append("days", params.days.toString());

  queryParams.append("timeZone", timeZone);

  const queryString = queryParams.toString();
  const url = queryString
    ? `/uptime/monitors/${monitorId}/buckets?${queryString}`
    : `/uptime/monitors/${monitorId}/buckets`;

  return authedFetch<{
    buckets: Array<{
      bucket_time: string;
      bucket_formatted: string;
      total_checks: number;
      successful_checks: number;
      failed_checks: number;
      timeout_checks: number;
      uptime_percentage: number;
    }>;
    bucket: string;
    days: number;
    monitorId: number;
  }>(url);
}

// Hooks
export function useMonitors(params?: Parameters<typeof getMonitors>[0]) {
  return useQuery({
    queryKey: ["uptime-monitors", params],
    queryFn: () => getMonitors(params),
  });
}

export function useMonitor(monitorId: number | undefined) {
  return useQuery({
    queryKey: ["uptime-monitor", monitorId],
    queryFn: () => (monitorId ? getMonitor(monitorId) : Promise.reject("No monitor ID")),
    enabled: !!monitorId,
  });
}

export function useMonitorStats(monitorId: number | undefined, params?: Parameters<typeof getMonitorStats>[1]) {
  return useQuery({
    queryKey: ["uptime-monitor-stats", monitorId, params],
    queryFn: () => (monitorId ? getMonitorStats(monitorId, params) : Promise.reject("No monitor ID")),
    enabled: !!monitorId,
  });
}

export function useMonitorEvents(monitorId: number | undefined, params?: Parameters<typeof getMonitorEvents>[1]) {
  return useQuery({
    queryKey: ["uptime-monitor-events", monitorId, params],
    queryFn: () => (monitorId ? getMonitorEvents(monitorId, params) : Promise.reject("No monitor ID")),
    enabled: !!monitorId,
  });
}

export function useMonitorEventsInfinite(
  monitorId: number | undefined,
  params?: Omit<Parameters<typeof getMonitorEvents>[1], "offset">
) {
  return useInfiniteQuery({
    queryKey: ["uptime-monitor-events-infinite", monitorId, params],
    queryFn: ({ pageParam = 0 }) =>
      monitorId
        ? getMonitorEvents(monitorId, { ...params, offset: pageParam, limit: 100 })
        : Promise.reject("No monitor ID"),
    getNextPageParam: (lastPage, pages) => {
      const currentOffset = (pages.length - 1) * 100;
      const hasMore = currentOffset + lastPage.events.length < lastPage.pagination.total;
      return hasMore ? currentOffset + 100 : undefined;
    },
    enabled: !!monitorId,
    initialPageParam: 0,
  });
}

export function useMonitorUptime(monitorId: number | undefined) {
  return useQuery({
    queryKey: ["uptime-monitor-uptime", monitorId],
    queryFn: () => (monitorId ? getMonitorUptime(monitorId) : Promise.reject("No monitor ID")),
    enabled: !!monitorId,
  });
}

export function useMonitorUptimeBuckets(
  monitorId: number | undefined,
  params?: Parameters<typeof getMonitorUptimeBuckets>[1]
) {
  return useQuery({
    queryKey: ["uptime-monitor-buckets", monitorId, params],
    queryFn: () => (monitorId ? getMonitorUptimeBuckets(monitorId, params) : Promise.reject("No monitor ID")),
    enabled: !!monitorId,
  });
}

// Mutations
export interface CreateMonitorInput {
  organizationId: string;
  name: string;
  monitorType: "http" | "tcp";
  intervalSeconds: number;
  enabled?: boolean;
  httpConfig?: UptimeMonitor["httpConfig"];
  tcpConfig?: UptimeMonitor["tcpConfig"];
  validationRules?: ValidationRule[];
  regions?: string[];
}

export interface UpdateMonitorInput {
  name?: string;
  intervalSeconds?: number;
  enabled?: boolean;
  httpConfig?: UptimeMonitor["httpConfig"];
  tcpConfig?: UptimeMonitor["tcpConfig"];
  validationRules?: ValidationRule[];
  regions?: string[];
}

async function createMonitor(data: CreateMonitorInput) {
  return authedFetch(
    `/uptime/monitors`,
    undefined,
    { method: 'POST', data }
  );
}

async function updateMonitor(monitorId: number, data: UpdateMonitorInput) {
  return authedFetch(
    `/uptime/monitors/${monitorId}`,
    undefined,
    { method: 'PUT', data }
  );
}

async function deleteMonitor(monitorId: number) {
  return authedFetch(
    `/uptime/monitors/${monitorId}`,
    undefined,
    { method: 'DELETE' }
  );
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMonitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uptime-monitors"] });
    },
  });
}

export function useUpdateMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monitorId, data }: { monitorId: number; data: UpdateMonitorInput }) =>
      updateMonitor(monitorId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["uptime-monitors"] });
      queryClient.invalidateQueries({ queryKey: ["uptime-monitor", variables.monitorId] });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMonitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uptime-monitors"] });
    },
  });
}
