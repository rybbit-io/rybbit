import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildMetricQuery } from "./getMetric.js";
import { SESSION_CHANNEL_AGG } from "./utils/sessionAttribution.js";
import { FilterParameter } from "./types.js";

const baseQuery = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    start_date: "",
    end_date: "",
    time_zone: "",
    filters: "",
    parameter: "browser" as FilterParameter,
    ...overrides,
  }) as Parameters<typeof buildMetricQuery>[0];

const SITE_ID = 1;

describe("buildMetricQuery", () => {
  describe("default (session-attributed) parameters", () => {
    it("aggregates the parameter per session with argMin", () => {
      const sql = buildMetricQuery(baseQuery(), SITE_ID);
      expect(sql).toContain("argMin(browser, e.timestamp) as value");
      expect(sql).toContain("GROUP BY e.session_id");
      expect(sql).toContain("LIMIT 100");
    });

    it("uses the session-channel aggregation for channel", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "channel" }), SITE_ID);
      expect(sql).toContain(`${SESSION_CHANNEL_AGG} as value`);
      expect(sql).not.toContain("argMin(channel, e.timestamp)");
    });

    it("counts distinct values in the count query without pagination", () => {
      const sql = buildMetricQuery(baseQuery({ limit: 25, page: 3 }), SITE_ID, true);
      expect(sql).toContain("COUNT(DISTINCT value) as totalCount");
      expect(sql).not.toContain("LIMIT");
      expect(sql).not.toContain("OFFSET");
    });
  });

  describe("event_name", () => {
    it("restricts to custom events", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "event_name" }), SITE_ID);
      expect(sql).toContain("event_name as value");
      expect(sql).toContain("AND type = 'custom_event'");
    });

    it("counts distinct event names", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "event_name" }), SITE_ID, true);
      expect(sql).toContain("COUNT(DISTINCT event_name) as totalCount");
    });
  });

  describe("page_title", () => {
    it("computes bounce rate from single-pageview sessions", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "page_title" }), SITE_ID);
      expect(sql).toContain("SessionPageCounts");
      expect(sql).toContain("pageviews_in_session = 1");
      expect(sql).toContain("as bounce_rate");
    });

    it("wraps the core logic for the count query", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "page_title" }), SITE_ID, true);
      expect(sql).toContain("SELECT COUNT(*) as totalCount FROM (");
    });
  });

  describe("entry_page / exit_page", () => {
    it("orders sessions ascending for entry pages", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "entry_page" }), SITE_ID);
      expect(sql).toContain("ORDER BY timestamp ASC) as row_num");
      expect(sql).toContain("WHERE row_num = 1");
    });

    it("orders sessions descending for exit pages", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "exit_page" }), SITE_ID);
      expect(sql).toContain("ORDER BY timestamp DESC) as row_num");
    });

    it("caps time-on-page at 30 minutes", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "entry_page" }), SITE_ID);
      expect(sql).toContain("time_diff_seconds > 1800, 1800");
    });
  });

  describe("pathname", () => {
    it("aggregates per-path stats with hostname", () => {
      const sql = buildMetricQuery(baseQuery({ parameter: "pathname" }), SITE_ID);
      expect(sql).toContain("anyHeavy(hostname) as top_hostname");
      expect(sql).toContain("GROUP BY pathname");
    });
  });

  describe("pagination", () => {
    it("applies explicit limit and page offsets", () => {
      const sql = buildMetricQuery(baseQuery({ limit: 7, page: 3 }), SITE_ID);
      expect(sql).toContain("LIMIT 7");
      expect(sql).toContain("OFFSET 14");
    });

    it("omits OFFSET on the first page", () => {
      const sql = buildMetricQuery(baseQuery({ limit: 7, page: 1 }), SITE_ID);
      expect(sql).toContain("LIMIT 7");
      expect(sql).not.toContain("OFFSET");
    });
  });

  describe("time and filter statements", () => {
    it("constrains by the requested date range", () => {
      const sql = buildMetricQuery(
        baseQuery({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" }),
        SITE_ID
      );
      expect(sql).toContain("AND timestamp >=");
      expect(sql).toContain("'2024-01-01'");
    });

    it("threads filters into the WHERE clause", () => {
      const filters = JSON.stringify([{ parameter: "country", type: "equals", value: ["US"] }]);
      const sql = buildMetricQuery(baseQuery({ filters }), SITE_ID);
      expect(sql).toContain("'US'");
    });
  });
});
