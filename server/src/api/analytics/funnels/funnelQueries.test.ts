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
    expect(sql).toContain("argMinIf(url_parameters['utm_campaign'], timestamp, url_parameters['utm_campaign'] != '') AS utm_campaign");
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

  it("orders drilldown steps by the millisecond timestamp, like the analysis that counted them", () => {
    const sql = buildFunnelStepSessionsQuery({ ...query, mode: "dropped", page: 1, limit: 25 }, 1, steps, 1);

    expect(sql).toContain("min(timestamp_ms) as step_time");
    expect(sql).toContain("sa.timestamp_ms > s1.step_time");
    expect(sql).not.toContain("sa.timestamp > s1.step_time");
  });

  it("marks each drilldown session that has a replay and keeps the newest first", () => {
    const sql = buildFunnelStepSessionsQuery({ ...query, mode: "reached", page: 1, limit: 25 }, 1, steps, 2);

    expect(sql).toContain("FROM session_replay_metadata_v2");
    expect(sql).toContain("if(r.session_id != '', 1, 0) AS has_replay");
    expect(sql).toContain("ORDER BY a.session_end DESC");
    expect(sql).not.toContain("session_id IN (SELECT session_id FROM ReplaySessions)");
  });

  it("narrows the drilldown to sessions with a replay when asked", () => {
    const reached = buildFunnelStepSessionsQuery(
      { ...query, mode: "reached", page: 1, limit: 25, replays_only: "true" },
      1,
      steps,
      2
    );
    const dropped = buildFunnelStepSessionsQuery(
      { ...query, mode: "dropped", page: 1, limit: 25, replays_only: "true" },
      1,
      steps,
      1
    );

    expect(reached).toMatch(/FROM Step2\s+WHERE session_id IN \(SELECT session_id FROM ReplaySessions\)/);
    expect(dropped).toMatch(/FROM Step2\s+\)\s+AND session_id IN \(SELECT session_id FROM ReplaySessions\)/);
  });

  it("returns the same canonical attribution fields used by session filtering", () => {
    const sql = buildFunnelStepSessionsQuery({ ...query, mode: "reached", page: 1, limit: 25 }, 1, steps, 2);

    expect(sql).toContain("argMinIf(referrer, timestamp, referrer != '') AS referrer");
    expect(sql).toContain("channel NOT IN ('Direct', 'Internal', '')");
    expect(sql).not.toContain("argMin(e.referrer, e.timestamp) AS referrer");
    expect(sql).not.toContain("argMin(e.channel, e.timestamp) AS channel");
  });
});
