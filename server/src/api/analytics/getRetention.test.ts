import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildRetentionQuery } from "./getRetention.js";

describe("retention cohorts", () => {
  it("assigns cohorts from the real first visit and uses the range only to choose which cohorts to show", () => {
    for (const mode of ["day", "week"] as const) {
      const sql = buildRetentionQuery(mode);
      const firstEver = sql.slice(sql.indexOf("UserFirstEver AS"), sql.indexOf("UserFirstPeriod AS"));
      const cohorts = sql.slice(sql.indexOf("UserFirstPeriod AS"), sql.indexOf("PeriodActivity AS"));
      const activity = sql.slice(sql.indexOf("PeriodActivity AS"));

      expect(firstEver).toContain("min(timestamp) AS first_seen");
      expect(firstEver).not.toContain("timeRange");
      expect(cohorts).toContain("WHERE first_seen >= addDays(today(), -{timeRange:UInt16})");
      expect(activity).toContain("AND timestamp >= addDays(today(), -{timeRange:UInt16})");
    }

    expect(buildRetentionQuery("day")).toContain("toDate(first_seen) AS cohort_period");
    expect(buildRetentionQuery("week")).toContain("toStartOfWeek(first_seen, 1) AS cohort_period");
  });
});
