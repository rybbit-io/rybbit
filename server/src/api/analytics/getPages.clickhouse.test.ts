import { createClient } from "@clickhouse/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Run against any ClickHouse using CLICKHOUSE_TEST_URL and optional
// CLICKHOUSE_TEST_USER / CLICKHOUSE_TEST_PASSWORD. Every query supplies its own
// events CTE: no tables, migrations or production data are needed.
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: {} }));

import {
  buildPagesQuery,
  buildPagesSummaryQuery,
  buildPageTrendsQuery,
  buildSectionViewsQuery,
  groupTrendRows,
  pagesQuerySchema,
  trendsQuerySchema,
} from "./getPages.js";

// site, time, session, path, title, type
const events: [number, string, string, string, string, string][] = [
  // A four-page visit: enters on /, leaves from /pricing.
  [1, "2026-09-10 09:00:00", "s1", "/", "Home", "pageview"],
  [1, "2026-09-10 09:00:30", "s1", "/docs", "Docs", "pageview"],
  [1, "2026-09-10 09:01:30", "s1", "/docs/script", "Script", "pageview"],
  [1, "2026-09-10 09:02:30", "s1", "/pricing", "Pricing", "pageview"],
  // A bounce on /pricing.
  [1, "2026-09-10 10:00:00", "s2", "/pricing", "Pricing", "pageview"],
  // Enters and leaves on /docs/script, with an untitled page between; the
  // page's latest title wins.
  [1, "2026-09-10 11:00:00", "s3", "/docs/script", "Tracking script", "pageview"],
  [1, "2026-09-10 11:00:20", "s3", "/docs/api", "", "pageview"],
  [1, "2026-09-10 11:00:50", "s3", "/docs/script", "Tracking script", "pageview"],
  // 40 minutes on /blog/a is capped at 30.
  [1, "2026-09-10 12:00:00", "s4", "/blog/a", "A", "pageview"],
  [1, "2026-09-10 12:40:00", "s4", "/", "Home", "pageview"],
  // Not pageviews, or not this site, or not this period.
  [1, "2026-09-10 13:00:00", "s5", "/pricing", "Pricing", "custom_event"],
  [2, "2026-09-10 13:00:00", "s6", "/pricing", "Pricing", "pageview"],
  [1, "2026-09-09 13:00:00", "s7", "/pricing", "Pricing", "pageview"],
];
const fixture = `WITH events AS (SELECT * FROM values(
  'site_id Int32, timestamp DateTime(\\'UTC\\'), timestamp_ms DateTime64(3, \\'UTC\\'), session_id String, pathname String, page_title String, type String',
  ${events.map(([site, time, session, path, title, type]) => `(${site}, '${time}', '${time}', '${session}', '${path}', '${title}', '${type}')`).join(",")}
))`;

const day = { start_date: "2026-09-10", end_date: "2026-09-10", time_zone: "UTC", filters: "" };
const pathnameFilter = JSON.stringify([{ parameter: "pathname", type: "equals", value: ["/pricing"] }]);

