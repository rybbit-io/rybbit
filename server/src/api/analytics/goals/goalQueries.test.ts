import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildGoalSessionsQuery } from "./getGoalSessions.js";
import { buildGoalTimeSeriesQuery } from "./getGoalTimeSeries.js";
import { buildGoalsConversionsQuery, buildGoalsTotalSessionsQuery } from "./getGoals.js";

const CAMPAIGN_FILTER = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["recipe_book_2026"] }]);

const query = {
  filters: CAMPAIGN_FILTER,
  start_date: "",
  end_date: "",
  time_zone: "UTC",
};

const formGoal = {
  goalId: 115,
  siteId: 1,
  name: "Recipe book form",
  goalType: "form_submit",
  config: { valuePattern: "gform_115" },
  createdAt: null,
};

describe("goal queries with global session filters", () => {
  it("qualifies sessions by campaign before counting a later goal event", () => {
    const sql = buildGoalsConversionsQuery(query, 1, [formGoal] as any);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("argMin(url_parameters, timestamp)['utm_campaign'] AS utm_campaign");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("type = 'form_submit'");
  });

  it("uses the same campaign-qualified sessions for the conversion-rate denominator", () => {
    const sql = buildGoalsTotalSessionsQuery(query, 1);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("FROM FilteredSessions");
  });

  it("uses the same campaign-qualified sessions in the time series", () => {
    const sql = buildGoalTimeSeriesQuery({ ...query, bucket: "hour" }, 1, [formGoal] as any);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("type = 'form_submit'");
  });

  it("applies the campaign filter to the expanded converted-sessions list", () => {
    const sql = buildGoalSessionsQuery(
      { ...query, page: 1, limit: 25 },
      1,
      "type = 'form_submit' AND JSONExtractString(toString(props), 'formId') = 'gform_115'"
    );

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
  });
});
