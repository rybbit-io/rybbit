import { createClient } from "@clickhouse/client";
import { QUERY_REQUEST_TIMEOUT_MS } from "./queryLimits.js";

export const CLICKHOUSE_REQUEST_TIMEOUT_MS = 300_000;

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  password: process.env.CLICKHOUSE_PASSWORD,
  request_timeout: CLICKHOUSE_REQUEST_TIMEOUT_MS,
});

// Least-privilege connection for user-authored SQL (custom query page and
// dashboard cards). queryUser.ts provisions `rybbit_query` at startup with
// SELECT on the events table only, no table-function grants (url/s3/file/remote…),
// readonly=2, and its own
// memory/time/concurrency limits. The SQL validator is defense-in-depth on top
// of this — a validator bypass must still land inside these grants.
export const CLICKHOUSE_QUERY_USER = process.env.CLICKHOUSE_QUERY_USER || "rybbit_query";

export const clickhouseQuery = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  username: CLICKHOUSE_QUERY_USER,
  password: process.env.CLICKHOUSE_QUERY_PASSWORD || process.env.CLICKHOUSE_PASSWORD,
  request_timeout: QUERY_REQUEST_TIMEOUT_MS,
});
