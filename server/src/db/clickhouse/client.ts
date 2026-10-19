import { createClient } from "@clickhouse/client";
import { QUERY_REQUEST_TIMEOUT_MS } from "./queryLimits.js";

export const CLICKHOUSE_REQUEST_TIMEOUT_MS = 300_000;

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  password: process.env.CLICKHOUSE_PASSWORD,
  request_timeout: CLICKHOUSE_REQUEST_TIMEOUT_MS,
  // Gzip query results on the wire (sends enable_http_compression=1 and
  // Accept-Encoding: gzip). Dashboard results such as session lists and replay
  // events can be MBs of JSON, and ClickHouse usually runs on another host.
  // Inserts stay uncompressed: gzipping every batch would cost Node CPU on the
  // ingestion path. The main user is never readonly=1 (it inserts), so it can
  // set enable_http_compression.
  compression: { response: true, request: false },
  clickhouse_settings: {
    // Writers serialise every instant as ISO-8601 with an explicit `Z` (see
    // dateTime.ts). The default `basic` parser rejects the offset; best_effort
    // honours it, so the stored epoch no longer depends on the server timezone.
    // Only affects parsing of inserted text, not date functions in queries.
    date_time_input_format: "best_effort",
  },
});

// Least-privilege connection for user-authored SQL (custom query page and
// dashboard cards). queryUser.ts provisions `rybbit_query` at startup with
// SELECT on the events table only, a row policy limiting it to the sites in
// each request's siteScopeHeaders(), no table-function grants
// (url/s3/file/remote…), readonly=2, and its own memory/time/concurrency
// limits. The SQL validator is defense-in-depth on top of this — a validator
// bypass must still land inside these grants and the caller's sites.
export const CLICKHOUSE_QUERY_USER = process.env.CLICKHOUSE_QUERY_USER || "rybbit_query";

// No response compression here: results are capped at 1,000 rows, and a
// hand-created readonly=1 user would reject the enable_http_compression setting.
export const clickhouseQuery = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  username: CLICKHOUSE_QUERY_USER,
  password: process.env.CLICKHOUSE_QUERY_PASSWORD || process.env.CLICKHOUSE_PASSWORD,
  request_timeout: QUERY_REQUEST_TIMEOUT_MS,
});
