import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildSessionQueries } from "./getSession.js";
import { buildSessionsQuery, chunkIds } from "./getSessions.js";
import { buildSessionsSummaryQuery, toSessionsSummary } from "./getSessionsSummary.js";
import { buildSessionGoalMatcher, MAX_SESSION_GOALS, resolveSessionGoals } from "./sessionGoals.js";
import { parseSessionListParams, REPLAY_LOOKUP_QUERY, SESSION_EVENT_TOTAL } from "./sessionQuery.js";

const window = { start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "UTC", filters: "" };
const listQuery = { ...window, page: 1, limit: 20 };

const signup = { goalId: 3, name: "Signup", goalType: "event", config: { eventName: "signup" } };
const pricing = { goalId: 5, name: null, goalType: "path", config: { pathPattern: "/pricing" } };
const broken = { goalId: 7, name: "No pattern", goalType: "path", config: {} };
const matcher = buildSessionGoalMatcher([signup, pricing, broken]);

// Everything from the statement that carries the LIMIT, i.e. past the CTE.
const outerQuery = (sql: string) => sql.slice(sql.lastIndexOf("FROM AggregatedSessions"));

describe("buildSessionsQuery paging", () => {
  it("orders in the statement that carries the LIMIT, with a full tie-break", () => {
    const { query } = buildSessionsQuery(listQuery, 1);
    const outer = outerQuery(query);

    expect(outer).toMatch(/ORDER BY session_end DESC, session_start DESC, session_id DESC\s+LIMIT/);
    // The CTE no longer carries an ORDER BY the outer query was free to drop.
    expect(query.slice(0, query.lastIndexOf("FROM AggregatedSessions"))).not.toContain("ORDER BY");
  });

  it("sorts by an allowed column in the requested direction", () => {
    const sql = (sort_by: string, sort_order?: string) =>
      outerQuery(buildSessionsQuery({ ...listQuery, sort_by, sort_order }, 1).query);

    expect(sql("started")).toContain("ORDER BY session_start DESC, session_id DESC");
    expect(sql("duration", "asc")).toContain("ORDER BY session_duration ASC, session_start ASC, session_id ASC");
    expect(sql("events")).toContain(`ORDER BY ${SESSION_EVENT_TOTAL} DESC`);
    expect(sql("errors")).toContain("ORDER BY errors DESC");
  });

  it("refuses a sort column or direction that is not on the list", () => {
    expect(parseSessionListParams({ sort_by: "session_id; DROP TABLE events" })).toMatchObject({ ok: false });
    expect(parseSessionListParams({ sort_order: "sideways" })).toMatchObject({ ok: false });
    expect(parseSessionListParams({ view: "everything" })).toMatchObject({ ok: false });
    expect(() => buildSessionsQuery({ ...listQuery, sort_by: "ip" }, 1)).toThrow();
  });

  it("caps the page size and falls back on unusable paging params", () => {
    expect(buildSessionsQuery({ ...listQuery, limit: 50000, page: 3 }, 1).params).toMatchObject({
      limit: 10000,
      offset: 20000,
    });
    // The Globe timeline's page size still gets what it asks for.
    expect(buildSessionsQuery({ ...listQuery, limit: 10000, page: 2 }, 1).params).toMatchObject({
      limit: 10000,
      offset: 10000,
    });
    expect(buildSessionsQuery({ ...window, limit: "abc", page: "-4" } as any, 1).params).toMatchObject({
      limit: 100,
      offset: 0,
    });
    // The value the page sends when it peeks one row past the page.
    expect(buildSessionsQuery({ ...window, limit: "101", page: "2" } as any, 1).params).toMatchObject({
      limit: 101,
      offset: 101,
    });
  });
});

