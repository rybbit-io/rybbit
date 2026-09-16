import { createClient } from "@clickhouse/client";

export const CLICKHOUSE_REQUEST_TIMEOUT_MS = 300_000;

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  password: process.env.CLICKHOUSE_PASSWORD,
  request_timeout: CLICKHOUSE_REQUEST_TIMEOUT_MS,
  clickhouse_settings: {
    // Writers serialise every instant as ISO-8601 with an explicit `Z` (see
    // dateTime.ts). The default `basic` parser rejects the offset; best_effort
    // honours it, so the stored epoch no longer depends on the server timezone.
    // Only affects parsing of inserted text, not date functions in queries.
    date_time_input_format: "best_effort",
  },
});

// Least-privilege connection for user-authored SQL (custom query page and
// dashboard cards). The `rybbit_query` user is defined in the ClickHouse
// users.d config shipped in docker-compose: SELECT on the events table only,
// no table-function grants (url/s3/file/remote…), readonly=2, and its own
// memory/time/concurrency limits. The SQL validator is defense-in-depth on top
// of this — a validator bypass must still land inside these grants.
export const CLICKHOUSE_QUERY_USER = process.env.CLICKHOUSE_QUERY_USER || "rybbit_query";

export const clickhouseQuery = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  username: CLICKHOUSE_QUERY_USER,
  password: process.env.CLICKHOUSE_QUERY_PASSWORD || process.env.CLICKHOUSE_PASSWORD,
  request_timeout: 30_000,
});
