import { createClient } from "@clickhouse/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSiteCardsQueries } from "./siteCardsQuery.js";

// Read-only fixtures, following ../siteCardsQuery.clickhouse.test.ts. No tables
// or migrations are needed; the hourly snapshot intentionally trails events.
describe.skipIf(!process.env.CLICKHOUSE_TEST_URL)("lite Site cards: recent activity", () => {
  let client: ReturnType<typeof createClient>;
  const now = Date.parse("2026-09-21T14:07:56Z");
  const instant = (minutesAgo: number) =>
    new Date(now - minutesAgo * 60_000).toISOString().slice(0, 19).replace("T", " ");

  beforeAll(() => {
    client = createClient({
      url: process.env.CLICKHOUSE_TEST_URL,
      username: process.env.CLICKHOUSE_TEST_USER || "default",
      password: process.env.CLICKHOUSE_TEST_PASSWORD || "",
      clickhouse_settings: { readonly: "2", max_threads: 2, max_execution_time: 10 },
    });
  });
  afterAll(async () => {
    await client.close();
  });

  it.each([5, 30, 60, 120])("counts live sessions in a %i-minute window before the hourly refresh", async minutes => {
    const fixture = `WITH events AS (SELECT * FROM values(
      'site_id UInt16, timestamp DateTime, session_id String, user_id String, identified_user_id String',
      (1, '${instant(minutes * 1.5)}', 'previous', 'old-user', ''),
      (1, '${instant(minutes)}', 'boundary', 'boundary-user', ''),
      (1, '${instant(minutes / 2)}', 'current-a', 'device-a', 'alice'),
      (1, '${instant(1)}', 'current-a', 'device-a', 'alice'),
      (1, '${instant(0.5)}', 'current-b', 'device-b', 'alice'),
      (2, '${instant(1)}', 'current-a', 'site-two', '')
    )), session_hourly_mv_target AS (
      SELECT site_id, toStartOfHour(timestamp) AS session_hour,
        uniqExact(session_id) AS sessions, uniqState(user_id) AS users
      FROM events WHERE timestamp < toStartOfHour(toDateTime('${instant(0)}', 'UTC'))
      GROUP BY site_id, session_hour
    ), sessions_mv_target AS (
      SELECT site_id, session_id, min(timestamp) AS start_time
      FROM events GROUP BY site_id, session_id
    )`;
    const queries = buildSiteCardsQueries(
      {
        siteIds: [1, 2, 3],
        current: { past_minutes_start: minutes, past_minutes_end: 0, time_zone: "UTC" },
        comparison: { past_minutes_start: minutes * 2, past_minutes_end: minutes, time_zone: "UTC" },
        bucket: "minute",
      },
      now
    );
    const totalsResult = await client.query({
      query: `${fixture} ${queries.totals.query}`,
      query_params: queries.totals.params,
      format: "JSONEachRow",
    });
    const totals = (await totalsResult.json<Record<string, number | string>>()).map(row =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]))
    );
    expect(totals.find(row => row.site_id === 1)).toMatchObject({
      current_sessions: 2,
      current_users: 1,
      previous_sessions: 2,
      previous_users: 2,
    });
    expect(totals.find(row => row.site_id === 2)).toMatchObject({ current_sessions: 1, current_users: 1 });
    expect(totals.find(row => row.site_id === 3)).toBeUndefined();

    const seriesResult = await client.query({
      query: `${fixture} ${queries.series.query}`,
      query_params: queries.series.params,
      format: "JSONEachRow",
    });
    const series = await seriesResult.json<{ time: string; site_sessions: [number, string][] }>();
    expect(series).toHaveLength(minutes + 1);
    const sessionsFor = (siteId: number) =>
      series.reduce((sum, row) => sum + Number(new Map(row.site_sessions).get(siteId) ?? 0), 0);
    expect(sessionsFor(1)).toBe(2);
    expect(sessionsFor(2)).toBe(1);
    expect(sessionsFor(3)).toBe(0);
  });
});