describe("buildSessionsQuery ranges and views", () => {
  it("binds min and max bounds instead of interpolating them", () => {
    const { query, params } = buildSessionsQuery(
      { ...listQuery, min_pageviews: "2", max_pageviews: "9", min_duration: "10", max_duration: "600" },
      1
    );
    const outer = outerQuery(query);

    expect(outer).toContain("AND pageviews >= {minPageviews:Int32}");
    expect(outer).toContain("AND pageviews <= {maxPageviews:Int32}");
    expect(outer).toContain("AND session_duration >= {minDuration:Int32}");
    expect(outer).toContain("AND session_duration <= {maxDuration:Int32}");
    expect(params).toMatchObject({ minPageviews: 2, maxPageviews: 9, minDuration: 10, maxDuration: 600 });
  });

  it("filters events on the total the row shows, not custom events alone", () => {
    const { query, params } = buildSessionsQuery({ ...listQuery, min_events: "3", max_events: "8" }, 1);
    const outer = outerQuery(query);

    expect(SESSION_EVENT_TOTAL).toBe("(events + button_clicks + copies + form_submits + input_changes)");
    expect(outer).toContain(`AND ${SESSION_EVENT_TOTAL} >= {minEvents:Int32}`);
    expect(outer).toContain(`AND ${SESSION_EVENT_TOTAL} <= {maxEvents:Int32}`);
    expect(params).toMatchObject({ minEvents: 3, maxEvents: 8 });
  });

  it("leaves unset and empty bounds out, and rejects ones that are not whole numbers", () => {
    const { query, params } = buildSessionsQuery({ ...listQuery, min_pageviews: "", max_events: undefined }, 1);

    expect(outerQuery(query)).not.toContain("{minPageviews:Int32}");
    expect(params).not.toHaveProperty("minPageviews");
    expect(parseSessionListParams({ min_duration: "soon" })).toMatchObject({ ok: false });
    expect(parseSessionListParams({ max_pageviews: "-1" })).toMatchObject({ ok: false });
    expect(parseSessionListParams({ max_pageviews: "2.5" })).toMatchObject({ ok: false });
  });

  it("applies each saved view as one condition over the aggregated sessions", () => {
    const outer = (view: string) => outerQuery(buildSessionsQuery({ ...listQuery, view }, 1, matcher).query);

    expect(outer("identified")).toContain("AND identified_user_id != ''");
    expect(outer("converted")).toContain("AND notEmpty(converted_goal_ids)");
    expect(outer("bounced")).toContain("AND pageviews = 1");
    expect(outer("errors")).toContain("AND errors > 0");
    expect(outer("all")).not.toMatch(/AND (identified_user_id|notEmpty|pageviews = 1|errors > 0)/);
  });

  it("still honours identified_only", () => {
    const { query } = buildSessionsQuery({ ...listQuery, identified_only: "true" }, 1);
    expect(outerQuery(query)).toContain("AND identified_user_id != ''");
  });
});

describe("replay lookups", () => {
  it("does not read replay metadata unless the replay view asks for it", () => {
    expect(buildSessionsQuery(listQuery, 1).query).not.toContain("session_replay_metadata_v2");
  });

  it("bounds the replay view's scan by the request's window", () => {
    const { query } = buildSessionsQuery({ ...listQuery, view: "replay" }, 1);
    const replay = query.slice(query.indexOf("FROM session_replay_metadata_v2"));

    expect(replay).toContain("site_id = {siteId:Int32}");
    expect(replay).toContain("event_count >= 2");
    expect(replay).toContain("AND start_time >= toTimeZone(");
    expect(replay).toContain("toStartOfDay(toDateTime('2026-09-01', 'UTC'))");
  });

  it("flags a page's rows with a key lookup", () => {
    expect(REPLAY_LOOKUP_QUERY).toContain("session_id IN ({sessionIds:Array(String)})");
    expect(REPLAY_LOOKUP_QUERY).toContain("site_id = {siteId:Int32}");
  });

  it("looks a large page up in slices, and an empty page not at all", () => {
    const ids = Array.from({ length: 2500 }, (_, index) => `s${index}`);
    const chunks = chunkIds(ids, 1000);

    expect(chunks.map(chunk => chunk.length)).toEqual([1000, 1000, 500]);
    expect(chunks.flat()).toEqual(ids);
    expect(chunkIds([], 1000)).toEqual([]);
  });
});

