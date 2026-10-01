import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { draftGoal } from "./getGoalPreview.js";
import { buildGoalTimeSeriesQuery } from "./getGoalTimeSeries.js";
import { buildGoalsConversionsQuery } from "./getGoals.js";
import {
  buildConvertingSessionsQuery,
  chunkGoals,
  GoalSummaryRow,
  GOALS_PER_QUERY,
  MAX_SUMMARY_GOALS,
  rankGoals,
} from "./getGoalsSummary.js";

const CAMPAIGN_FILTER = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["recipe_book_2026"] }]);

const query = {
  filters: "",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  time_zone: "UTC",
};

const pricingGoal = { goalType: "path", config: { pathPattern: "/pricing" } };
const signupGoal = { goalType: "event", config: { eventName: "signup" } };

const row = (overrides: Partial<GoalSummaryRow>): GoalSummaryRow => ({
  goalId: 1,
  name: null,
  goalType: "path",
  config: { pathPattern: "/" },
  createdAt: "2026-09-01 00:00:00",
  total_conversions: 0,
  total_sessions: 100,
  conversion_rate: 0,
  ...overrides,
});

describe("buildConvertingSessionsQuery", () => {
  it("counts a session once however many goals it completed", () => {
    const sql = buildConvertingSessionsQuery(query, 1, [pricingGoal, signupGoal]);

    expect(sql).toContain("COUNT(DISTINCT session_id) AS converting_sessions");
    expect(sql).toContain(
      "((type = 'pageview' AND match(pathname, '^/pricing$')) OR (type = 'custom_event' AND event_name = 'signup'))"
    );
    expect(sql).toContain("site_id = 1");
  });

  it("is bounded by the selected window", () => {
    const sql = buildConvertingSessionsQuery(query, 1, [pricingGoal]);

    expect(sql).toContain("2026-09-01");
    expect(sql).toContain("2026-09-30");
  });

  it("qualifies sessions with the same filters as the per-goal counts", () => {
    const sql = buildConvertingSessionsQuery({ ...query, filters: CAMPAIGN_FILTER }, 1, [signupGoal]);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
  });

  it("escapes goal patterns instead of interpolating them", () => {
    const sql = buildConvertingSessionsQuery(query, 1, [{ goalType: "event", config: { eventName: "x' OR 1=1 --" } }]);

    expect(sql).toContain("event_name = 'x\\' OR 1=1 --'");
  });

  it("skips goals with no usable condition and returns null when none is left", () => {
    const sql = buildConvertingSessionsQuery(query, 1, [{ goalType: "path", config: {} }, signupGoal]);

    expect(sql).toContain("AND ((type = 'custom_event' AND event_name = 'signup'))");
    expect(buildConvertingSessionsQuery(query, 1, [{ goalType: "path", config: {} }])).toBeNull();
    expect(buildConvertingSessionsQuery(query, 1, [])).toBeNull();
  });
});

describe("chunkGoals", () => {
  it("keeps every goal, in order, in chunks no larger than the size", () => {
    const ids = Array.from({ length: 5 }, (_, index) => index);

    expect(chunkGoals(ids, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(chunkGoals([], 2)).toEqual([]);
  });

  it("needs at most two conversions queries for the largest summary", () => {
    const ids = Array.from({ length: MAX_SUMMARY_GOALS }, (_, index) => index);

    expect(chunkGoals(ids, GOALS_PER_QUERY)).toHaveLength(2);
  });
});

describe("rankGoals", () => {
  it("puts the most conversions first", () => {
    const ranked = rankGoals([
      row({ goalId: 1, total_conversions: 5 }),
      row({ goalId: 2, total_conversions: 50 }),
      row({ goalId: 3, total_conversions: 20 }),
    ]);

    expect(ranked.map(goal => goal.goalId)).toEqual([2, 3, 1]);
  });

  it("breaks ties by newest goal, then by id, so the order is stable", () => {
    const ranked = rankGoals([
      row({ goalId: 1, createdAt: "2026-01-01 00:00:00" }),
      row({ goalId: 2, createdAt: "2026-05-01 00:00:00" }),
      row({ goalId: 3, createdAt: null }),
      row({ goalId: 4, createdAt: null }),
    ]);

    expect(ranked.map(goal => goal.goalId)).toEqual([2, 1, 4, 3]);
  });

  it("does not reorder its input", () => {
    const rows = [row({ goalId: 1, total_conversions: 1 }), row({ goalId: 2, total_conversions: 2 })];
    rankGoals(rows);

    expect(rows.map(goal => goal.goalId)).toEqual([1, 2]);
  });
});

describe("goal preview", () => {
  const draft = draftGoal(7, { goalType: "path", config: { pathPattern: "/welcome/*" } });

  it("runs an unsaved goal through the stored-goal conversions query", () => {
    const sql = buildGoalsConversionsQuery(query, 7, [draft]);

    expect(sql).toContain("match(pathname, '^/welcome/[^/]+$')");
    expect(sql).toContain("AS goal_0_conversions");
    expect(sql).toContain("site_id = 7");
  });

  it("runs an unsaved goal through the stored-goal time series query", () => {
    const sql = buildGoalTimeSeriesQuery({ ...query, bucket: "day" }, 7, [draft]);

    expect(sql).toContain("toStartOfDay");
    expect(sql).toContain("match(pathname, '^/welcome/[^/]+$')");
    expect(sql).toContain("SELECT arrayJoin([0]) AS goal_id");
  });

  it("applies the page's filters to the preview", () => {
    const sql = buildGoalsConversionsQuery({ ...query, filters: CAMPAIGN_FILTER }, 7, [draft]);

    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
  });
});
