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
