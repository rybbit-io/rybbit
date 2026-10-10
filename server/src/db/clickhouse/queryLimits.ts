// Shared by query-user provisioning, the HTTP client, and custom-query responses.
export const QUERY_USER_LIMITS = {
  maxExecutionTimeSeconds: 60,
  maxMemoryUsageBytes: 4_000_000_000,
  maxThreads: 4,
  maxResultRows: 1000,
  maxConcurrentQueriesForUser: 8,
  maxBytesBeforeExternalBytes: 2_000_000_000,
} as const;

// Let ClickHouse return its execution-timeout error before the socket times out.
export const QUERY_REQUEST_TIMEOUT_MS = (QUERY_USER_LIMITS.maxExecutionTimeSeconds + 15) * 1000;
