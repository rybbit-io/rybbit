import { createClient } from "@clickhouse/client";
import { TimeBucket } from "@rybbit/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Run against any ClickHouse using CLICKHOUSE_TEST_URL and optional
// CLICKHOUSE_TEST_USER / CLICKHOUSE_TEST_PASSWORD. Every query supplies its own
// events CTE: no tables, migrations or production data are needed.
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: {} }));

import { buildOverviewQuery } from "../../services/siteMetrics/siteMetrics.js";
import { buildOverviewBucketedQuery } from "./getOverviewBucketed.js";
import { buildSiteCardsQueries } from "./siteCardsQuery.js";
import { resolveTimeWindow, TimeWindowParams } from "./utils/timeWindow.js";

const now = Date.parse("2026-09-20T20:41:33Z");
const siteIds = [1, 2, 3];
// site, time, session, fingerprint, identified user, event type
const events = [
  [1, "2026-09-19 19:00:00", "cross-period", "shared-device", "", "pageview"],
  [1, "2026-09-19 19:10:00", "previous-visit", "shared-device", "", "pageview"],
  [1, "2026-09-19 21:00:00", "cross-period", "shared-device", "alice", "pageview"],
  [1, "2026-09-19 21:05:00", "other-person", "shared-device", "bob", "custom_event"],
  [1, "2026-09-19 22:00:00", "identify-later", "other-device", "", "pageview"],
  [1, "2026-09-19 22:01:00", "identify-later", "other-device", "alice", "custom_event"],
  [1, "2026-09-20 01:00:00", "identify-later", "other-device", "alice", "pageview"],
  [1, "2026-09-20 20:41:33", "end-boundary", "boundary-device", "", "error"],
  // Session IDs can coincide across sites, and no session has multiple identities.
  [2, "2026-09-19 21:30:00", "cross-period", "site-two", "charlie", "pageview"],
  [2, "2026-09-19 23:30:00", "cross-period", "site-two", "charlie", "pageview"],
  [1, "2024-03-10 06:30:00", "spring-a", "spring-a", "", "pageview"],
  [2, "2024-03-10 07:30:00", "spring-b", "spring-b", "", "pageview"],
  [1, "2024-11-03 05:30:00", "fall-a", "fall-a", "", "pageview"],
  [1, "2024-11-03 06:30:00", "fall-b", "fall-b", "", "pageview"],
];
const fixture = `WITH events AS (SELECT * FROM values(
  'site_id Int32, timestamp DateTime, session_id String, user_id String, identified_user_id String, type String',
  ${events.map(row => `(${row.map(value => (typeof value === "number" ? value : `'${value}'`)).join(",")})`).join(",")}
))`;
const day = (date: string, time_zone = "America/New_York") => ({ start_date: date, end_date: date, time_zone });
const rolling = { past_minutes_start: 1440, past_minutes_end: 0, time_zone: "America/New_York" };
const cases: { name: string; current: TimeWindowParams; comparison: TimeWindowParams | null; bucket: TimeBucket }[] = [
  {
    name: "adjacent rolling windows and identity changes",
    current: rolling,
    comparison: { ...rolling, past_minutes_start: 2880, past_minutes_end: 1440 },
    bucket: "hour",
  },
  {
    name: "overlapping periods",
    current: rolling,
    comparison: { ...rolling, past_minutes_start: 2880, past_minutes_end: 720 },
    bucket: "hour",
  },
  { name: "identical periods", current: rolling, comparison: rolling, bucket: "hour" },
  { name: "disabled comparison", current: rolling, comparison: null, bucket: "hour" },
  { name: "DST spring forward", current: day("2024-03-10"), comparison: null, bucket: "hour" },
  { name: "DST fall back", current: day("2024-11-03"), comparison: null, bucket: "hour" },
  { name: "half-hour timezone", current: day("2026-09-19", "Asia/Kolkata"), comparison: null, bucket: "hour" },
  { name: "no events", current: day("2026-09-16"), comparison: null, bucket: "hour" },
  {
    name: "daily buckets",
    current: { ...day("2026-09-19"), start_date: "2026-09-18" },
    comparison: null,
    bucket: "day",
  },
  {
    name: "exact minute window",
    current: { start_datetime: "2026-09-19 21:05:00Z", end_datetime: "2026-09-19 22:01:00Z", time_zone: "UTC" },
    comparison: null,
    bucket: "minute",
  },
  { name: "all-time hourly activity", current: {}, comparison: null, bucket: "hour" },
  { name: "all-time monthly activity", current: {}, comparison: null, bucket: "month" },
];