describe.skipIf(!process.env.CLICKHOUSE_TEST_URL)("Pages report: ClickHouse results", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient({
      url: process.env.CLICKHOUSE_TEST_URL,
      username: process.env.CLICKHOUSE_TEST_USER || "default",
      password: process.env.CLICKHOUSE_TEST_PASSWORD || "",
      compression: { request: false, response: false },
      clickhouse_settings: { readonly: "2", max_threads: 2, max_execution_time: 10 },
    });
  });
  afterAll(async () => {
    await client.close();
  });

  async function run<T>({ query, params }: { query: string; params?: Record<string, unknown> }) {
    const sql = /^\s*WITH\b/.test(query) ? query.replace(/^\s*WITH\b/, `${fixture},`) : `${fixture} ${query}`;
    const result = await client.query({ query: sql, query_params: params, format: "JSONEachRow" });
    const rows = await result.json<Record<string, unknown>>();
    // ClickHouse sends 64-bit counts as strings; compare numbers.
    return rows.map(row =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          typeof value === "string" && value !== "" && !isNaN(Number(value)) && key !== "key" && key !== "section"
            ? Number(value)
            : value,
        ])
      )
    ) as T[];
  }

  const pages = (query: Record<string, unknown> = {}, params = day) =>
    run<Record<string, unknown>>(buildPagesQuery(params, pagesQuerySchema.parse(query), 1));

  it("keys rows by path with entries, exits, entry bounce and time on page without exit views", async () => {
    const rows = await pages();
    expect(rows.map(row => row.key)).toEqual(["/docs/script", "/", "/pricing", "/blog/a", "/docs", "/docs/api"]);

    const byKey = Object.fromEntries(rows.map(row => [row.key, row]));
    expect(byKey["/docs/script"]).toMatchObject({
      kind: "page",
      title: "Tracking script",
      section: "/docs",
      pageviews: 3,
      sessions: 2,
      entries: 1,
      exits: 1,
      bounced_entries: 0,
      // 60s in s1 and 20s in s3; s3's closing view is its exit and has no time on page.
      time_on_page_seconds: 40,
      bounce_rate: 0,
      total_count: 6,
    });
    expect(byKey["/pricing"]).toMatchObject({
      pageviews: 2,
      sessions: 2,
      entries: 1,
      exits: 2,
      bounced_entries: 1,
      time_on_page_seconds: null,
      bounce_rate: 100,
    });
    expect(byKey["/blog/a"]).toMatchObject({ time_on_page_seconds: 1800, entries: 1, exits: 0 });
    expect(byKey["/docs"]).toMatchObject({ entries: 0, exits: 0, bounce_rate: null, time_on_page_seconds: 60 });
    expect(byKey["/docs/api"]).toMatchObject({ title: "", time_on_page_seconds: 30 });
  });

  it("rolls pages up into sections and lists a one-page section as that page", async () => {
    const rows = await pages({ group: "section" });
    expect(rows.map(row => [row.kind, row.key, row.pages])).toEqual([
      ["section", "/docs", 3],
      ["page", "/", 1],
      ["page", "/pricing", 1],
      ["page", "/blog/a", 1],
    ]);
    expect(rows[0]).toMatchObject({
      title: "",
      pageviews: 5,
      // Distinct sessions across the section, not the sum of its pages' sessions.
      sessions: 2,
      entries: 1,
      exits: 1,
      time_on_page_seconds: 42.5,
      total_count: 4,
    });
  });

  it("lists a section's pages with the same figures as the full list", async () => {
    const all = await pages();
    const children = await pages({ section: "/docs" });
    expect(children.map(row => row.key)).toEqual(["/docs/script", "/docs", "/docs/api"]);
    for (const child of children) {
      const { total_count: _, ...figures } = child;
      expect(all.find(row => row.key === child.key)).toMatchObject(figures);
    }
  });

  it("sorts, filters to entry or exit pages, searches and paginates", async () => {
    expect((await pages({ mode: "entry", sort: "entries" })).map(row => row.key)).toEqual([
      "/",
      "/blog/a",
      "/docs/script",
      "/pricing",
    ]);
    expect((await pages({ mode: "exit", sort: "exits" })).map(row => row.key)).toEqual([
      "/pricing",
      "/",
      "/docs/script",
    ]);
    expect((await pages({ sort: "time_on_page", order: "asc" })).map(row => row.key)).toEqual([
      "/",
      "/docs/api",
      "/docs/script",
      "/docs",
      "/blog/a",
      // No time on page sorts last in either direction.
      "/pricing",
    ]);
    expect((await pages({ search: "TRACKING" })).map(row => row.key)).toEqual(["/docs/script"]);
    expect((await pages({ search: "pric" })).map(row => row.key)).toEqual(["/pricing"]);
    const second = await pages({ limit: 2, page: 2 });
    expect(second.map(row => row.key)).toEqual(["/pricing", "/blog/a"]);
    expect(second[0].total_count).toBe(6);
  });

  it("applies filters to whole sessions", async () => {
    const rows = await pages({}, { ...day, filters: pathnameFilter });
    expect(rows.map(row => [row.key, row.pageviews])).toEqual([
      ["/pricing", 2],
      ["/", 1],
      ["/docs", 1],
      ["/docs/script", 1],
    ]);
  });

  it("summarises the period", async () => {
    const [summary] = await run<Record<string, unknown>>(buildPagesSummaryQuery(day, 1));
    expect(summary).toMatchObject({
      pageviews: 10,
      sessions: 4,
      pages: 6,
      bounced_sessions: 1,
      bounce_rate: 25,
      views_per_session: 2.5,
    });
    expect(summary.time_on_page_seconds).toBeCloseTo(2000 / 6, 5);

    const sections = await run<Record<string, unknown>>(buildSectionViewsQuery(day, 1));
    expect(sections.map(row => [row.section, row.pageviews, row.pages])).toEqual([
      ["/docs", 5, 3],
      ["/", 2, 1],
      ["/pricing", 2, 1],
      ["/blog", 1, 1],
    ]);
    expect(sections[0].total_count).toBe(4);
  });

  it("returns one zero-filled series per requested path and section", async () => {
    const query = trendsQuerySchema.parse({
      bucket: "hour",
      paths: JSON.stringify(["/pricing", "/nowhere"]),
      sections: JSON.stringify(["/docs"]),
    });
    const rows = await run<{ key: string; time: string; pageviews: number }>(buildPageTrendsQuery(day, query, 1));
    const trends = groupTrendRows(rows);

    expect(trends.map(trend => [trend.kind, trend.key, trend.pageviews])).toEqual([
      ["page", "/pricing", 2],
      ["section", "/docs", 5],
    ]);
    for (const trend of trends) {
      expect(trend.series).toHaveLength(24);
      expect(trend.series[0].time).toBe("2026-09-10 00:00:00");
    }
    const pricing = trends[0].series.filter(point => point.pageviews > 0);
    expect(pricing).toEqual([
      { time: "2026-09-10 09:00:00", pageviews: 1 },
      { time: "2026-09-10 10:00:00", pageviews: 1 },
    ]);
  });
});
