import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { FilterParams } from "@rybbit/shared";
import { buildOverviewBucketedQuery } from "./getOverviewBucketed.js";

const SITE_ID = 1;

const baseParams = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    start_date: "2026-07-17",
    end_date: "2026-07-23",
    time_zone: "UTC",
    filters: "",
    bucket: "day",
    ...overrides,
  }) as FilterParams & { bucket: "day" };

// The unbucketed overview is built by the Site Metrics module, which the PDF
// report and the weekly email share; its coverage lives in siteMetrics.test.ts.
describe("unique user counting", () => {
  describe("buildOverviewBucketedQuery", () => {
    it("counts users by identity, falling back to the device fingerprint", () => {
      const sql = buildOverviewBucketedQuery(baseParams(), SITE_ID);

      expect(sql).toContain("COUNT(DISTINCT COALESCE(NULLIF(identified_user_id, ''), user_id)) AS users");
    });
  });
});

describe("buildOverviewBucketedQuery join", () => {
  it("takes the bucket from whichever side has it instead of defaulting to 1970", () => {
    const sql = buildOverviewBucketedQuery(baseParams({ start_date: "", end_date: "" }), SITE_ID);

    expect(sql).toContain("coalesce(session_stats.time, page_stats.time) AS time");
    expect(sql).toContain("coalesce(session_stats.sessions, 0) AS sessions");
    expect(sql).toContain("coalesce(page_stats.pageviews, 0) AS pageviews");
    expect(sql).toContain("SETTINGS join_use_nulls = 1");
    expect(sql).not.toContain("session_stats.time AS time");
  });
});
