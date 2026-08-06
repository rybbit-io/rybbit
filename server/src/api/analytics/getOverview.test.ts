import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { FilterParams } from "@rybbit/shared";
import { buildOverviewQuery } from "./getOverview.js";
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

describe("unique user counting", () => {
  describe("buildOverviewQuery", () => {
    it("counts users by identity, falling back to the device fingerprint", () => {
      const sql = buildOverviewQuery(baseParams(), SITE_ID);

      expect(sql).toContain("COUNT(DISTINCT f.effective_user_id) AS users");
      expect(sql).toContain("anyIf(identified_user_id, identified_user_id != '')");
      expect(sql).toContain("anyLast(user_id)");
    });

    it("resolves the identity once per session rather than per event", () => {
      const sql = buildOverviewQuery(baseParams(), SITE_ID);

      // The identity expression must sit inside the session-grouped CTE, so a
      // visitor whose first pageview predates identify() still counts once.
      const sessionCteBody = sql.split("FilteredSessionsWithStats AS (")[1].split("GROUP BY session_id")[0];
      expect(sessionCteBody).toContain("anyIf(identified_user_id");
    });

    it("never aliases the identity back onto user_id", () => {
      // Shadowing a column with an alias used inside its own expression is a
      // cyclic-alias error in ClickHouse.
      expect(buildOverviewQuery(baseParams(), SITE_ID)).not.toMatch(/anyLast\(user_id\)\) AS user_id/);
    });
  });

  describe("buildOverviewBucketedQuery", () => {
    it("counts users by identity, falling back to the device fingerprint", () => {
      const sql = buildOverviewBucketedQuery(baseParams(), SITE_ID);

      expect(sql).toContain("COUNT(DISTINCT COALESCE(NULLIF(identified_user_id, ''), user_id)) AS users");
    });
  });
});