describe("session goals", () => {
  it("tags events with the goals they complete, using the Goals page's conditions", () => {
    expect(matcher.goals).toEqual([
      { id: 3, name: "Signup" },
      { id: 5, name: null },
    ]);
    expect(matcher.expression).toContain("arrayFilter(x -> x != 0, [");
    expect(matcher.expression).toContain(
      "if((type = 'custom_event' AND event_name = 'signup'), toUInt32(3), toUInt32(0))"
    );
    expect(matcher.expression).toContain("type = 'pageview' AND match(pathname,");
    // A goal with no usable condition is skipped rather than matching everything.
    expect(matcher.expression).not.toContain("toUInt32(7)");
  });

  it("keeps the column typed when the site has no goals", () => {
    const none = buildSessionGoalMatcher([]);
    const { query } = buildSessionsQuery(listQuery, 1, none);

    expect(none).toEqual({ goals: [], expression: "emptyArrayUInt32()" });
    expect(query).toContain("emptyArrayUInt32() AS converted_goal_ids");
    expect(query).not.toContain("groupUniqArrayArray");
  });

  it("matches no goals for a caller that did not ask for them", () => {
    // The live-visitors drawer, the Globe and the user profile read this list
    // without goals; they get the same query they always ran.
    const { query } = buildSessionsQuery(listQuery, 1);

    expect(query).not.toContain("groupUniqArrayArray");
    expect(query).not.toContain("match(pathname");
    expect(parseSessionListParams({ include_goals: "true" })).toMatchObject({ ok: true });
    expect(parseSessionListParams({ include_goals: "yes" })).toMatchObject({ ok: false });
  });

  it("escapes goal text and never looks past the cap", () => {
    const hostile = buildSessionGoalMatcher([
      { goalId: 1, name: "x", goalType: "event", config: { eventName: "a') OR 1=1 --" } },
    ]);
    expect(hostile.expression).toContain("event_name = 'a\\') OR 1=1 --'");

    const many = Array.from({ length: MAX_SESSION_GOALS + 5 }, (_, index) => ({
      goalId: index + 1,
      name: null,
      goalType: "event",
      config: { eventName: `event_${index}` },
    }));
    expect(buildSessionGoalMatcher(many).goals).toHaveLength(MAX_SESSION_GOALS);
  });

  it("aggregates a session's goals and its latest conversion", () => {
    const { query } = buildSessionsQuery(listQuery, 1, matcher);

    expect(query).toContain(`groupUniqArrayArray(${matcher.expression}) AS converted_goal_ids`);
    expect(query).toContain(
      `argMaxIf(${matcher.expression}, timestamp_ms, notEmpty(${matcher.expression})) AS last_goal_ids`
    );
  });

  it("lists the latest conversion first and drops ids it cannot name", () => {
    expect(resolveSessionGoals(matcher, [5], [3, 5, 99])).toEqual([
      { id: 5, name: null },
      { id: 3, name: "Signup" },
    ]);
    expect(resolveSessionGoals(matcher, [], [])).toEqual([]);
  });

  it("marks the converting events of a session's timeline", () => {
    expect(buildSessionQueries({}, matcher.expression).eventsQuery).toContain(`${matcher.expression} AS goal_ids`);
    expect(buildSessionQueries({}).eventsQuery).toContain("emptyArrayUInt32() AS goal_ids");
  });
});

