import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import {
  buildFunnelSummaryQuery,
  parseSavedFunnels,
  readFunnelSummaries,
  SummaryFunnel,
} from "./getFunnelSummaries.js";

const query = { start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "UTC", filters: "" };

const visitToSignup: SummaryFunnel = {
  id: 7,
  steps: [
    { type: "page", value: "/pricing" },
    { type: "page", value: "/signup" },
    { type: "event", value: "signup" },
  ],
};
const pricingToSignup: SummaryFunnel = {
  id: 9,
  steps: [
    { type: "page", value: "/pricing" },
    { type: "event", value: "signup" },
  ],
};

const occurrences = (sql: string, fragment: string) => sql.split(fragment).length - 1;

describe("buildFunnelSummaryQuery", () => {
  it("walks each funnel in order on the millisecond timestamp, strictly after the step before", () => {
    const sql = buildFunnelSummaryQuery(query, 1, [visitToSignup]);

    expect(sql).toContain(
      "minIf(toUnixTimestamp64Milli(timestamp_ms), type = 'pageview' AND match(pathname, '^/pricing$')) AS first_0"
    );
    expect(sql).toContain("first_0 AS f0_t0");
    expect(sql).toContain("if(f0_t0 = 0, 0, arrayMin(arrayFilter(x -> x > f0_t0, all_1))) AS f0_t1");
    expect(sql).toContain("if(f0_t1 = 0, 0, arrayMin(arrayFilter(x -> x > f0_t1, all_2))) AS f0_t2");
  });

  it("counts every step and takes medians between steps and from first to last", () => {
    const sql = buildFunnelSummaryQuery(query, 1, [visitToSignup]);

    expect(sql).toContain("countIf(f0_t0 > 0) AS f0_sessions0");
    expect(sql).toContain("countIf(f0_t2 > 0) AS f0_sessions2");
    expect(sql).toContain("quantileIf(0.5)(f0_t1 - f0_t0, f0_t1 > 0) AS f0_median0");
    expect(sql).toContain("quantileIf(0.5)(f0_t2 - f0_t1, f0_t2 > 0) AS f0_median1");
    expect(sql).toContain("quantileIf(0.5)(f0_t2 - f0_t0, f0_t2 > 0) AS f0_median_total");
    expect(sql).not.toContain("f0_median2");
  });

  it("collects a step condition shared by several funnels once", () => {
    const sql = buildFunnelSummaryQuery(query, 1, [visitToSignup, pricingToSignup]);

    // /pricing opens both funnels and signup closes both.
    expect(occurrences(sql, "AS first_0")).toBe(1);
    expect(
      occurrences(
        sql,
        "groupArrayIf(toUnixTimestamp64Milli(timestamp_ms), type = 'custom_event' AND event_name = 'signup')"
      )
    ).toBe(1);
    expect(sql).toContain("first_0 AS f1_t0");
    expect(sql).toContain("if(f1_t0 = 0, 0, arrayMin(arrayFilter(x -> x > f1_t0, all_2))) AS f1_t1");
  });

  it("collects every match of a condition that is both a first and a later step", () => {
    const repeat: SummaryFunnel = {
      id: 3,
      steps: [
        { type: "page", value: "/pricing" },
        { type: "page", value: "/pricing" },
      ],
    };
    const sql = buildFunnelSummaryQuery(query, 1, [repeat]);

    expect(sql).toContain("AS first_0");
    expect(sql).toContain("AS all_0");
    expect(sql).toContain("if(f0_t0 = 0, 0, arrayMin(arrayFilter(x -> x > f0_t0, all_0))) AS f0_t1");
  });

  it("counts a session once however many funnels it enters", () => {
    const sql = buildFunnelSummaryQuery(query, 1, [visitToSignup, pricingToSignup]);

    expect(sql).toContain("countIf(f0_t0 > 0 OR f1_t0 > 0) AS sessions_entered_any");
  });

  it("is bounded by the site and the time window and scans only events that match a step", () => {
    const sql = buildFunnelSummaryQuery(query, 1, [visitToSignup]);

    expect(sql).toContain("site_id = {siteId:Int32}");
    expect(sql).toContain("toDateTime('2026-09-01', 'UTC')");
    expect(sql).toContain(
      "AND ((type = 'pageview' AND match(pathname, '^/pricing$'))\n          OR (type = 'pageview' AND match(pathname, '^/signup$'))\n          OR (type = 'custom_event' AND event_name = 'signup'))"
    );
    expect(sql).toContain("GROUP BY session_id");
  });

  it("qualifies sessions by the global filters without filtering the step events themselves", () => {
    const filters = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["launch"] }]);
    const sql = buildFunnelSummaryQuery({ ...query, filters }, 1, [visitToSignup]);
    const sessionSteps = sql.slice(sql.indexOf("SessionSteps AS"), sql.indexOf("SessionFunnels AS"));

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'launch'");
    expect(sessionSteps).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sessionSteps).not.toContain("utm_campaign");
  });

  it("escapes step values instead of interpolating them", () => {
    const sql = buildFunnelSummaryQuery(query, 1, [
      {
        id: 1,
        steps: [
          { type: "event", value: "it's" },
          { type: "page", value: "/a", hostname: "x' OR 1=1 --" },
        ],
      },
    ]);

    expect(sql).toContain("event_name = 'it\\'s'");
    expect(sql).toContain("hostname = 'x\\' OR 1=1 --'");
  });
});

describe("readFunnelSummaries", () => {
  it("maps the wide row back to one summary per funnel, in seconds", () => {
    const summaries = readFunnelSummaries(
      {
        f0_sessions0: 100,
        f0_sessions1: 40,
        f0_sessions2: 10,
        f0_median0: 58_400,
        f0_median1: 81_000.5,
        f0_median_total: 150_000,
        f1_sessions0: 100,
        f1_sessions1: 0,
        f1_median0: null,
        f1_median_total: null,
      },
      [visitToSignup, pricingToSignup]
    );

    expect(summaries).toEqual([
      {
        funnel_id: 7,
        steps: [
          { sessions: 100, median_seconds_to_next: 58.4 },
          { sessions: 40, median_seconds_to_next: 81.001 },
          { sessions: 10, median_seconds_to_next: null },
        ],
        median_seconds_to_convert: 150,
      },
      {
        funnel_id: 9,
        steps: [
          { sessions: 100, median_seconds_to_next: null },
          { sessions: 0, median_seconds_to_next: null },
        ],
        median_seconds_to_convert: null,
      },
    ]);
  });

  it("reads a period with no matching events as zeros", () => {
    expect(readFunnelSummaries(undefined, [pricingToSignup])).toEqual([
      {
        funnel_id: 9,
        steps: [
          { sessions: 0, median_seconds_to_next: null },
          { sessions: 0, median_seconds_to_next: null },
        ],
        median_seconds_to_convert: null,
      },
    ]);
  });
});

describe("parseSavedFunnels", () => {
  it("keeps funnels with at least two well-formed steps and skips the rest", () => {
    const funnels = parseSavedFunnels([
      { reportId: 1, data: { name: "Good", steps: pricingToSignup.steps } },
      { reportId: 2, data: { name: "One step", steps: [{ type: "page", value: "/" }] } },
      { reportId: 3, data: { name: "No steps" } },
      { reportId: 4, data: null },
      {
        reportId: 5,
        data: {
          steps: [
            { type: "page", value: 5 },
            { type: "page", value: "/" },
          ],
        },
      },
      { reportId: 6, data: { steps: "nope" } },
    ]);

    expect(funnels).toEqual([{ id: 1, steps: pricingToSignup.steps }]);
  });
});
