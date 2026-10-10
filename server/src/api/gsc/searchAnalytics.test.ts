import { describe, expect, it } from "vitest";
import {
  buildSearchAnalyticsRequest,
  describeUpstreamError,
  GSCQueryError,
  mapSearchAnalyticsRows,
} from "./searchAnalytics.js";

const range = { start_date: "2026-08-01", end_date: "2026-08-31" };

describe("buildSearchAnalyticsRequest", () => {
  it("keeps the dashboard's single-dimension request unchanged", () => {
    const request = buildSearchAnalyticsRequest({ ...range, dimension: "query", time_zone: "America/New_York" });
    expect(request.legacy).toBe(true);
    expect(request.dimensions).toEqual(["query"]);
    expect(request.body).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      dimensions: ["query"],
      rowLimit: 1000,
    });
  });

  it("accepts up to three comma-separated dimensions, trimmed and deduplicated", () => {
    const request = buildSearchAnalyticsRequest({ ...range, dimensions: "date, query,query" });
    expect(request.legacy).toBe(false);
    expect(request.dimensions).toEqual(["date", "query"]);
  });

  it("prefers dimensions over the legacy dimension param", () => {
    const request = buildSearchAnalyticsRequest({ ...range, dimension: "page", dimensions: "query" });
    expect(request.legacy).toBe(false);
    expect(request.dimensions).toEqual(["query"]);
  });

  it("rejects unknown or too many dimensions", () => {
    expect(() => buildSearchAnalyticsRequest({ ...range, dimensions: "query,keyword" })).toThrow(/Unknown dimension/);
    expect(() => buildSearchAnalyticsRequest({ ...range, dimensions: "query,page,country,device" })).toThrow(/1 to 3/);
    expect(() => buildSearchAnalyticsRequest({ ...range, dimensions: " , " })).toThrow(/1 to 3/);
  });

  it("requires a dimension and valid, ordered dates", () => {
    expect(() => buildSearchAnalyticsRequest(range)).toThrow("Missing dimension parameter");
    expect(() => buildSearchAnalyticsRequest({ end_date: "2026-08-31", dimension: "query" })).toThrow(
      /Missing start_date/
    );
    expect(() => buildSearchAnalyticsRequest({ ...range, start_date: "08/01/2026", dimension: "query" })).toThrow(
      /YYYY-MM-DD/
    );
    expect(() =>
      buildSearchAnalyticsRequest({ start_date: "2026-09-01", end_date: "2026-08-01", dimension: "query" })
    ).toThrow("start_date must be on or before end_date");
  });

  it("maps paging, search type, and data state onto the Search Console body", () => {
    const request = buildSearchAnalyticsRequest({
      ...range,
      dimensions: "page",
      row_limit: "500",
      start_row: "500",
      search_type: "image",
      data_state: "all",
    });
    expect(request.body).toMatchObject({ rowLimit: 500, startRow: 500, type: "image", dataState: "all" });
  });

  it("rejects out-of-range row limits and unknown search types", () => {
    expect(() => buildSearchAnalyticsRequest({ ...range, dimensions: "query", row_limit: "25001" })).toThrow(
      GSCQueryError
    );
    expect(() => buildSearchAnalyticsRequest({ ...range, dimensions: "query", search_type: "shopping" })).toThrow(
      GSCQueryError
    );
  });

  it("builds an AND filter group and normalizes country and device values", () => {
    const filters = [
      { dimension: "page", operator: "contains", expression: "/pricing" },
      { dimension: "country", expression: "US" },
      { dimension: "device", operator: "notEquals", expression: "mobile" },
    ];
    const request = buildSearchAnalyticsRequest({ ...range, dimensions: "query", filters: JSON.stringify(filters) });
    expect(request.body.dimensionFilterGroups).toEqual([
      {
        groupType: "and",
        filters: [
          { dimension: "page", operator: "contains", expression: "/pricing" },
          { dimension: "country", operator: "equals", expression: "usa" },
          { dimension: "device", operator: "notEquals", expression: "MOBILE" },
        ],
      },
    ]);
  });

  it("rejects malformed filters with a fixable message", () => {
    expect(() => buildSearchAnalyticsRequest({ ...range, dimensions: "query", filters: "page=/pricing" })).toThrow(
      /JSON array/
    );
    expect(() =>
      buildSearchAnalyticsRequest({
        ...range,
        dimensions: "query",
        filters: JSON.stringify([{ dimension: "date", expression: "2026-08-01" }]),
      })
    ).toThrow(/Invalid filters/);
    const tooMany = Array.from({ length: 11 }, () => ({ dimension: "query", expression: "x" }));
    expect(() =>
      buildSearchAnalyticsRequest({ ...range, dimensions: "query", filters: JSON.stringify(tooMany) })
    ).toThrow(/Invalid filters/);
  });
});

describe("mapSearchAnalyticsRows", () => {
  const metrics = { clicks: 3, impressions: 40, ctr: 0.075, position: 4.2 };

  it("returns { name } rows for legacy requests, converting countries to alpha-2", () => {
    const rows = mapSearchAnalyticsRows([{ keys: ["usa"], ...metrics }], { dimensions: ["country"], legacy: true });
    expect(rows).toEqual([{ name: "US", ...metrics }]);
  });

  it("names each key after its dimension for dimensions requests", () => {
    const rows = mapSearchAnalyticsRows([{ keys: ["2026-08-01", "rybbit", "deu"], ...metrics }], {
      dimensions: ["date", "query", "country"],
      legacy: false,
    });
    expect(rows).toEqual([{ date: "2026-08-01", query: "rybbit", country: "DE", ...metrics }]);
  });

  it("treats a missing rows array as no data", () => {
    expect(mapSearchAnalyticsRows(undefined, { dimensions: ["query"], legacy: true })).toEqual([]);
  });
});

describe("describeUpstreamError", () => {
  it("passes Search Console's reason through on 400", () => {
    const body = JSON.stringify({ error: { code: 400, message: "Invalid dimension for discover" } });
    expect(describeUpstreamError(400, body)).toEqual({
      status: 400,
      error: "Search Console rejected the query: Invalid dimension for discover",
    });
  });

  it("never surfaces Google's 401/403 as the caller's own auth failure", () => {
    expect(describeUpstreamError(403, "{}").status).toBe(502);
    expect(describeUpstreamError(401, "not json").status).toBe(502);
    expect(describeUpstreamError(403, "{}").error).toMatch(/Reconnect Search Console/);
  });

  it("keeps quota errors retryable and maps the rest to 502", () => {
    expect(describeUpstreamError(429, "").status).toBe(429);
    expect(describeUpstreamError(500, "").status).toBe(502);
  });
});
