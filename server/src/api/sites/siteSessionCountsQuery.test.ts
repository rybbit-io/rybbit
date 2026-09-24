import { describe, expect, it } from "vitest";
import { buildSiteSessionCountsQuery } from "./siteSessionCountsQuery.js";

describe("buildSiteSessionCountsQuery", () => {
  it("uses the hourly overview rollup when lite dashboards are enabled", () => {
    const query = buildSiteSessionCountsQuery(true);

    expect(query).toContain("uniqMerge(sessions) AS total_sessions");
    expect(query).toContain("FROM overview_hourly_mv_target");
    expect(query).toContain("event_hour >= now() - INTERVAL 1 DAY");
    expect(query).toContain("site_id IN {siteIds:Array(UInt16)}");
    expect(query).not.toContain("FROM events");
    expect(query).not.toContain("uniqExact");
  });

  it("keeps the raw-events fallback when lite dashboards are disabled", () => {
    const query = buildSiteSessionCountsQuery(false);

    expect(query).toContain("uniqExact(session_id) AS total_sessions");
    expect(query).toContain("FROM events");
    expect(query).toContain("timestamp >= now() - INTERVAL 1 DAY");
    expect(query).toContain("site_id IN {siteIds:Array(UInt16)}");
  });
});
