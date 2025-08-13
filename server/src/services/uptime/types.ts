export interface MonitorCheckJob {
  monitorId: number;
  intervalSeconds: number;
}

export interface HttpCheckResult {
  status: "success" | "failure" | "timeout";
  statusCode?: number;
  responseTimeMs: number;
  timing: {
    dnsMs?: number;
    tcpMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
    transferMs?: number;
  };
  headers: Record<string, string>;
  bodySizeBytes: number;
  validationErrors: string[];
  error?: {
    message: string;
    type: string;
  };
}

export interface TcpCheckResult {
  status: "success" | "failure" | "timeout";
  responseTimeMs: number;
  validationErrors: string[];
  error?: {
    message: string;
    type: string;
  };
}

export type CheckResult = HttpCheckResult | TcpCheckResult;

export interface ValidationRule {
  type:
    | "status_code"
    | "response_time"
    | "response_body_contains"
    | "response_body_not_contains"
    | "header_exists"
    | "header_value"
    | "response_size";
  operator?: "equals" | "not_equals" | "in" | "not_in" | "less_than" | "greater_than" | "contains";
  value?: number | number[] | string;
  header?: string;
  caseSensitive?: boolean;
}

export interface MonitorEvent {
  monitor_id: number;
  organization_id: string;
  timestamp: string;  // ClickHouse DateTime format: YYYY-MM-DD HH:MM:SS
  monitor_type: string;
  monitor_url: string;
  monitor_name: string;
  region: string;
  status: string;
  status_code?: number;
  response_time_ms: number;
  dns_time_ms?: number;
  tcp_time_ms?: number;
  tls_time_ms?: number;
  ttfb_ms?: number;
  transfer_time_ms?: number;
  validation_errors: string[];
  response_headers: Record<string, string>;
  response_size_bytes?: number;
  port?: number;
  error_message?: string;
  error_type?: string;
}
