import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildFunnelQuery } from "./getFunnel.js";
import { buildFunnelStepSessionsQuery } from "./getFunnelStepSessions.js";
import { FunnelStep } from "./funnelSteps.js";

const CAMPAIGN_FILTER = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["launch"] }]);

const query = {
  filters: CAMPAIGN_FILTER,
  start_date: "",
  end_date: "",
  time_zone: "UTC",
};

const steps: FunnelStep[] = [
  { type: "page", value: "/pricing" },
  { type: "event", value: "signup" },
];

const getSessionActions = (sql: string) => {
  const match = sql.match(/SessionActions AS \(([\s\S]*?)\n\s*\),/);
  expect(match).not.toBeNull();
  return match?.[1] ?? "";
};

describe("funnel queries with global session filters", () => {
  it("qualifies the session by its landing campaign without removing later funnel-step events", () => {
    const sql = buildFunnelQuery(query, 1, steps);
    const sessionActions = getSessionActions(sql);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("argMin(url_parameters, timestamp)['utm_campaign'] AS utm_campaign");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'launch'");
    expect(sessionActions).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sessionActions).not.toContain("url_parameters['utm_campaign'] = 'launch'");
    expect(sessionActions).toContain("pathname");
    expect(sessionActions).toContain("event_name");
  });

  it("uses the same campaign-qualified full session for reached-session drilldown", () => {
    const sql = buildFunnelStepSessionsQuery({ ...query, mode: "reached", page: 1, limit: 25 }, 1, steps, 2);
    const sessionActions = getSessionActions(sql);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'launch'");
    expect(sessionActions).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sessionActions).not.toContain("url_parameters['utm_campaign'] = 'launch'");
    expect(sql).toContain("FROM Step2");
  });

  it("does not misclassify a later untagged conversion as a filtered-session dropoff", () => {
    const sql = buildFunnelStepSessionsQuery({ ...query, mode: "dropped", page: 1, limit: 25 }, 1, steps, 1);
    const sessionActions = getSessionActions(sql);

    expect(sessionActions).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sessionActions).not.toContain("url_parameters['utm_campaign'] = 'launch'");
    expect(sql).toContain("FROM Step1");
    expect(sql).toContain("FROM Step2");
  });

  it("returns the same canonical attribution fields used by session filtering", () => {
    const sql = buildFunnelStepSessionsQuery({ ...query, mode: "reached", page: 1, limit: 25 }, 1, steps, 2);

    expect(sql).toContain("argMinIf(referrer, timestamp, referrer != '') AS referrer");
    expect(sql).toContain("channel NOT IN ('Direct', 'Internal', '')");
    expect(sql).not.toContain("argMin(e.referrer, e.timestamp) AS referrer");
    expect(sql).not.toContain("argMin(e.channel, e.timestamp) AS channel");
  });
});
