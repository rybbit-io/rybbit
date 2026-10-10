import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildEventsQuery } from "./getEvents.js";
import {
  alignTrends,
  buildEventNameStatsQuery,
  buildEventTrendBucketsQuery,
  isTrendBucket,
  TREND_BUCKETS,
} from "./getEventNameStats.js";
import { buildEventsOverviewQuery } from "./getEventsOverview.js";
import {
  buildSilentEventsQuery,
  SILENT_AFTER_DAYS,
  SILENT_LOOKBACK_DAYS,
  SILENT_MIN_ACTIVE_SHARE,
  SILENT_MIN_HISTORY_DAYS,
} from "./getSilentEvents.js";
import { buildSiteEventCountQuery } from "./getSiteEventCount.js";

const SITE_ID = 1;

const dateRange = (overrides: Record<string, unknown> = {}) => ({
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  time_zone: "America/New_York",
  filters: "",
  ...overrides,
});

const allTime = (overrides: Record<string, unknown> = {}) => ({
  start_date: "",
  end_date: "",
  time_zone: "UTC",
  filters: "",
  ...overrides,
});

const eventNameFilter = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["signup"] }]);
const channelFilter = JSON.stringify([{ parameter: "channel", type: "equals", value: ["Direct"] }]);

describe("buildEventsOverviewQuery", () => {
  it("reads the period once and counts custom events, their users and their sessions", () => {
    const query = buildEventsOverviewQuery(dateRange(), SITE_ID);

    expect(query.match(/FROM events/g)).toHaveLength(1);
    expect(query).toContain("countIf(type = 'custom_event') AS events");
    expect(query).toContain("type = 'custom_event') AS users_with_events");
    expect(query).toContain("uniqExactIf(session_id, type = 'custom_event') AS sessions_with_events");
    expect(query).toContain("uniqExact(session_id) AS sessions");
    expect(query).toContain("AS event_names");
  });

  it("counts a user by identity when there is one", () => {
    const query = buildEventsOverviewQuery(dateRange(), SITE_ID);

    expect(query).toContain("uniqExact(COALESCE(NULLIF(identified_user_id, ''), user_id)) AS users");
  });

  it("counts the autocaptured types and leaves pageviews, errors and web vitals out", () => {
    const query = buildEventsOverviewQuery(dateRange(), SITE_ID);

    expect(query).toContain(
      "countIf(type IN ('outbound', 'button_click', 'copy', 'form_submit', 'input_change')) AS autocaptured"
    );
  });

  it("is bounded by the requested period", () => {
    const query = buildEventsOverviewQuery(dateRange(), SITE_ID);

    expect(query).toContain("toDateTime('2026-09-01', 'America/New_York')");
    expect(query).toContain("toDateTime('2026-09-30', 'America/New_York')");
  });

  it("keeps event_name row-scoped and channel session-scoped, like the other event queries", () => {
    const byName = buildEventsOverviewQuery(dateRange({ filters: eventNameFilter }), SITE_ID);
    expect(byName).toContain("AND event_name = 'signup'");
    expect(byName).not.toContain("SELECT DISTINCT session_id");

    const byChannel = buildEventsOverviewQuery(dateRange({ filters: channelFilter }), SITE_ID);
    expect(byChannel).toContain("session_id IN");
    expect(byChannel).toContain("session_channel = 'Direct'");
  });

  it("adds no filter clause when there are no filters", () => {
    expect(buildEventsOverviewQuery(dateRange(), SITE_ID)).not.toContain("session_id IN");
  });
});

describe("buildEventNameStatsQuery", () => {
  it("returns every name's count, users, last occurrence and trend from one aggregation", () => {
    const query = buildEventNameStatsQuery(dateRange(), SITE_ID, "day");

    expect(query.match(/FROM events/g)).toHaveLength(1);
    expect(query).toContain("count() AS count");
    expect(query).toContain("uniqExact(COALESCE(NULLIF(identified_user_id, ''), user_id)) AS users");
    expect(query).toContain("toString(max(timestamp)) AS lastSeen");
    expect(query).toContain("AS trend");
    expect(query).toContain("GROUP BY event_name");
  });

  it("only reads named custom events", () => {
    const query = buildEventNameStatsQuery(dateRange(), SITE_ID, "day");

    expect(query).toContain("AND type = 'custom_event'");
    expect(query).toContain("AND event_name != ''");
  });

  it("is bounded by the period and by a row limit", () => {
    const query = buildEventNameStatsQuery(dateRange(), SITE_ID, "day");

    expect(query).toContain("toDateTime('2026-09-01', 'America/New_York')");
    expect(query).toContain("LIMIT 1000");
  });

  it.each([
    ["hour", "toStartOfHour"],
    ["day", "toStartOfDay"],
    ["week", "toStartOfWeek"],
    ["month", "toStartOfMonth"],
  ] as const)("buckets the trend by %s in the request's timezone", (bucket, fn) => {
    const query = buildEventNameStatsQuery(dateRange(), SITE_ID, bucket);

    expect(query).toContain(`sumMap([toDateTime(${fn}(toTimeZone(timestamp, 'America/New_York')))], [toUInt64(1)])`);
  });

  it("keeps event_name row-scoped and channel session-scoped", () => {
    const byName = buildEventNameStatsQuery(dateRange({ filters: eventNameFilter }), SITE_ID, "day");
    expect(byName).toContain("AND event_name = 'signup'");
    expect(byName).not.toContain("SELECT DISTINCT session_id");

    const byChannel = buildEventNameStatsQuery(dateRange({ filters: channelFilter }), SITE_ID, "day");
    expect(byChannel).toContain("session_id IN");
  });
});

