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

import { Readable } from "node:stream";
import Fastify from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import {
  buildExportCountQuery,
  buildExportQuery,
  EXPORT_MAX_ROWS,
  exportEvents,
  exportFilename,
  failOnClickhouseException,
  getExportEventsCount,
  parseExportFormat,
} from "./exportEvents.js";

describe("Event export: mid-stream ClickHouse errors", () => {
  const consume = async (stream: NodeJS.ReadableStream) => {
    let text = "";
    for await (const chunk of stream) text += chunk.toString();
    return text;
  };

  it("fails a stream that ends in ClickHouse's tagged exception block, without forwarding it", async () => {
    const rows = "1,a\n".repeat(50_000);
    const block =
      "\r\n__exception__\r\nTAG\nCode: 241. DB::Exception: Memory limit exceeded\n52 TAG\r\n__exception__\r\n";
    let text = "";
    const guarded = failOnClickhouseException(Readable.from([Buffer.from(rows), Buffer.from(block)]), "TAG");
    guarded.on("data", chunk => (text += chunk.toString()));
    await expect(consume(guarded)).rejects.toThrow(/Memory limit exceeded/);
    expect(text).not.toContain("__exception__");
  });

  it("leaves streams without the response's tag alone", async () => {
    const body = "1,__exception__\r\nOTHER\n";
    expect(await consume(failOnClickhouseException(Readable.from([Buffer.from(body)]), "TAG"))).toBe(body);
    expect(await consume(failOnClickhouseException(Readable.from([Buffer.from(body)]), undefined))).toBe(body);
  });
});

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
  const run = async (sql: string, format: "csv" | "ndjson" | "count", siteId = 1) => {
    if (format === "count") {
      const result = await client.query({ query: sql, query_params: { siteId }, format: "JSONEachRow" });
      return result.json<{ rows: string }>();
    }
    const result = await client.exec({ query: sql, query_params: { siteId } });
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
    // Site 5: two inserts, so two parts, with the later millisecond written
    // first; and visitor strings a spreadsheet would run as formulas.
    const site5 = `INSERT INTO events (site_id, timestamp, timestamp_ms, session_id, pathname, type, event_name, props, page_title)`;
    await client.command({
      query: `${site5} VALUES (5, '2026-09-10 12:00:00', '2026-09-10 12:00:00.900', 'late', '=HYPERLINK("x")', 'custom_event', '+cmd', '{"a":"=1"}', '-2+3')`,
    });
    await client.command({
      query: `${site5} VALUES (5, '2026-09-10 12:00:00', '2026-09-10 12:00:00.100', 'early', '/ok', 'pageview', '', '{}', '@SUM(A1)')`,
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

  it("neutralizes formula-looking cells in CSV only", async () => {
    const site5 = { start_date: "2026-09-10", end_date: "2026-09-10", time_zone: "UTC" };
    const csv = (await run(buildExportQuery(site5, 5, "csv"), "csv", 5)) as string;
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"'+cmd"`);
    expect(csv).toContain(`"'-2+3"`);
    expect(csv).toContain(`"'@SUM(A1)"`);
    expect(csv).toContain(`"/ok"`);

    const ndjson = (await run(buildExportQuery(site5, 5, "ndjson"), "ndjson", 5)) as string;
    const rows = ndjson
      .trim()
      .split("\n")
      .map(line => JSON.parse(line));
    expect(rows.map(row => row.page_title)).toEqual(["@SUM(A1)", "-2+3"]);
  });

  it("orders events within a second by their milliseconds", async () => {
    const ndjson = (await run(buildExportQuery({}, 5, "ndjson"), "ndjson", 5)) as string;
    expect(
      ndjson
        .trim()
        .split("\n")
        .map(line => JSON.parse(line).session_id)
    ).toEqual(["early", "late"]);
  });

  it("filters on stored columns, not on the guarded CSV aliases", async () => {
    const filters = JSON.stringify([{ parameter: "pathname", type: "equals", value: ['=HYPERLINK("x")'] }]);
    const csv = (await run(buildExportQuery({ filters }, 5, "csv"), "csv", 5)) as string;
    expect(csv.trim().split("\n")).toHaveLength(2);
    expect(csv).toContain('"late"');
  });

  it("fails the download when ClickHouse errors after streaming has started", async () => {
    // ClickHouse sends a 200, streams rows, then appends a tagged exception
    // block and cuts the connection. The client must see a failed download,
    // never a complete file, and the error text must not reach it.
    const fastify = Fastify();
    fastify.get("/fail", async (_request, reply) => {
      const result = await client.exec({
        query: "SELECT number, throwIf(number = 500000) FROM numbers(1000000) FORMAT CSV",
        clickhouse_settings: { max_block_size: "1000" },
      });
      const tag = result.response_headers["x-clickhouse-exception-tag"] as string | undefined;
      expect(tag).toBeTruthy();
      return reply.header("Content-Type", "text/csv").send(failOnClickhouseException(result.stream, tag));
    });
    const address = await fastify.listen({ port: 0, host: "127.0.0.1" });
    try {
      const response = await fetch(`${address}/fail`);
      expect(response.status).toBe(200);
      let text = "";
      const read = async () => {
        const decoder = new TextDecoder();
        const reader = response.body!.getReader();
        for (let part = await reader.read(); !part.done; part = await reader.read()) {
          text += decoder.decode(part.value, { stream: true });
        }
      };
      await expect(read()).rejects.toThrow();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("__exception__");
      expect(text).not.toContain("FUNCTION_THROW_IF");
    } finally {
      await fastify.close();
    }
  });

  it("passes a clean stream through unchanged", async () => {
    const query = "SELECT number FROM numbers(200000) FORMAT CSV";
    const raw = await client.exec({ query });
    let expected = "";
    for await (const chunk of raw.stream) expected += chunk.toString();

    const guarded = await client.exec({ query });
    const tag = guarded.response_headers["x-clickhouse-exception-tag"] as string | undefined;
    let text = "";
    for await (const chunk of failOnClickhouseException(guarded.stream, tag)) text += chunk.toString();
    expect(text).toBe(expected);
  });
});
