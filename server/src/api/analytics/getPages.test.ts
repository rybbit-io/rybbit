import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import {
  buildPagesQuery,
  buildPageTrendsQuery,
  groupTrendRows,
  MAX_TREND_KEYS,
  pagesQuerySchema,
  trendsQuerySchema,
} from "./getPages.js";

const params = {
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  time_zone: "UTC",
  filters: "",
};
const campaignFilter = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["spring"] }]);

describe("pagesQuerySchema", () => {
  it("defaults to all pages by views, 25 at a time", () => {
    expect(pagesQuerySchema.parse({})).toEqual({
      group: "page",
      mode: "all",
      sort: "pageviews",
      order: "desc",
      limit: 25,
      page: 1,
    });
  });

  it("rejects unknown sort columns, oversized pages and sections inside sections", () => {
    expect(pagesQuerySchema.safeParse({ sort: "pathname; DROP TABLE events" }).success).toBe(false);
    expect(pagesQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
    expect(pagesQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(pagesQuerySchema.safeParse({ group: "section", section: "/docs" }).success).toBe(false);
    expect(pagesQuerySchema.safeParse({ group: "section", search: "docs" }).success).toBe(false);
  });

  it("treats a blank search as none", () => {
    expect(pagesQuerySchema.parse({ group: "section", search: "  " }).search).toBeUndefined();
  });
});

describe("trendsQuerySchema", () => {
  it("parses JSON key lists and needs at least one key", () => {
    expect(trendsQuerySchema.parse({ paths: '["/a"]', sections: '["/docs"]' })).toEqual({
      bucket: "day",
      paths: ["/a"],
      sections: ["/docs"],
    });
    expect(trendsQuerySchema.safeParse({}).success).toBe(false);
    expect(trendsQuerySchema.safeParse({ paths: "not json" }).success).toBe(false);
    expect(trendsQuerySchema.safeParse({ paths: "[1]" }).success).toBe(false);
    expect(trendsQuerySchema.safeParse({ bucket: "decade", paths: '["/a"]' }).success).toBe(false);
  });

  it(`caps a batch at ${MAX_TREND_KEYS} keys`, () => {
    const keys = (count: number, prefix: string) =>
      JSON.stringify(Array.from({ length: count }, (_, i) => `${prefix}${i}`));
    expect(trendsQuerySchema.safeParse({ paths: keys(MAX_TREND_KEYS, "/p") }).success).toBe(true);
    expect(trendsQuerySchema.safeParse({ paths: keys(MAX_TREND_KEYS + 1, "/p") }).success).toBe(false);
    expect(trendsQuerySchema.safeParse({ paths: keys(30, "/p"), sections: keys(30, "/s") }).success).toBe(false);
  });
});

describe("buildPagesQuery", () => {
  it("binds search and section as parameters instead of interpolating them", () => {
    const spec = buildPagesQuery(params, pagesQuerySchema.parse({ section: "/it's", search: "o'brien" }), 1);

    expect(spec.query).not.toContain("o'brien");
    expect(spec.query).not.toContain("/it's");
    expect(spec.query).toContain("{search:String}");
    expect(spec.query).toContain("{section:String}");
    expect(spec.params).toEqual({ siteId: 1, section: "/it's", search: "o'brien" });
  });

  it("groups rows by path, not by title", () => {
    const { query } = buildPagesQuery(params, pagesQuerySchema.parse({}), 1);

    expect(query).toContain("GROUP BY pathname");
    expect(query).not.toContain("GROUP BY page_title");
    expect(query).not.toContain("GROUP BY section");
  });

  it("orders by the whitelisted column with nulls last and pages with LIMIT and OFFSET", () => {
    const { query } = buildPagesQuery(
      params,
      pagesQuerySchema.parse({ sort: "bounce_rate", order: "asc", limit: "10", page: "3" }),
      1
    );

    expect(query).toContain("ORDER BY bounce_rate ASC NULLS LAST, key ASC");
    expect(query).toContain("LIMIT 10 OFFSET 20");
  });

  it("breaks ties in section mode the way the section list does", () => {
    const { query } = buildPagesQuery(params, pagesQuerySchema.parse({ group: "section" }), 1);

    expect(query).toContain("ORDER BY pageviews DESC NULLS LAST, section ASC");
  });

  it("filters entry and exit pages per page, and per section in section mode", () => {
    const entryPages = buildPagesQuery(params, pagesQuerySchema.parse({ mode: "entry" }), 1).query;
    const exitSections = buildPagesQuery(params, pagesQuerySchema.parse({ mode: "exit", group: "section" }), 1).query;

    expect(entryPages).toContain("HAVING entry_views > 0");
    expect(exitSections).toContain("GROUP BY section");
    expect(exitSections).toContain("HAVING exits > 0");
    expect(exitSections).not.toContain("exit_views > 0");
  });

  it("qualifies whole sessions with the filters before measuring pages", () => {
    const { query } = buildPagesQuery({ ...params, filters: campaignFilter }, pagesQuerySchema.parse({}), 1);

    expect(query).toContain("FilteredSessions AS (");
    expect(query).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(query.slice(query.indexOf("PageViews AS ("))).not.toContain("url_parameters['utm_campaign']");
  });

  it("keeps whole sessions when listing one section", () => {
    const { query } = buildPagesQuery(params, pagesQuerySchema.parse({ section: "/docs" }), 1);

    // The section narrows the sessions read, then the pages listed; never the views inside a session.
    expect(query).toMatch(/AND session_id IN \(\s*SELECT session_id/);
    expect(query).toContain("WHERE extract(pathname, '^/?[^/]*') = {section:String}");
  });
});

describe("buildPageTrendsQuery", () => {
  it("binds the key lists and zero-fills each key's series", () => {
    const query = trendsQuerySchema.parse({ bucket: "day", paths: '["/a"]', sections: '["/docs"]' });
    const spec = buildPageTrendsQuery(params, query, 1);

    expect(spec.params).toEqual({ siteId: 1, paths: ["/a"], sections: ["/docs"] });
    expect(spec.query).toContain("{paths:Array(String)}");
    expect(spec.query).toContain("ORDER BY key, time WITH FILL");
    expect(spec.query).not.toContain("'/a'");
  });
});

describe("groupTrendRows", () => {
  it("splits keys into pages and sections and totals each series", () => {
    expect(
      groupTrendRows([
        { key: "page:/a:b", time: "2026-08-01 00:00:00", pageviews: 2 },
        { key: "page:/a:b", time: "2026-08-02 00:00:00", pageviews: 0 },
        { key: "section:/docs", time: "2026-08-01 00:00:00", pageviews: 5 },
      ])
    ).toEqual([
      {
        kind: "page",
        key: "/a:b",
        pageviews: 2,
        series: [
          { time: "2026-08-01 00:00:00", pageviews: 2 },
          { time: "2026-08-02 00:00:00", pageviews: 0 },
        ],
      },
      { kind: "section", key: "/docs", pageviews: 5, series: [{ time: "2026-08-01 00:00:00", pageviews: 5 }] },
    ]);
  });
});
