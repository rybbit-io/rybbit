import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildJourneysQuery } from "./getJourneys.js";
import { buildJourneySessionsQuery } from "./getJourneySessions.js";
import { buildJourneySummaryQuery } from "./getJourneySummary.js";
import { JourneyOptions, parseJourneyOptions } from "./journeyPaths.js";

const baseQuery = (filters = "") => ({
  filters,
  start_date: "",
  end_date: "",
  time_zone: "UTC",
});

const filter = (parameter: string, value: string) => ({ parameter, type: "equals", value: [value] });

const options = (overrides: Partial<JourneyOptions> = {}): JourneyOptions => ({
  maxSteps: 4,
  stepFilters: {},
  groupBy: "path",
  ...overrides,
});

const journeysSql = (filters = "", overrides: Partial<JourneyOptions> = {}) =>
  buildJourneysQuery(baseQuery(filters), 1, options(overrides), 15);

describe("buildJourneysQuery session-scoped filters", () => {
  it("keeps later journey pageviews when the referrer exists only on the acquisition row", () => {
    const { query: sql } = journeysSql(JSON.stringify([filter("referrer", "google.com")]));

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("argMinIf(referrer, timestamp, referrer != '') AS referrer");
    expect(sql).toContain("WHERE 1 = 1 AND domainWithoutWWW(referrer) = 'google.com'");
    expect(sql).toContain("FROM events\n            INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("AND type = 'pageview'");
    expect(sql.match(/domainWithoutWWW\(referrer\) = 'google\.com'/g)).toHaveLength(1);
  });

  it("allows campaign and a later pathname to qualify on different rows", () => {
    const filters = JSON.stringify([filter("utm_campaign", "recipe_book_2026"), filter("pathname", "/thank-you")]);
    const { query: sql } = journeysSql(filters);

    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("SELECT DISTINCT session_id\n            FROM events");
    expect(sql).toContain("AND pathname = '/thank-you'");
    expect(sql.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
    expect(sql.match(/pathname = '\/thank-you'/g)).toHaveLength(1);
  });

  it("qualifies sessions by their acquisition channel", () => {
    const { query: sql } = journeysSql(JSON.stringify([filter("channel", "Organic Search")]));

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("'Organic Search'");
  });
});

describe("buildJourneysQuery", () => {
  it("takes each journey's share from the sessions with two or more pages", () => {
    const { query: sql, params } = journeysSql();

    expect(sql).toContain("WHERE length(path_sequence) >= 2");
    expect(sql).toContain("CROSS JOIN (SELECT count() AS total_sessions FROM user_paths) AS totals");
    expect(sql).toContain("sessions_count * 100 / total_sessions AS percentage");
    // The old denominator: every session, including the single-page ones no journey can come from.
    expect(sql).not.toContain("count(DISTINCT session_id)");
    expect(sql).not.toContain("SELECT count() FROM FilteredSessions");
    expect(params).toEqual({ siteId: 1, maxSteps: 4, journeyLimit: 15 });
  });

  it("binds step filters as parameters instead of writing them into the SQL", () => {
    const { query: sql, params } = journeysSql("", {
      stepFilters: { 0: "/pricing", 2: "/docs/**", 3: "/blog/*" },
    });

    expect(sql).toContain("journey[1] = {stepFilter1:String}");
    expect(sql).toContain("match(journey[3], {stepFilter3:String})");
    expect(sql).toContain("match(journey[4], {stepFilter4:String})");
    expect(sql).not.toContain("/pricing");
    expect(sql).not.toContain("/docs");
    expect(params).toMatchObject({
      stepFilter1: "/pricing",
      stepFilter3: "^/docs/.*$",
      stepFilter4: "^/blog/[^/]+$",
    });
  });

  it("keeps a hostile step filter out of the SQL text", () => {
    const hostile = "'; DROP TABLE events; --";
    const { query: sql, params } = journeysSql("", { stepFilters: { 0: hostile } });

    expect(sql).not.toContain("DROP TABLE");
    expect(params.stepFilter1).toBe(hostile);
  });

  it("ignores empty step filters and filters beyond the last step", () => {
    const { query: sql, params } = journeysSql("", { stepFilters: { 1: "", 4: "/late", 99999999999: "/far" } });

    expect(sql).not.toContain("journey[");
    expect(Object.keys(params).filter(key => key.startsWith("stepFilter"))).toEqual([]);
  });

  it("cuts journeys at the first visit to the end page after the entry page", () => {
    const { query: sql, params } = journeysSql("", { endsAt: "/signup" });

    expect(sql).toContain("arrayFirstIndex((p, i) -> i >= 2 AND p = {endsAt:String}, pages, arrayEnumerate(pages))");
    expect(sql).toContain("BETWEEN 2 AND {maxSteps:Int32}");
    expect(sql).toContain("WHERE notEmpty(journey)");
    expect(params.endsAt).toBe("/signup");
  });

  it("matches a wildcard end page as a pattern", () => {
    const { query: sql, params } = journeysSql("", { endsAt: "/signup/**" });

    expect(sql).toContain("match(p, {endsAt:String})");
    expect(params.endsAt).toBe("^/signup/.*$");
  });

  it("uses whole paths unless pages are grouped by section", () => {
    expect(journeysSql().query).toContain("SELECT session_id, path_sequence AS pages");

    const { query: sql } = journeysSql("", { groupBy: "section" });
    expect(sql).toContain("arrayCompact(arrayMap(p -> if(match(p, '^/[^/]+/.+')");
    expect(sql).toContain("concat(extract(p, '^(/[^/]+)/'), '/**')");
  });

  it("counts goal conversions per journey only when a goal is given", () => {
    expect(journeysSql().query).not.toContain("GoalSessions");
    expect(journeysSql().query).not.toContain("conversions");

    const { query: sql } = journeysSql("", { goalCondition: "type = 'custom_event' AND event_name = 'signup'" });
    expect(sql).toContain("GoalSessions AS (");
    expect(sql).toContain("AND (type = 'custom_event' AND event_name = 'signup')");
    expect(sql).toContain("countIf(session_id IN (SELECT session_id FROM GoalSessions)) AS conversions");
  });

  it("bounds the result and breaks ties by path so pages of results are stable", () => {
    const { query: sql, params } = journeysSql();

    expect(sql).toContain("ORDER BY sessions_count DESC, journey ASC\n          LIMIT {journeyLimit:Int32}");
    expect(params.journeyLimit).toBe(15);
  });
});

describe("buildJourneySummaryQuery", () => {
  it("aggregates the multi-page sessions by exit page in one pass", () => {
    const { query: sql, params } = buildJourneySummaryQuery(baseQuery(), 7);

    expect(sql).toContain("path_sequence[length(path_sequence)] AS exit_page");
    expect(sql).toContain("FROM user_paths\n          GROUP BY exit_page");
    expect(sql).toContain("argMax(exit_page, exit_sessions) AS top_exit_page");
    expect(sql).toContain("0 AS exit_conversions");
    expect(sql).not.toContain("GoalSessions");
    expect(params).toEqual({ siteId: 7, maxSteps: 2 });
  });

  it("counts the sessions that completed the goal", () => {
    const { query: sql } = buildJourneySummaryQuery(
      baseQuery(),
      7,
      "type = 'pageview' AND match(pathname, '^/welcome$')"
    );

    expect(sql).toContain("GoalSessions AS (");
    expect(sql).toContain("countIf(session_id IN (SELECT session_id FROM GoalSessions)) AS exit_conversions");
  });

  it("applies the page's session filters", () => {
    const { query: sql } = buildJourneySummaryQuery(baseQuery(JSON.stringify([filter("country", "US")])), 7);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
  });
});

describe("buildJourneySessionsQuery", () => {
  const sessionsSql = (overrides: Partial<JourneyOptions> = {}, replaysOnly = false) =>
    buildJourneySessionsQuery({ ...baseQuery(), path: "[]" }, 1, options(overrides), {
      path: ["/", "/pricing"],
      replaysOnly,
      limit: 25,
      page: 3,
    });

  it("selects the sessions whose journey is exactly the path", () => {
    const { query: sql, params } = sessionsSql();

    expect(sql).toContain("FROM session_journeys\n      WHERE journey = {journeyPath:Array(String)}");
    expect(sql).toContain("AND session_id IN (SELECT session_id FROM TargetSessions)");
    expect(sql).not.toContain("/pricing");
    expect(params).toMatchObject({ journeyPath: ["/", "/pricing"], limit: 25, offset: 50, maxSteps: 4 });
  });

  it("derives the journey the same way the journeys query does", () => {
    const journeyOptions = { endsAt: "/signup", groupBy: "section" as const, stepFilters: { 0: "/" } };
    const journeysCte = journeysSql("", journeyOptions).query.match(/session_journeys AS \(([\s\S]*?)\n\s*\),/)?.[1];
    const sessionsCte = sessionsSql(journeyOptions).query.match(/session_journeys AS \(([\s\S]*?)\n\s*\),/)?.[1];

    expect(journeysCte).toBeTruthy();
    expect(sessionsCte).toBe(journeysCte);
  });

  it("can keep only the sessions that have a replay", () => {
    expect(sessionsSql().query).not.toContain("WHERE r.session_id != ''");
    expect(sessionsSql({}, true).query).toContain("WHERE r.session_id != ''");
  });
});

describe("parseJourneyOptions", () => {
  it("defaults to three steps of whole paths", () => {
    expect(parseJourneyOptions({})).toEqual({
      ok: true,
      options: { maxSteps: 3, stepFilters: {}, endsAt: undefined, groupBy: "path" },
      goalId: undefined,
    });
  });

  it("reads every option", () => {
    expect(
      parseJourneyOptions({
        steps: "10",
        stepFilters: JSON.stringify({ 0: "/", 2: "/docs/**" }),
        endsAt: " /signup ",
        groupBy: "section",
        goalId: "12",
      })
    ).toEqual({
      ok: true,
      options: { maxSteps: 10, stepFilters: { 0: "/", 2: "/docs/**" }, endsAt: "/signup", groupBy: "section" },
      goalId: 12,
    });
  });

  it.each([{ steps: "1" }, { steps: "11" }, { steps: "many" }])("rejects steps outside 2 to 10: %o", query => {
    expect(parseJourneyOptions(query)).toEqual({
      ok: false,
      error: "Steps parameter must be a number between 2 and 10",
    });
  });

  it.each(["not json", JSON.stringify({ first: "/" }), JSON.stringify({ 0: 5 }), JSON.stringify(["/"])])(
    "rejects malformed step filters: %s",
    stepFilters => {
      expect(parseJourneyOptions({ stepFilters })).toEqual({ ok: false, error: "Invalid stepFilters format" });
    }
  );

  it.each([{ groupBy: "folder" }, { goalId: "abc" }, { goalId: "-3" }, { endsAt: "/".repeat(2049) }])(
    "rejects an unknown grouping, a bad goal id and an oversized end page: %o",
    query => {
      expect(parseJourneyOptions(query)).toEqual({ ok: false, error: "Invalid journey options" });
    }
  );
});
