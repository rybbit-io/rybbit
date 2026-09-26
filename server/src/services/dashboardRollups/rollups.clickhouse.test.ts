import { createClient } from "@clickhouse/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TimeBucket } from "@rybbit/shared";
import { getRollupConfig } from "./config.js";
import { sessionRollupDDL, sessionRollupValidation } from "./schema.js";
import { buildSessionRollupQuery } from "./queries.js";
import { getRoutePatterns, routeProjectionDDL } from "./routes.js";
import { dimensionProjectionDDL, projectedMetricGroups } from "./projections.js";
import { resolveTimeWindow, TimeWindowParams } from "../../api/analytics/utils/timeWindow.js";
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: {} }));
import { buildOverviewLiteQuery } from "../../api/analytics/lite/getOverviewLite.js";
import { buildRouteGroupsQuery } from "../../api/analytics/lite/getRouteGroups.js";

// Opt-in correctness suite. Use an isolated ClickHouse server: this creates and
// removes one uniquely named test database, never application data. No timings.
describe.skipIf(!process.env.DASHBOARD_ROLLUP_TEST_URL)("multi-resolution rollups in ClickHouse", () => {
  const database = `test_dashboard_rollups_${randomUUID().replace(/-/g, "")}`;
  let admin: ReturnType<typeof createClient>;
  let client: ReturnType<typeof createClient>;
  let config: ReturnType<typeof getRollupConfig>;
  let patterns: ReturnType<typeof getRoutePatterns>;
  const now = Date.parse("2026-09-20T22:30:00Z");
  const times = [
    "2024-03-10 06:00:00",
    "2024-03-10 07:00:00",
    "2024-11-03 05:00:00",
    "2024-11-03 06:00:00",
    "2026-01-01 00:00:00",
    "2026-01-15 00:00:00",
    "2026-01-31 23:00:00",
    "2026-02-01 00:00:00",
    "2026-02-01 04:00:00",
    "2026-02-01 05:00:00",
    "2026-03-01 00:00:00",
    "2026-03-31 18:00:00",
    "2026-03-31 19:00:00",
    "2026-04-01 00:00:00",
    "2026-09-20 22:00:00",
  ];
  async function rows(query: string, params: Record<string, unknown> = { siteId: 1 }) {
    const result = await client.query({ query, query_params: params, format: "JSONEachRow" });
    return result.json<Record<string, any>>();
  }
  beforeAll(async () => {
    vi.stubEnv("DASHBOARD_ROLLUP_TIME_ZONES", "America/New_York,Asia/Kolkata");
    vi.stubEnv("DASHBOARD_ROUTE_PATTERNS", JSON.stringify([{ siteId: 1, path: "/summoners/:region/:player" }]));
    config = getRollupConfig();
    patterns = getRoutePatterns();
    const options = {
      url: process.env.DASHBOARD_ROLLUP_TEST_URL,
      username: process.env.DASHBOARD_ROLLUP_TEST_USER || "default",
      password: process.env.DASHBOARD_ROLLUP_TEST_PASSWORD || "",
      compression: { request: false, response: false },
      clickhouse_settings: { max_threads: 2, max_execution_time: 20 },
    };
    admin = createClient(options);
    await admin.command({ query: `CREATE DATABASE ${database}` });
    client = createClient({ ...options, database });
    await client.command({
      query: `CREATE TABLE events (site_id UInt16, timestamp DateTime('UTC'), session_id String, user_id String, pathname String, hostname String, type String, country FixedString(2), region String, device_type String) ENGINE=MergeTree ORDER BY (site_id, timestamp)`,
    });
    const data = times.flatMap((timestamp, i) =>
      [1, 2].flatMap(site_id =>
        ["alpha", "beta"].map(player => ({
          site_id,
          timestamp,
          session_id: `session-${i}`,
          user_id: `user-${i % 3}`,
          pathname: `/summoners/na/${player}`,
          hostname: "example.test",
          type: "pageview",
          country: "US",
          region: "CA",
          device_type: i % 2 ? "desktop" : "mobile",
        }))
      )
    );
    await client.insert({ table: "events", values: data, format: "JSONEachRow" });
    await client.command({
      query: `CREATE TABLE sessions_mv_target (site_id UInt16, session_id String, user_id String, start_time SimpleAggregateFunction(min, DateTime), end_time SimpleAggregateFunction(max, DateTime), pageviews SimpleAggregateFunction(sum, UInt64)) ENGINE=AggregatingMergeTree ORDER BY (site_id, session_id)`,
    });
    await client.command({
      query: `INSERT INTO sessions_mv_target SELECT site_id, session_id, any(user_id), min(timestamp), max(timestamp), count() FROM events GROUP BY site_id, session_id`,
    });
    await client.command({
      query: `INSERT INTO sessions_mv_target VALUES (1, 'session-5', 'user-2', '2026-01-15 00:00:00', '2026-01-15 00:05:00', 1)`,
    });
    await client.command({
      query: `CREATE TABLE session_hourly_mv_target ENGINE=MergeTree ORDER BY (site_id, session_hour) AS SELECT site_id, toStartOfHour(start_time) AS session_hour, count() AS sessions, sum(session_pageviews) AS pageviews, uniqState(user_id) AS users, countIf(session_pageviews = 1) AS bounced_sessions, sum(toUInt64(end_time-start_time)) AS total_session_duration_seconds FROM (SELECT *, pageviews AS session_pageviews FROM sessions_mv_target FINAL) GROUP BY site_id, session_hour`,
    });
    for (const sql of sessionRollupDDL(config)) await client.command({ query: sql });
    await client.command({ query: `SYSTEM WAIT VIEW ${config.view}` });
    for (const dimension of ["pathname", "country", "device_type"]) {
      await client.command({
        query: `CREATE TABLE ${dimension}_hourly_mv_target ENGINE=AggregatingMergeTree ORDER BY (site_id,event_hour,${dimension}) AS SELECT site_id, toStartOfHour(timestamp) AS event_hour, ${dimension}, any(hostname) AS hostname, toUInt64(count()) AS pageviews, uniqState(session_id) AS sessions FROM events GROUP BY site_id,event_hour,${dimension}`,
      });
      await client.command({
        query: `ALTER TABLE ${dimension}_hourly_mv_target MODIFY COLUMN pageviews SimpleAggregateFunction(sum, UInt64)`,
      });
    }
    for (const sql of [...routeProjectionDDL(patterns, true), ...dimensionProjectionDDL(true)]) {
      await client.command({ query: sql, clickhouse_settings: { mutations_sync: "1" } });
    }
  }, 60_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await client?.close();
    if (admin) {
      await admin.command({ query: `DROP DATABASE IF EXISTS ${database} SYNC` });
      await admin.close();
    }
  }, 30_000);
  const ranges: [string, TimeWindowParams][] = [
    ["months plus partial days", { start_date: "2026-01-15", end_date: "2026-03-31", time_zone: "America/New_York" }],
    ["half-hour timezone", { start_date: "2026-01-01", end_date: "2026-03-31", time_zone: "Asia/Kolkata" }],
    ["DST spring", { start_date: "2024-03-10", end_date: "2024-03-10", time_zone: "America/New_York" }],
    ["DST fall", { start_date: "2024-11-03", end_date: "2024-11-03", time_zone: "America/New_York" }],
    ["empty", { start_date: "2025-01-01", end_date: "2025-01-31" }],
    ["all time", {}],
    ["rolling", { past_minutes_start: 60 * 24 * 240, past_minutes_end: 0 }],
  ];
  it("publishes a consistent snapshot at every resolution", async () => {
    expect(await rows(sessionRollupValidation(config))).toEqual([]);
    const status = await rows(
      `SELECT count() AS ready FROM system.view_refreshes WHERE database=currentDatabase() AND view={view:String} AND last_success_time > now() - INTERVAL 2 HOUR`,
      { view: config.view }
    );
    expect(Number(status[0].ready)).toBe(1);
  });
  it.each(ranges)("matches legacy totals: %s", async (_, params) => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      expect(await rows(buildSessionRollupQuery(params, config, undefined, now)!)).toEqual(
        await rows(buildOverviewLiteQuery(params as never, null))
      );
    } finally {
      vi.restoreAllMocks();
    }
  });
  it.each(["day", "week", "month", "year"] as TimeBucket[])("matches legacy chart buckets: %s", async bucket => {
    const params = { start_date: "2026-01-01", end_date: "2026-03-31", time_zone: "Asia/Kolkata" };
    const window = resolveTimeWindow(params, now);
    const old = await rows(
      `SELECT ${window.bucketed("session_hour", bucket)} AS time, sum(sessions) AS sessions, sum(pageviews) AS pageviews, uniqMerge(users) AS users FROM session_hourly_mv_target WHERE site_id={siteId:Int32} ${window.where("session_hour")} GROUP BY time ORDER BY time ${window.fill(bucket)}`
    );
    const next = await rows(buildSessionRollupQuery(params, config, bucket, now)!);
    expect(next.map(({ time, sessions, pageviews, users }) => ({ time, sessions, pageviews, users }))).toEqual(old);
  });
  it("deduplicates sessions across routes and drills into actual URLs", async () => {
    const params = { start_date: "2026-01-15", end_date: "2026-03-31", time_zone: "America/New_York" };
    const query = buildRouteGroupsQuery(params as never, 1, patterns, true, now);
    const projected = await rows(query);
    expect(projected).toEqual(await rows(query + " SETTINGS optimize_use_projections=0"));
    expect(projected[0].value).toBe("/summoners/:region/:player");
    expect(Number(projected[0].pageviews)).toBe(2 * Number(projected[0].count));
    const original = await rows(
      buildRouteGroupsQuery({ ...params, route_group: projected[0].value } as never, 1, patterns, true, now),
      { siteId: 1, routeGroup: projected[0].value }
    );
    expect(original.map(row => row.value).sort()).toEqual(["/summoners/na/alpha", "/summoners/na/beta"]);
    expect(original.reduce((sum, row) => sum + Number(row.pageviews), 0)).toBe(Number(projected[0].pageviews));
    expect(await rows(buildRouteGroupsQuery(params as never, 2, patterns, true, now), { siteId: 2 })).toHaveLength(2);
  });
  it.each(["country", "device_type"])("uses %s projections with equivalent results", async dimension => {
    const query = projectedMetricGroups(
      { start_date: "2026-01-15", end_date: "2026-03-31", time_zone: "America/New_York" },
      { table: `${dimension}_hourly_mv_target`, value: dimension },
      now
    );
    expect(await rows(query)).toEqual(await rows(query + " SETTINGS optimize_use_projections=0"));
    expect(JSON.stringify(await rows("EXPLAIN " + query))).toContain(`dashboard_${dimension}_`);
  });
  it("selects route projections and retains raw filtering", async () => {
    const params = { start_date: "2026-01-15", end_date: "2026-03-31" };
    const query = buildRouteGroupsQuery(params as never, 1, patterns, true, now);
    expect(JSON.stringify(await rows("EXPLAIN " + query))).toContain("route_groups_");
    const raw = buildRouteGroupsQuery(
      { ...params, filters: JSON.stringify([{ parameter: "country", type: "equals", value: ["US"] }]) } as never,
      1,
      patterns,
      false,
      now
    );
    expect(await rows(raw)).toEqual(await rows(query));
  });
  it("uses projections for multiple ordered route templates", async () => {
    vi.stubEnv(
      "DASHBOARD_ROUTE_PATTERNS",
      JSON.stringify([{ path: "/products/:product" }, { siteId: 1, path: "/summoners/:region/:player" }])
    );
    const multiple = getRoutePatterns();
    for (const query of routeProjectionDDL(multiple, true)) {
      await client.command({ query, clickhouse_settings: { mutations_sync: "1" } });
    }
    const query = buildRouteGroupsQuery({} as never, 1, multiple, true, now);
    expect(JSON.stringify(await rows("EXPLAIN " + query))).toContain("route_groups_");
    expect(await rows(query)).toEqual(await rows(query + " SETTINGS optimize_use_projections=0"));
  }, 30_000);
  it("keeps projections correct after historical inserts and merges", async () => {
    const query = buildRouteGroupsQuery({} as never, 1, patterns, true, now);
    const [before] = await rows(query);
    await client.command({
      query: `INSERT INTO pathname_hourly_mv_target SELECT toUInt16(1), toDateTime('2026-01-15 00:00:00'), '/summoners/na/alpha', 'example.test', toUInt64(1), uniqState('session-5')`,
    });
    await client.command({ query: "OPTIMIZE TABLE pathname_hourly_mv_target FINAL" });
    const [after] = await rows(query);
    expect(Number(after.pageviews)).toBe(Number(before.pageviews) + 1);
    expect(after.count).toBe(before.count);
    expect(await rows(query)).toEqual(await rows(query + " SETTINGS optimize_use_projections=0"));
  });
});
