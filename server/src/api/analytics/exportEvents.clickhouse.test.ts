import { createClient } from "@clickhouse/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Run against any ClickHouse using CLICKHOUSE_TEST_URL and optional
// CLICKHOUSE_TEST_USER / CLICKHOUSE_TEST_PASSWORD. Each run creates its own
// database holding an `events` table with the production column types; the
// handlers read it through the mocked client.
const database = vi.hoisted(() => `export_test_${Date.now()}`);
const clientConfig = vi.hoisted(() => ({
  url: process.env.CLICKHOUSE_TEST_URL,
  username: process.env.CLICKHOUSE_TEST_USER ?? "default",
  password: process.env.CLICKHOUSE_TEST_PASSWORD ?? "",
}));
vi.mock("../../db/clickhouse/clickhouse.js", async () => {
  const { createClient } = await import("@clickhouse/client");
  return { clickhouse: process.env.CLICKHOUSE_TEST_URL ? createClient({ ...clientConfig, database }) : {} };
});

import Fastify from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import {
  buildExportCountQuery,
  buildExportQuery,
  EXPORT_MAX_ROWS,
  exportEvents,
  exportFilename,
  getExportEventsCount,
  parseExportFormat,
} from "./exportEvents.js";

describe("Event export: parameters", () => {
  it("defaults to CSV and rejects unknown formats", () => {
    expect(parseExportFormat(undefined)).toBe("csv");
    expect(parseExportFormat("")).toBe("csv");
    expect(parseExportFormat("ndjson")).toBe("ndjson");
    expect(parseExportFormat("parquet")).toBeNull();
    expect(parseExportFormat("toString")).toBeNull();
  });

  it("names the file after the range", () => {
    expect(exportFilename(7, { start_date: "2026-01-01", end_date: "2026-01-31" }, "csv")).toBe(
      "rybbit-7-events-2026-01-01-to-2026-01-31.csv"
    );
    expect(exportFilename(7, {}, "ndjson")).toBe("rybbit-7-events-all-time.ndjson");
  });
});

