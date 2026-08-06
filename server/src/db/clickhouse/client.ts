import { createClient } from "@clickhouse/client";

export const CLICKHOUSE_REQUEST_TIMEOUT_MS = 300_000;

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  password: process.env.CLICKHOUSE_PASSWORD,
  request_timeout: CLICKHOUSE_REQUEST_TIMEOUT_MS,
});
