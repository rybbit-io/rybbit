import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { getTimeStatement } from "../analytics/utils/timeWindow.js";
import { buildExperimentResultQueries, EXPERIMENT_UNIT, resolveExperimentWindow } from "./getExperimentResults.js";
import { buildCumulativeSeries } from "./getExperimentTimeseries.js";
import {
  buildExperimentResults,
  experimentFlagError,
  experimentUpdateError,
  flagUpdateForStatusChange,
  rolloutWinner,
  SERVER_ONLY_FLAG_ERROR,
} from "./utils.js";

const CAMPAIGN_FILTER = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["recipe_book_2026"] }]);

const query = {
  filters: CAMPAIGN_FILTER,
  start_date: "",
  end_date: "",
  time_zone: "UTC",
};

const buildQueries = () =>
  buildExperimentResultQueries({
    query,
    siteId: 1,
    flagKey: "recipe_book_test",
    goalCondition: "type = 'form_submit' AND JSONExtractString(toString(props), 'formId') = 'gform_115'",
  });

describe("experiment result queries", () => {
  it("qualifies the session by its landing campaign before selecting later exposure and goal events", () => {
    const { exposureQuery } = buildQueries();

    expect(exposureQuery).toContain("FilteredSessions AS");
    expect(exposureQuery).toContain("argMinIf(url_parameters['utm_campaign'], timestamp, url_parameters['utm_campaign'] != '') AS utm_campaign");
    expect(exposureQuery).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(exposureQuery.match(/INNER JOIN FilteredSessions USING \(session_id\)/g)).toHaveLength(2);
    expect(exposureQuery).toContain("event_name = 'feature_flag_exposure'");
    expect(exposureQuery).toContain("type = 'form_submit'");
    expect(exposureQuery).toContain("JSONExtractString(toString(props), 'value') NOT IN ('', 'false')");

    // The campaign condition belongs only to FilteredSessions, not separately
    // to the exposure and goal event rows.
    expect(exposureQuery.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
  });

  it("uses the same campaign-qualified sessions for assignment fallback and goal events", () => {
    const { assignmentQuery } = buildQueries();

    expect(assignmentQuery).toContain("FilteredSessions AS");
    expect(assignmentQuery).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(assignmentQuery.match(/INNER JOIN FilteredSessions USING \(session_id\)/g)).toHaveLength(2);
    expect(assignmentQuery).toContain("feature_flags['recipe_book_test'] NOT IN ('', 'false')");
    expect(assignmentQuery).toContain("type = 'form_submit'");
    expect(assignmentQuery.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
  });

  it("attributes a session to its first exposure variant instead of grouping it into every observed variant", () => {
    const { exposureQuery } = buildQueries();

    expect(exposureQuery).toContain("argMin(JSONExtractString(toString(props), 'value'), timestamp) AS variant");
    expect(exposureQuery).not.toContain("GROUP BY session_id, variant");
  });

  it("attributes assignment fallback to the first assigned variant per session", () => {
    const { assignmentQuery } = buildQueries();

    expect(assignmentQuery).toContain("argMin(feature_flags['recipe_book_test'], timestamp) AS variant");
    expect(assignmentQuery).not.toContain("GROUP BY session_id, variant");
  });

  it("groups exposures and goals by visitor, falling back to the session", () => {
    const { exposureQuery, assignmentQuery } = buildQueries();

    expect(EXPERIMENT_UNIT).toBe("if(visitor_id != '', visitor_id, session_id)");
    for (const sql of [exposureQuery, assignmentQuery]) {
      expect(sql.match(/if\(visitor_id != '', visitor_id, session_id\) AS unit/g)).toHaveLength(2);
      expect(sql).toContain("GROUP BY unit");
      expect(sql).toContain("uniqExactArray(u.session_ids) AS sessions");
    }
  });

  it("counts a conversion from a later session against the unit's first exposure", () => {
    const { exposureQuery, assignmentQuery } = buildQueries();

    for (const sql of [exposureQuery, assignmentQuery]) {
      expect(sql).toContain("LEFT JOIN goal_units g ON g.unit = u.unit");
      expect(sql).toContain("uniqExactIf(u.unit, g.last_goal_at >= u.exposed_at) AS conversions");
      expect(sql).toContain("uniqExact(u.unit) AS units");
    }
  });

  it("dates a unit's conversion by its first goal at or after exposure, in the site time zone", () => {
    const { exposureTimeseriesQuery, assignmentTimeseriesQuery } = buildQueries();

    for (const sql of [exposureTimeseriesQuery, assignmentTimeseriesQuery]) {
      expect(sql).toContain("minIf(g.timestamp, g.timestamp >= u.exposed_at) AS converted_at");
      expect(sql).toContain("toDate(exposed_at, 'UTC') AS day");
      expect(sql).toContain("WHERE converted_at > toDateTime(0)");
      expect(sql).toContain("GROUP BY variant, day");
    }
    expect(exposureTimeseriesQuery).toContain("event_name = 'feature_flag_exposure'");
    expect(assignmentTimeseriesQuery).toContain("feature_flags['recipe_book_test'] NOT IN ('', 'false')");
  });
});

describe("resolveExperimentWindow", () => {
  const rangeQuery = { filters: "", start_date: "2026-09-01", end_date: "2026-09-26", time_zone: "Europe/Amsterdam" };
  const now = new Date("2026-09-26T10:00:00.400Z");

  it("measures a running experiment from its start until now", () => {
    const { query, window } = resolveExperimentWindow(rangeQuery, { startedAt: "2026-09-25 21:29:05.93", endedAt: null }, now);

    expect(query).toMatchObject({ start_date: "", end_date: "", start_datetime: "2026-09-25 21:29:05" });
    expect(query.end_datetime).toBe("2026-09-26 10:00:02");
    expect(window).toEqual({ mode: "experiment", start: "2026-09-25 21:29:05", end: null });
    expect(getTimeStatement(query)).toContain("timestamp >= toDateTime('2026-09-25 21:29:05', 'UTC')");
  });

  it("stops a completed experiment at its end", () => {
    const { query, window } = resolveExperimentWindow(
      rangeQuery,
      { startedAt: "2026-09-25 21:29:05.93", endedAt: "2026-09-25 21:37:36.163" },
      now
    );

    expect(query.end_datetime).toBe("2026-09-25 21:37:37");
    expect(window).toEqual({ mode: "experiment", start: "2026-09-25 21:29:05", end: "2026-09-25 21:37:37" });
  });

  it("uses the page date range when asked, or before the experiment starts", () => {
    const started = { startedAt: "2026-09-25 21:29:05.93", endedAt: null };
    expect(resolveExperimentWindow({ ...rangeQuery, window: "range" as const }, started, now).query).toMatchObject(rangeQuery);
    expect(resolveExperimentWindow(rangeQuery, { startedAt: null, endedAt: null }, now).window).toEqual({
      mode: "range",
      start: "2026-09-01",
      end: "2026-09-26",
    });
  });
});

describe("buildCumulativeSeries", () => {
  it("fills every day of the window and accumulates units and conversions", () => {
    const series = buildCumulativeSeries(
      ["control", "test"],
      [
        { variant: "control", day: "2026-09-24", units: "4", conversions: "1" },
        { variant: "test", day: "2026-09-24", units: "5", conversions: "0" },
        { variant: "test", day: "2026-09-26", units: "5", conversions: "3" },
      ],
      { mode: "experiment", start: "2026-09-23 23:30:00", end: null },
      "Europe/Amsterdam",
      "2026-09-26"
    );

    expect(series.map(s => s.points.map(p => p.date))).toEqual([
      ["2026-09-24", "2026-09-25", "2026-09-26"],
      ["2026-09-24", "2026-09-25", "2026-09-26"],
    ]);
    expect(series[0].points.map(p => [p.units, p.conversions])).toEqual([[4, 1], [4, 1], [4, 1]]);
    expect(series[1].points[2]).toEqual({ date: "2026-09-26", units: 10, conversions: 3, conversionRate: 0.3 });
  });

  it("uses the data's own days for an all-time range", () => {
    const series = buildCumulativeSeries(
      ["control"],
      [{ variant: "control", day: "2026-09-20", units: 2, conversions: 1 }, { variant: "control", day: "2026-09-21", units: 2, conversions: 0 }],
      { mode: "range", start: null, end: null },
      "UTC"
    );

    expect(series[0].points.map(p => p.date)).toEqual(["2026-09-20", "2026-09-21"]);
  });

  it("keeps the most recent days of a long window and carries earlier totals", () => {
    const series = buildCumulativeSeries(
      ["control"],
      [
        { variant: "control", day: "2024-01-01", units: 10, conversions: 5 },
        { variant: "control", day: "2026-09-26", units: 10, conversions: 1 },
      ],
      { mode: "range", start: null, end: null },
      "UTC"
    );

    const points = series[0].points;
    expect(points).toHaveLength(366);
    expect(points[points.length - 1]).toEqual({ date: "2026-09-26", units: 20, conversions: 6, conversionRate: 0.3 });
    expect(points[0]).toMatchObject({ date: "2025-09-26", units: 10, conversions: 5 });
  });
});

describe("buildExperimentResults", () => {
  it("uses units, not sessions, as the conversion-rate denominator", () => {
    const results = buildExperimentResults(
      ["control", "test"],
      [
        { variant: "control", units: 10, sessions: 25, exposures: 40, conversions: 5 },
        { variant: "test", units: 10, sessions: 12, exposures: 15, conversions: 6 },
      ]
    );

    expect(results[0]).toMatchObject({ variant: "control", units: 10, sessions: 25, conversionRate: 0.5, isControl: true });
    expect(results[1].conversionRate).toBe(0.6);
    expect(results[1].lift).toBeCloseTo(0.2);
  });

  it("coerces ClickHouse UInt64 strings to numbers", () => {
    const [control] = buildExperimentResults(["control"], [
      { variant: "control", units: "4", sessions: "6", exposures: "8", conversions: "1" } as never,
    ]);

    expect(control).toMatchObject({ units: 4, sessions: 6, exposures: 8, conversions: 1, conversionRate: 0.25 });
  });
});

describe("rolloutWinner", () => {
  const flag = {
    rolloutPercentage: 40,
    variants: [],
    conditionSets: [
      {
        name: "Beta users",
        rules: [{ field: "country", operator: "equals", value: "NL" }],
        rolloutPercentage: 50,
        variants: [
          { key: "control", name: "Control", rolloutPercentage: 50 },
          { key: "variant_a", name: "Variant A", rolloutPercentage: 50, payload: { copy: "Try it" } },
        ],
      },
      { name: "Everyone else", rules: [], variants: [] },
    ],
  } as never;

  it("serves the winner to everyone the flag targets, keeping rules and variant details", () => {
    const rollout = rolloutWinner(flag, "variant_a");

    expect(rollout.rolloutPercentage).toBe(100);
    expect(rollout.conditionSets[0]).toMatchObject({
      name: "Beta users",
      rules: [{ field: "country", operator: "equals", value: "NL" }],
      rolloutPercentage: 100,
      variants: [
        { key: "control", name: "Control", rolloutPercentage: 0 },
        { key: "variant_a", name: "Variant A", rolloutPercentage: 100, payload: { copy: "Try it" } },
      ],
    });
    expect(rollout.conditionSets[1]).toEqual({ name: "Everyone else", rules: [], variants: [], rolloutPercentage: 100 });
  });
});

describe("flagUpdateForStatusChange", () => {
  const flag = (enabled: boolean) =>
    ({
      enabled,
      rolloutPercentage: 100,
      variants: [],
      conditionSets: [{ rules: [], variants: [{ key: "control", rolloutPercentage: 50 }, { key: "test", rolloutPercentage: 50 }] }],
    }) as never;

  it("switches the flag off when pausing and back on when resuming", () => {
    expect(flagUpdateForStatusChange("running", "paused", flag(true))).toEqual({ enabled: false });
    expect(flagUpdateForStatusChange("paused", "running", flag(false))).toEqual({ enabled: true });
  });

  it("switches a disabled flag on when a draft starts", () => {
    expect(flagUpdateForStatusChange("draft", "running", flag(false))).toEqual({ enabled: true });
  });

  it("leaves the flag alone when it is already right or nothing changes", () => {
    expect(flagUpdateForStatusChange("draft", "running", flag(true))).toBeNull();
    expect(flagUpdateForStatusChange("running", "running", flag(true))).toBeNull();
    expect(flagUpdateForStatusChange("running", "draft", flag(true))).toBeNull();
  });

  it("ships the winner, enabled, when completing", () => {
    const update = flagUpdateForStatusChange("paused", "completed", flag(false), "test")!;
    expect(update.enabled).toBe(true);
    expect(update.conditionSets?.[0].variants).toEqual([
      { key: "control", rolloutPercentage: 0 },
      { key: "test", rolloutPercentage: 100 },
    ]);
  });
});

describe("experimentFlagError", () => {
  it("accepts multivariate flags evaluated on the client", () => {
    expect(experimentFlagError({ flagType: "multivariate", runtime: "client" })).toBeNull();
    expect(experimentFlagError({ flagType: "multivariate", runtime: "both" })).toBeNull();
  });

  it("rejects server-only flags, which the tracking script never receives", () => {
    expect(experimentFlagError({ flagType: "multivariate", runtime: "server" })).toBe(SERVER_ONLY_FLAG_ERROR);
  });

  it("rejects flags that aren't multivariate", () => {
    expect(experimentFlagError({ flagType: "boolean", runtime: "client" })).toBe(
      "Experiments require a multivariate feature flag"
    );
  });
});

describe("experimentUpdateError", () => {
  const running = { status: "running" as const, featureFlagId: 7, winningVariant: null };
  const completed = { status: "completed" as const, featureFlagId: 7, winningVariant: "variant_a" };

  it("allows the usual lifecycle and edits that keep the flag", () => {
    expect(experimentUpdateError({ ...running, status: "draft" }, { status: "running", featureFlagId: 9 })).toBeNull();
    expect(experimentUpdateError(running, { status: "paused" })).toBeNull();
    expect(experimentUpdateError(running, { featureFlagId: 7 })).toBeNull();
    expect(experimentUpdateError(running, { status: "completed", winningVariant: "variant_a" })).toBeNull();
    expect(experimentUpdateError(completed, { winningVariant: "variant_a" })).toBeNull();
  });

  it("keeps a completed experiment completed", () => {
    expect(experimentUpdateError(completed, { status: "running" })).toMatch(/can't be reopened/);
    expect(experimentUpdateError(completed, { status: "completed" })).toBeNull();
  });

  it("keeps the flag once the experiment has started", () => {
    expect(experimentUpdateError(running, { featureFlagId: 9 })).toMatch(/flag can't change/);
    expect(experimentUpdateError({ ...running, status: "paused" }, { featureFlagId: 9 })).toMatch(/flag can't change/);
  });

  it("only sets the winner while completing", () => {
    expect(experimentUpdateError(completed, { winningVariant: "control" })).toMatch(/chosen when completing/);
    expect(experimentUpdateError(running, { winningVariant: "variant_a" })).toMatch(/chosen when completing/);
  });
});