describe.skipIf(!process.env.CLICKHOUSE_TEST_URL)("Event export: ClickHouse results", () => {
  let client: ReturnType<typeof createClient>;
  const run = async (sql: string, format: "csv" | "ndjson" | "count") => {
    if (format === "count") {
      const result = await client.query({ query: sql, query_params: { siteId: 1 }, format: "JSONEachRow" });
      return result.json<{ rows: string }>();
    }
    const result = await client.exec({ query: sql, query_params: { siteId: 1 } });
    let text = "";
    for await (const chunk of result.stream) text += chunk.toString();
    return text;
  };

  beforeAll(async () => {
    await createClient(clientConfig).command({ query: `CREATE DATABASE ${database}` });
    client = createClient({ ...clientConfig, database });
    await client.command({
      query: `CREATE TABLE events (
        site_id UInt16, timestamp DateTime('UTC'), timestamp_ms DateTime64(3, 'UTC'),
        session_id String, user_id String, hostname String, pathname String, querystring String,
        page_title String, referrer String, channel String,
        browser LowCardinality(String), browser_version LowCardinality(String),
        operating_system LowCardinality(String), operating_system_version LowCardinality(String),
        language LowCardinality(String), country LowCardinality(FixedString(2)),
        region LowCardinality(String), city String, lat Float64, lon Float64,
        screen_width UInt16, screen_height UInt16, device_type LowCardinality(String),
        type LowCardinality(String), event_name String, props JSON,
        lcp Nullable(Float64), cls Nullable(Float64), inp Nullable(Float64), fcp Nullable(Float64), ttfb Nullable(Float64),
        ip Nullable(String), identified_user_id String, tag LowCardinality(String)
      ) ENGINE = MergeTree ORDER BY (site_id, timestamp)`,
    });
    await client.command({
      query: `INSERT INTO events
        (site_id, timestamp, timestamp_ms, session_id, pathname, type, event_name, props, country, ip, page_title)
        VALUES
        (1, '2026-09-10 09:00:00', '2026-09-10 09:00:00.123', 's1', '/', 'pageview', '', '{}', 'US', '1.2.3.4', 'Home, "quoted"'),
        (1, '2026-09-10 09:00:05', '2026-09-10 09:00:05.000', 's1', '/pricing', 'custom_event', 'signup', '{"plan":"pro","seats":3}', 'US', '1.2.3.4', ''),
        (1, '2026-09-11 09:00:00', '2026-09-11 09:00:00.000', 's2', '/', 'pageview', '', '{}', 'DE', '5.6.7.8', ''),
        (2, '2026-09-10 09:00:00', '2026-09-10 09:00:00.000', 's3', '/', 'pageview', '', '{}', 'FR', '9.9.9.9', '')`,
    });
  });

  afterAll(async () => {
    await client?.command({ query: `DROP DATABASE IF EXISTS ${database}` });
    await client?.close();
    await (clickhouse as ReturnType<typeof createClient>).close?.();
  });

  const day = { start_date: "2026-09-10", end_date: "2026-09-10", time_zone: "UTC" };

  it("writes CSV with a header, ISO timestamps, quoted fields and no IP", async () => {
    const csv = (await run(buildExportQuery(day, 1, "csv"), "csv")) as string;
    const lines = csv.trim().split("\n");
    expect(lines[0]).toMatch(/^"timestamp","type","event_name","props","session_id"/);
    expect(lines[0]).not.toContain("ip");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"2026-09-10T09:00:00.123Z","pageview"');
    expect(lines[1]).toContain('"Home, ""quoted"""');
    expect(lines[2]).toContain('"signup"');
    expect(csv).not.toContain("1.2.3.4");
  });

  it("writes NDJSON with props as an object, oldest first", async () => {
    const ndjson = (await run(buildExportQuery(day, 1, "ndjson"), "ndjson")) as string;
    const rows = ndjson
      .trim()
      .split("\n")
      .map(line => JSON.parse(line));
    expect(rows.map(row => row.timestamp)).toEqual(["2026-09-10T09:00:00.123Z", "2026-09-10T09:00:05.000Z"]);
    expect(rows[1].props.plan).toBe("pro");
    expect(rows[0]).not.toHaveProperty("ip");
  });

  it("exports all time when no range is given, and applies filters", async () => {
    const all = (await run(buildExportQuery({}, 1, "ndjson"), "ndjson")) as string;
    expect(all.trim().split("\n")).toHaveLength(3);

    const filters = JSON.stringify([{ parameter: "country", type: "equals", value: ["DE"] }]);
    const filtered = (await run(buildExportQuery({ filters }, 1, "ndjson"), "ndjson")) as string;
    expect(
      filtered
        .trim()
        .split("\n")
        .map(line => JSON.parse(line).session_id)
    ).toEqual(["s2"]);
  });

  it("counts the same rows the export returns", async () => {
    const count = async (query: Parameters<typeof buildExportCountQuery>[0]) =>
      Number(((await run(buildExportCountQuery(query, 1), "count")) as { rows: string }[])[0].rows);
    expect(await count(day)).toBe(2);
    expect(await count({})).toBe(3);
  });

  const app = () => {
    const fastify = Fastify();
    fastify.get("/sites/:siteId/export/events", exportEvents);
    fastify.get("/sites/:siteId/export/events/count", getExportEventsCount);
    return fastify;
  };

  it("streams the file with download headers over a real socket", async () => {
    const fastify = app();
    const address = await fastify.listen({ port: 0, host: "127.0.0.1" });
    try {
      const response = await fetch(
        `${address}/sites/1/export/events?start_date=2026-09-10&end_date=2026-09-10&time_zone=UTC`
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
      expect(response.headers.get("content-disposition")).toBe(
        'attachment; filename="rybbit-1-events-2026-09-10-to-2026-09-10.csv"'
      );
      expect(response.headers.get("x-export-rows")).toBe("2");
      expect((await response.text()).trim().split("\n")).toHaveLength(3);
    } finally {
      await fastify.close();
    }
  });

  it("reports the count and rejects unknown formats", async () => {
    const count = await app().inject({ url: "/sites/1/export/events/count" });
    expect(count.json()).toEqual({ data: { rows: 3, maxRows: EXPORT_MAX_ROWS } });

    const bad = await app().inject({ url: "/sites/1/export/events?format=xml" });
    expect(bad.statusCode).toBe(400);
  });
});