describe("buildSessionsSummaryQuery", () => {
  it("counts every view over the same sessions the list pages through", () => {
    const filters = JSON.stringify([{ parameter: "country", type: "equals", value: ["US"] }]);
    const summary = buildSessionsSummaryQuery({ ...window, filters, min_duration: "10" }, 1, matcher);
    const list = buildSessionsQuery({ ...listQuery, filters, min_duration: "10" }, 1, matcher);
    const cte = (sql: string) => sql.slice(sql.indexOf("AggregatedSessions AS ("), sql.indexOf("GROUP BY\n"));

    // Same aggregation, same session filter.
    expect(cte(summary.query)).toContain("countIf(type = 'pageview') AS pageviews");
    expect(cte(summary.query)).toBe(cte(list.query));
    expect(outerQuery(summary.query)).toContain("WHERE 1 = 1 AND country = 'US'");
    expect(outerQuery(list.query)).toContain("WHERE 1 = 1 AND country = 'US'");
    expect(summary.params).toMatchObject({ siteId: 1, minDuration: 10, timeZone: "UTC" });
  });

  it("keeps the period totals free of the ranges and applies them to the view counts", () => {
    const { query } = buildSessionsSummaryQuery({ ...window, min_duration: "10", max_pageviews: "5" }, 1, matcher);
    const inRange = "session_duration >= {minDuration:Int32}";

    expect(query).toContain("count() AS sessions");
    expect(query).toContain("countIf(pageviews = 1) AS bounced");
    expect(query).toContain(
      "countIf(pageviews <= {maxPageviews:Int32} AND session_duration >= {minDuration:Int32}) AS matching_all"
    );
    expect(query).toContain(`${inRange} AND identified_user_id != '') AS matching_identified`);
    expect(query).toContain(`${inRange} AND notEmpty(converted_goal_ids)) AS matching_converted`);
    expect(query).toContain(`${inRange} AND pageviews = 1) AS matching_bounced`);
    expect(query).toContain(`${inRange} AND errors > 0) AS matching_errors`);
    expect(query).toMatch(/AND session_id IN \([\s\S]*session_replay_metadata_v2[\s\S]*\) AS matching_replay/);
    // An alias named after a column the ranges read would nest the aggregates.
    expect(query).not.toMatch(/AS (session_duration|pageviews|errors)\b,\n\s+avg/);
    expect(query).toContain("avg(session_duration) AS avg_duration");
  });

  it("groups by the day a session started in the viewer's timezone, with period totals", () => {
    const { query, params } = buildSessionsSummaryQuery({ ...window, time_zone: "America/New_York" }, 1, matcher);

    expect(query).toContain("toString(toDate(session_start, {timeZone:String})) AS day");
    expect(query).toContain("GROUP BY day WITH ROLLUP");
    expect(query).toContain("LIMIT {maxRows:Int32}");
    expect(params).toMatchObject({ timeZone: "America/New_York" });
    expect(buildSessionsSummaryQuery({ ...window, time_zone: "Not/AZone" }, 1, matcher).params).toMatchObject({
      timeZone: "UTC",
    });
  });
});

describe("toSessionsSummary", () => {
  const row = (day: string, sessions: number, overrides: Record<string, number> = {}) => ({
    day,
    sessions,
    avg_duration: 120,
    avg_pageviews: 2.5,
    bounced: 1,
    converted: 2,
    with_errors: 1,
    matching_all: sessions,
    matching_identified: 1,
    matching_replay: 0,
    matching_converted: 2,
    matching_bounced: 1,
    matching_errors: 1,
    ...overrides,
  });

  it("reads period totals from the rollup row and days from the rest", () => {
    const summary = toSessionsSummary(
      [row("", 4, { matching_all: 3 }), row("2026-09-30", 3), row("2026-09-29", 1)],
      true
    );

    expect(summary).toMatchObject({
      sessions: 4,
      session_duration: 120,
      pages_per_session: 2.5,
      bounce_rate: 25,
      converted: 2,
      with_errors: 1,
      matching: { all: 3, identified: 1, replay: 0, converted: 2, bounced: 1, errors: 1 },
    });
    expect(summary.days.map(day => [day.day, day.all])).toEqual([
      ["2026-09-30", 3],
      ["2026-09-29", 1],
    ]);
  });

  it("reports no conversion figures for a site without goals", () => {
    const summary = toSessionsSummary([row("", 4), row("2026-09-30", 4)], false);

    expect(summary.converted).toBeNull();
    expect(summary.matching.converted).toBeNull();
    expect(summary.days[0].converted).toBeNull();
  });

  it("is all zeros for an empty period", () => {
    expect(toSessionsSummary([], true)).toEqual({
      sessions: 0,
      session_duration: 0,
      pages_per_session: 0,
      bounce_rate: 0,
      converted: 0,
      with_errors: 0,
      matching: { all: 0, identified: 0, replay: 0, converted: 0, bounced: 0, errors: 0 },
      days: [],
    });
  });
});
