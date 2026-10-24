import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildExperimentResultQueries } from "./getExperimentResults.js";
import { buildExperimentResults } from "./utils.js";

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
    variantKeys: ["control", "treatment"],
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

    // The campaign condition belongs only to FilteredSessions, not separately
    // to the exposure and goal event rows.
    expect(exposureQuery.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
  });

  it("uses the same campaign-qualified sessions for assignment fallback and goal events", () => {
    const { assignmentQuery } = buildQueries();

    expect(assignmentQuery).toContain("FilteredSessions AS");
    expect(assignmentQuery).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(assignmentQuery.match(/INNER JOIN FilteredSessions USING \(session_id\)/g)).toHaveLength(2);
    expect(assignmentQuery).toContain("feature_flags['recipe_book_test'] IN ('control', 'treatment')");
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
});

describe("experiment arms", () => {
  it('only counts sessions assigned a configured variant, not the out-of-rollout "false"', () => {
    const { exposureQuery, assignmentQuery } = buildQueries();

    expect(exposureQuery).toContain("JSONExtractString(toString(props), 'value') IN ('control', 'treatment')");
    expect(assignmentQuery).toContain("feature_flags['recipe_book_test'] IN ('control', 'treatment')");
  });

  it("only counts exposures assigned as a variant, so a variant keyed false can't absorb other sessions", () => {
    const { exposureQuery } = buildQueries();

    expect(exposureQuery).toContain("JSONExtractString(toString(props), 'reason') IN ('variant', '')");
  });

  it("reports one result per configured variant and drops rows for any other value", () => {
    const results = buildExperimentResults(
      ["control", "treatment"],
      [
        { variant: "control", sessions: 100, exposures: 120, conversions: 10 },
        { variant: "false", sessions: 900, exposures: 900, conversions: 300 },
        { variant: "treatment", sessions: 100, exposures: 110, conversions: 20 },
      ]
    );

    expect(results.map(result => result.variant)).toEqual(["control", "treatment"]);
    expect(results.reduce((sum, result) => sum + result.sessions, 0)).toBe(200);
    expect(results[1]).toMatchObject({ conversionRate: 0.2, lift: 1, isControl: false });
  });
});