describe.skipIf(!process.env.CLICKHOUSE_TEST_URL)("Site cards: ClickHouse results against standard endpoints", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    client = createClient({
      url: process.env.CLICKHOUSE_TEST_URL,
      username: process.env.CLICKHOUSE_TEST_USER || "default",
      password: process.env.CLICKHOUSE_TEST_PASSWORD || "",
      compression: { request: false, response: false },
      clickhouse_settings: { readonly: "2", max_threads: 2, max_execution_time: 10 },
    });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await client.close();
  });

  async function run<T>(query: string, params: Record<string, unknown>) {
    // The standard chart already starts with WITH; put the fixture in that
    // clause. Both versions then execute against the identical events CTE.
    const sql = /^\s*WITH\b/.test(query) ? query.replace(/^\s*WITH\b/, `${fixture},`) : `${fixture} ${query}`;
    const result = await client.query({ query: sql, query_params: params, format: "JSONEachRow" });
    return result.json<T>();
  }

  it.each(cases)(
    "$name",
    async ({ current, comparison, bucket, name }) => {
      const queries = buildSiteCardsQueries({ siteIds, current, comparison, bucket }, now);
      const totals = await run<Record<string, number | string>>(queries.totals.query, queries.totals.params!);
      const series = await run<{ time: string; site_sessions: [number, number | string][] }>(
        queries.series.query,
        queries.series.params!
      );

      for (const siteId of siteIds) {
        const total = totals.find(row => row.site_id === siteId);
        for (const [period, window] of [
          ["current", current],
          ["previous", comparison],
        ] as const) {
          if (window === null) {
            expect(Number(total?.previous_sessions ?? 0)).toBe(0);
            expect(Number(total?.previous_users ?? 0)).toBe(0);
            continue;
          }
          const original = await run<{ sessions: string; users: string }>(
            buildOverviewQuery({ timeStatement: resolveTimeWindow(window, now).where() }),
            { siteId }
          );
          expect(Number(total?.[`${period}_sessions`] ?? 0)).toBe(Number(original[0].sessions));
          expect(Number(total?.[`${period}_users`] ?? 0)).toBe(Number(original[0].users));
        }

        const original = await run<{ time: string; sessions: string }>(
          buildOverviewBucketedQuery(
            { start_date: "", end_date: "", time_zone: "UTC", ...current, bucket, filters: "" },
            siteId
          ),
          { siteId }
        );
        const actual = series.flatMap(row => {
          const counts = new Map(row.site_sessions);
          return queries.fillMissingBuckets || counts.has(siteId)
            ? [{ time: row.time, sessions: Number(counts.get(siteId) ?? 0) }]
            : [];
        });
        if (!queries.fillMissingBuckets) {
          // The old FULL JOIN selects the left time, so event-only buckets are
          // incorrectly labeled 1970. Keep its nonzero session counts, but
          // check all unbounded bucket times directly against the fixture.
          expect(actual.filter(row => row.sessions > 0)).toEqual(
            original
              .filter(row => Number(row.sessions) > 0)
              .map(row => ({ time: row.time, sessions: Number(row.sessions) }))
          );
          const sessions = new Map<string, string>();
          const bucketOf = (timestamp: string) =>
            bucket === "hour" ? `${timestamp.slice(0, 13)}:00:00` : `${timestamp.slice(0, 7)}-01 00:00:00`;
          const activity = new Map<string, number>();
          for (const [site, timestamp, session] of events) {
            if (site !== siteId) continue;
            const time = String(timestamp);
            const start = sessions.get(String(session));
            if (!start || time < start) sessions.set(String(session), time);
            activity.set(bucketOf(time), 0);
          }
          for (const start of sessions.values()) {
            const time = bucketOf(start);
            activity.set(time, activity.get(time)! + 1);
          }
          expect(actual).toEqual(
            [...activity].sort(([a], [b]) => a.localeCompare(b)).map(([time, sessions]) => ({ time, sessions }))
          );
        } else {
          expect(actual).toEqual(original.map(row => ({ time: row.time, sessions: Number(row.sessions) })));
        }
      }

      if (name === "adjacent rolling windows and identity changes") {
        const site = totals.find(row => row.site_id === 1)!;
        expect(Number(site.current_sessions)).toBe(4);
        expect(Number(site.current_users)).toBe(3);
        expect(Number(site.previous_sessions)).toBe(2);
        expect(Number(site.previous_users)).toBe(1);
      }
    },
    30_000
  );
});