describe("buildEventTrendBucketsQuery", () => {
  it("uses the same bucket expression as the trend and fills the empty buckets", () => {
    const query = buildEventTrendBucketsQuery(dateRange(), SITE_ID, "day");

    expect(query).toContain("toDateTime(toStartOfDay(toTimeZone(timestamp, 'America/New_York'))) AS time");
    expect(query).toContain("WITH FILL FROM");
    expect(query).toContain("STEP INTERVAL 1 DAY");
  });

  it("has nothing to fill between on an all-time request", () => {
    expect(buildEventTrendBucketsQuery(allTime(), SITE_ID, "month")).not.toContain("WITH FILL");
  });

  it("applies the same filters as the stats query", () => {
    const query = buildEventTrendBucketsQuery(dateRange({ filters: eventNameFilter }), SITE_ID, "day");

    expect(query).toContain("AND event_name = 'signup'");
  });
});

describe("isTrendBucket", () => {
  it("accepts the coarse buckets only", () => {
    expect(TREND_BUCKETS.every(isTrendBucket)).toBe(true);
    expect(isTrendBucket("minute")).toBe(false);
    expect(isTrendBucket("year")).toBe(false);
    expect(isTrendBucket("day; DROP TABLE events")).toBe(false);
    expect(isTrendBucket(undefined)).toBe(false);
  });
});

describe("alignTrends", () => {
  const buckets = ["2026-09-01 00:00:00", "2026-09-02 00:00:00", "2026-09-03 00:00:00"];
  const row = (trend: [string[], (number | string)[]], eventName: unknown = "signup") =>
    ({ eventName, count: 0, users: 0, lastSeen: "2026-09-03 10:00:00", trend }) as Parameters<typeof alignTrends>[1][0];

  it("puts each count on its bucket and a zero on the rest", () => {
    const [stat] = alignTrends(buckets, [
      row([
        ["2026-09-01 00:00:00", "2026-09-03 00:00:00"],
        [4, 7],
      ]),
    ]);

    expect(stat.trend).toEqual([4, 0, 7]);
  });

  it("reads the 64-bit counts ClickHouse sends as strings", () => {
    const [stat] = alignTrends(buckets, [row([["2026-09-02 00:00:00"], ["12"]])]);

    expect(stat.trend).toEqual([0, 12, 0]);
  });

  it("drops a bucket that is not on the axis instead of misplacing it", () => {
    const [stat] = alignTrends(buckets, [
      row([
        ["2026-08-31 00:00:00", "2026-09-01 00:00:00"],
        [9, 1],
      ]),
    ]);

    expect(stat.trend).toEqual([1, 0, 0]);
  });

  it("gives every name a trend as long as the axis, even with no buckets at all", () => {
    expect(alignTrends(buckets, [row([[], []])])[0].trend).toEqual([0, 0, 0]);
    expect(alignTrends([], [row([[], []])])[0].trend).toEqual([]);
  });

  it("keeps a numeric-looking event name as text", () => {
    const [stat] = alignTrends(buckets, [row([[], []], 404)]);

    expect(stat.eventName).toBe("404");
  });
});

describe("buildSilentEventsQuery", () => {
  const query = buildSilentEventsQuery();

  it("reads a fixed window ending now, whatever the page's period", () => {
    expect(query.match(/FROM events/g)).toHaveLength(1);
    expect(query).toContain(`AND timestamp >= now() - INTERVAL ${SILENT_LOOKBACK_DAYS} DAY`);
    expect(query).toContain("LIMIT 5");
  });

  it("only reads named custom events of the site", () => {
    expect(query).toContain("site_id = {siteId:Int32}");
    expect(query).toContain("AND type = 'custom_event'");
    expect(query).toContain("AND event_name != ''");
  });

  it("flags an event that stopped after firing on most days", () => {
    expect(query).toContain(`max(timestamp) < now() - INTERVAL ${SILENT_AFTER_DAYS} DAY`);
    expect(query).toContain(`spanDays >= ${SILENT_MIN_HISTORY_DAYS}`);
    expect(query).toContain(`activeDays >= spanDays * ${SILENT_MIN_ACTIVE_SHARE}`);
  });

  it("leaves room in the lookback to see the history it asks for", () => {
    expect(SILENT_LOOKBACK_DAYS).toBeGreaterThanOrEqual(SILENT_AFTER_DAYS + SILENT_MIN_HISTORY_DAYS);
  });

  it("counts days in the viewer's timezone, passed as a bound parameter", () => {
    expect(query).toContain("uniqExact(toDate(timestamp, {timeZone:String})) AS activeDays");
    expect(query).not.toMatch(/toDate\([^)]*'[A-Za-z_]+\/[A-Za-z_]+'/);
  });
});

describe("buildSiteEventCountQuery", () => {
  it("fills empty buckets so the comparison period lines up bucket for bucket", () => {
    const query = buildSiteEventCountQuery({ ...dateRange(), bucket: "day" }, SITE_ID);

    expect(query).toContain("toDateTime(toStartOfDay(toTimeZone(timestamp, 'America/New_York'))) AS time");
    expect(query).toContain("WITH FILL FROM");
    expect(query).toContain("STEP INTERVAL 1 DAY");
  });

  it("does not fill an all-time request", () => {
    expect(buildSiteEventCountQuery({ ...allTime(), bucket: "month" }, SITE_ID)).not.toContain("WITH FILL");
  });
});

describe("buildEventsQuery types", () => {
  it("returns errors with the rest of the log, and leaves web vitals out", () => {
    const { query } = buildEventsQuery({ ...allTime(), page_size: "50" }, SITE_ID);

    expect(query).toContain("'error'");
    expect(query).not.toContain("'performance'");
  });
});
