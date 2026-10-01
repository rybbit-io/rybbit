import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfig = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/siteConfig.js", () => ({ siteConfig: { getConfig } }));

import { resolveBotSource } from "./botSource.js";
import { buildBotAiPagesQuery } from "./getBotAiPages.js";
import { buildBotDimensionQuery } from "./getBotDimension.js";
import { buildBotOverviewQuery } from "./getBotOverview.js";
import { buildBotTimeSeriesQuery } from "./getBotTimeSeries.js";

const baseQuery = { start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" } as any;
const countryFilter = JSON.stringify([{ parameter: "country", type: "equals", value: ["US"] }]);

describe("resolveBotSource", () => {
  beforeEach(() => getConfig.mockReset());

  it("reads enforced detections when blocking is on", async () => {
    getConfig.mockResolvedValue({ blockBots: true });
    await expect(resolveBotSource("12")).resolves.toEqual({ blocking: true, table: "bot_events" });
    expect(getConfig).toHaveBeenCalledWith(12);
  });

  it("reads observations when blocking is off", async () => {
    getConfig.mockResolvedValue({ blockBots: false });
    await expect(resolveBotSource(12)).resolves.toEqual({ blocking: false, table: "bot_observations" });
  });

  it("keeps the historical table when the site configuration cannot be read", async () => {
    getConfig.mockResolvedValue(undefined);
    await expect(resolveBotSource(12)).resolves.toEqual({ blocking: true, table: "bot_events" });
  });
});

describe("buildBotOverviewQuery", () => {
  it("defaults to the enforced table and adds it to events for the total", () => {
    const sql = buildBotOverviewQuery(baseQuery);

    expect(sql).toContain("FROM bot_events");
    expect(sql).not.toContain("bot_observations");
    expect(sql).toContain("all_bot_requests + event_requests AS total_events");
  });

  it("does not count observed requests twice: events already holds them", () => {
    const sql = buildBotOverviewQuery(baseQuery, "bot_observations");

    expect(sql).toContain("FROM bot_observations");
    expect(sql).not.toContain("FROM bot_events");
    expect(sql).toContain("event_requests AS total_events");
    expect(sql).not.toContain("all_bot_requests + event_requests");
  });

  it("returns the named-bot count and the purpose splits the stat band shows", () => {
    const sql = buildBotOverviewQuery(baseQuery);

    expect(sql).toContain("uniqExactIf(bot_name, bot_name != '') AS named_bots");
    expect(sql).toContain("countIf(bot_name != '') AS named_requests");
    expect(sql).toContain("countIf(bot_purpose = 'ai_training') AS ai_training_requests");
    expect(sql).toContain("countIf(bot_purpose = 'ai_search') AS ai_search_requests");
  });

  it("counts visits sent back as sessions whose first attributed channel is AI", () => {
    const sql = buildBotOverviewQuery(baseQuery);

    expect(sql).toContain("uniqExact(session_id) AS sessions");
    expect(sql).toContain("count() AS ai_sessions");
    expect(sql).toContain("WHERE session_channel = 'AI'");
    expect(sql).toContain("AND channel = 'AI'");
    // The old form counted every event row of an AI-referred visit.
    expect(sql).not.toContain("countIf(channel = 'AI')");
  });

  it("keeps AI sessions that have an event matching the filter", () => {
    const sql = buildBotOverviewQuery({ ...baseQuery, filters: countryFilter });

    expect(sql).toContain("uniqExact(session_id) AS ai_sessions");
    expect(sql).toMatch(/country = 'US'\s+AND timestamp >=[\s\S]+AND session_id IN \(/);
  });

  it("bounds every table read by the time window", () => {
    // bot_stats, all_bot_stats, event_stats and the two nested AI-session lookups.
    expect(buildBotOverviewQuery(baseQuery).match(/toStartOfDay\(toDateTime\('2024-01-01'/g)).toHaveLength(5);
    // A filter adds the pass that matches sessions to it.
    expect(
      buildBotOverviewQuery({ ...baseQuery, filters: countryFilter }).match(/toStartOfDay\(toDateTime\('2024-01-01'/g)
    ).toHaveLength(6);
  });

  it("applies the layer to the bot counts only", () => {
    const sql = buildBotOverviewQuery({ ...baseQuery, layer: "bot_asn" });
    expect(sql.match(/AND detected_bot_asn/g)).toHaveLength(1);
  });

  it("applies filters to bots and to events", () => {
    const sql = buildBotOverviewQuery({ ...baseQuery, filters: countryFilter });
    expect(sql.match(/country = 'US'/g)).toHaveLength(4);
  });
});

describe("buildBotTimeSeriesQuery", () => {
  it("returns every purpose split on each bucket", () => {
    const sql = buildBotTimeSeriesQuery({ ...baseQuery, bucket: "day" });

    expect(sql).toContain("count() AS bot_requests");
    expect(sql).toContain("countIf(bot_purpose = 'ai_agent') AS ai_agent_requests");
    expect(sql).toContain("countIf(bot_purpose IN ('ai_training', 'ai_search')) AS ai_crawler_requests");
    expect(sql).toContain("countIf(bot_purpose = 'ai_training') AS ai_training_requests");
    expect(sql).toContain("countIf(bot_purpose = 'ai_search') AS ai_search_requests");
    expect(sql).toContain("countIf(bot_purpose = 'search') AS search_requests");
    expect(sql).toContain("countIf(bot_purpose IN ('scripted', 'headless')) AS scripted_requests");
    expect(sql).toContain("countIf(bot_purpose IN ('', 'unknown')) AS unclassified_requests");
  });

  it("fills empty buckets and follows the source table", () => {
    const sql = buildBotTimeSeriesQuery({ ...baseQuery, bucket: "day", purpose: "ai" }, "bot_observations");

    expect(sql).toContain("FROM bot_observations");
    expect(sql).toContain("WITH FILL");
    expect(sql).toContain("AND bot_purpose IN ('ai_training', 'ai_search', 'ai_agent')");
  });
});

describe("buildBotDimensionQuery", () => {
  it("follows the source table for both the page and the count", () => {
    const query = { ...baseQuery, dimension: "bot_name" };

    expect(buildBotDimensionQuery(query)).toContain("FROM bot_events");
    expect(buildBotDimensionQuery(query, false, "bot_observations")).toContain("FROM bot_observations");
    expect(buildBotDimensionQuery(query, true, "bot_observations")).toContain("FROM bot_observations");
  });
});

describe("buildBotAiPagesQuery", () => {
  it("ranks pages by AI reads and reports the agent share", () => {
    const sql = buildBotAiPagesQuery(baseQuery);

    expect(sql).toContain("count() AS reads");
    expect(sql).toContain("countIf(bot_purpose = 'ai_agent') AS agent_reads");
    expect(sql).toContain("AND bot_purpose IN ('ai_training', 'ai_search', 'ai_agent')");
    expect(sql).toContain("ORDER BY reads DESC, pathname ASC");
    expect(sql).not.toContain("HAVING agent_reads > 0");
  });

  it("keeps and ranks only pages agents opened when asked", () => {
    const sql = buildBotAiPagesQuery({ ...baseQuery, purpose: "ai_agent" });

    expect(sql).toContain("HAVING agent_reads > 0");
    expect(sql).toContain("ORDER BY agent_reads DESC, reads DESC, pathname ASC");
  });

  it("looks up human views only for the pages on this page of results", () => {
    const sql = buildBotAiPagesQuery(baseQuery);

    expect(sql).toContain("AND type = 'pageview'");
    expect(sql).toContain("AND pathname IN (SELECT pathname FROM ai_pages)");
  });

  it("counts landed visits by the entry page of AI-referred sessions", () => {
    const sql = buildBotAiPagesQuery(baseQuery);

    expect(sql).toContain("argMinIf(pathname, timestamp_ms, type = 'pageview') AS entry_pathname");
    expect(sql).toContain("WHERE session_channel = 'AI'");
    expect(sql).toContain("AND channel = 'AI'");
  });

  it("defaults to 50 rows and caps the page size", () => {
    expect(buildBotAiPagesQuery(baseQuery)).toMatch(/LIMIT 50\s+OFFSET 0/);
    expect(buildBotAiPagesQuery({ ...baseQuery, limit: "20", page: "3" })).toMatch(/LIMIT 20\s+OFFSET 40/);
    expect(() => buildBotAiPagesQuery({ ...baseQuery, limit: "5000" })).toThrow();
    expect(() => buildBotAiPagesQuery({ ...baseQuery, limit: "10; DROP TABLE events" })).toThrow();
  });

  it("rejects a purpose outside the AI family", () => {
    expect(() => buildBotAiPagesQuery({ ...baseQuery, purpose: "seo" as any })).toThrow();
  });

  it("counts the pages without paging or joining", () => {
    const sql = buildBotAiPagesQuery(baseQuery, true);

    expect(sql).toContain("SELECT count() AS totalCount");
    expect(sql).not.toContain("LIMIT");
    expect(sql).not.toContain("FROM events");
  });

  it("follows the source table and applies filters to every half", () => {
    const sql = buildBotAiPagesQuery({ ...baseQuery, filters: countryFilter }, false, "bot_observations");

    expect(sql).toContain("FROM bot_observations");
    expect(sql).not.toContain("FROM bot_events");
    // AI pages, human views, and the sessions that landed.
    expect(sql.match(/country = 'US'/g)).toHaveLength(3);
  });
});
