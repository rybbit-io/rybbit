export interface MonitorConfig {
  // HTTP config
  url?: string;
  method?: string;
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

  // TCP config
  host?: string;
  port?: number;

  // DNS config
  hostname?: string;
  recordType?: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA";
  expectedValue?: string;

  // SMTP config
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpAuth?: {
    user?: string;
    pass?: string;
  };
}

export interface ValidationRule {
  type: string;
  operator?: string;
  value?: any;
  header?: string;
  caseSensitive?: boolean;
}

export interface ExecuteRequest {
  jobId: string;
  monitorId: number;
  monitorType: "http" | "tcp" | "dns" | "smtp" | "ping";
  config: MonitorConfig;
  validationRules: ValidationRule[];
}

export interface TimingInfo {
  dnsMs?: number;
  tcpMs?: number;
  tlsMs?: number;
  ttfbMs?: number;
  transferMs?: number;
}

export interface ErrorInfo {
  message: string;
  type: string;
}

export interface ExecuteResponse {
  jobId: string;
  region: string;
  status: "success" | "failure" | "timeout";
  responseTimeMs: number;
  statusCode?: number;
  headers?: Record<string, string>;
  timing?: TimingInfo;
  error?: ErrorInfo;
  validationErrors?: string[];
  bodySizeBytes?: number;
}

export interface HttpCheckResult {
  status: "success" | "failure" | "timeout";
  statusCode?: number;
  responseTimeMs: number;
  timing: TimingInfo;
  headers: Record<string, string>;
  bodySizeBytes: number;
  validationErrors: string[];
  error?: ErrorInfo;
}

export interface TcpCheckResult {
  status: "success" | "failure" | "timeout";
  responseTimeMs: number;
  validationErrors?: string[];
  error?: ErrorInfo;
}

export interface DnsCheckResult {
  status: "success" | "failure" | "timeout";
  responseTimeMs: number;
  answers?: any[];
  error?: ErrorInfo;
}

export interface SmtpCheckResult {
  status: "success" | "failure" | "timeout";
  responseTimeMs: number;
  error?: ErrorInfo;
}