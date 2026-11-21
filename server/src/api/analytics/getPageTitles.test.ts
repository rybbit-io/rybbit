import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildPageTitlesQuery } from "./getPageTitles.js";

const baseQuery = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    start_date: "",
    end_date: "",
    time_zone: "",
    filters: "",
    ...overrides,
  }) as Parameters<typeof buildPageTitlesQuery>[0];

describe("buildPageTitlesQuery", () => {
  it("includes untitled pageviews as separate rows per pathname", () => {
    const sql = buildPageTitlesQuery(baseQuery(), 1);

    expect(sql).not.toContain("page_title IS NOT NULL");
    expect(sql).not.toContain("page_title <> ''");
    expect(sql).toContain("if(pd.page_title = '', pd.pathname, '') as untitled_pathname");
    expect(sql).toContain("GROUP BY pd.page_title, untitled_pathname");
  });

  it("counts untitled pathname rows in pagination totals", () => {
    const sql = buildPageTitlesQuery(baseQuery({ limit: 25, page: 2 }), 1, true);

    expect(sql).toContain("GROUP BY pd.page_title, untitled_pathname");
    expect(sql).toContain("SELECT COUNT(*) as totalCount FROM PageTitleStats");
    expect(sql).not.toContain("LIMIT 25");
    expect(sql).not.toContain("OFFSET 25");
  });
});
