import { describe, expect, it } from "vitest";
import { buildBotAiBotsQuery, buildBotAiSummaryQuery } from "./getBotAiSummary.js";

const baseQuery = { start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" } as any;
const countryFilter = JSON.stringify([{ parameter: "country", type: "equals", value: ["US"] }]);

describe("buildBotAiSummaryQuery", () => {
  it("counts crawls per operator, split by purpose", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);

    expect(sql).toContain("bot_operator AS operator");
    expect(sql).toContain("countIf(bot_purpose = 'ai_training') AS training_crawls");
    expect(sql).toContain("countIf(bot_purpose = 'ai_search') AS search_crawls");
    expect(sql).toContain("countIf(bot_purpose = 'ai_agent') AS agent_requests");
  });

  it("counts the distinct pages an operator read", () => {
    expect(buildBotAiSummaryQuery(baseQuery)).toContain("uniqExact(pathname) AS pages");
  });

  it("excludes non-AI bots and rows written before identity shipped", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);

    // An SEO or monitoring bot has an operator too; only the AI purposes belong
    // on this surface. Pre-identity rows carry '' and would otherwise group
    // into one meaningless bucket.
    expect(sql).toContain("AND bot_operator != ''");
    expect(sql).toContain("AND bot_purpose IN ('ai_training', 'ai_search', 'ai_agent')");
  });

  it("maps AI referrer domains onto the same operator names the bot patterns use", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);

    expect(sql).toContain("'chatgpt.com'");
    expect(sql).toContain("'OpenAI'");
    expect(sql).toContain("domainWithoutWWW(session_referrer)");
    expect(sql).toContain("AND channel = 'AI'");
  });

  it("counts a referral once per session, not once per event row", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);

    // One row per session, attributed by the session's first referrer and its
    // first attributed channel: the rule the Sessions page lists them by.
    expect(sql).toContain("GROUP BY session_id");
    expect(sql).toContain("argMinIf(referrer, timestamp, referrer != '') AS session_referrer");
    expect(sql).toContain("WHERE session_channel = 'AI'");
    // The old form counted every event of an AI-referred visit.
    expect(sql).not.toMatch(/count\(\) AS referrals\s+FROM events/);
  });

  it("only groups sessions that have an AI-channel event", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);
    expect(sql).toMatch(
      /AND session_id IN \(\s+SELECT session_id\s+FROM events\s+WHERE site_id = \{siteId:Int32\}\s+AND channel = 'AI'/
    );
  });

  it("does not treat duckduckgo as an AI referrer", () => {
    // DuckAssistBot crawls, but a duckduckgo.com referral is organic search.
    // Listing it would silently reclassify every DuckDuckGo visit.
    expect(buildBotAiSummaryQuery(baseQuery)).not.toContain("duckduckgo.com");
  });

  it("keeps operators that only crawl and operators that only refer", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);

    expect(sql).toContain("FULL OUTER JOIN referrals ON crawls.operator = referrals.operator");
    expect(sql).toContain("if(crawls.operator != '', crawls.operator, referrals.operator) AS operator");
  });

  it("guards the ratio against a zero denominator", () => {
    expect(buildBotAiSummaryQuery(baseQuery)).toContain("if(referrals.referrals = 0, 0,");
  });

  it("applies the time window to both halves", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);
    expect(sql.match(/toStartOfDay/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("applies filters to both halves, and to sessions by a matching event", () => {
    const sql = buildBotAiSummaryQuery({ ...baseQuery, filters: countryFilter });

    // Once on the crawl half, once in the session lookup.
    expect(sql.match(/country = 'US'/g)).toHaveLength(2);
    expect(sql).toMatch(/WHERE session_channel = 'AI'\s+AND session_id IN \(/);
  });

  it("drops filters the bot tables cannot express instead of emitting unbounded session subqueries", () => {
    const filters = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["signup"] }]);
    const sql = buildBotAiSummaryQuery({ ...baseQuery, filters });

    expect(sql).not.toContain("signup");
    expect(sql).not.toContain("SELECT DISTINCT session_id");
  });

  it("reads observations for a site with blocking off, and is bounded", () => {
    const sql = buildBotAiSummaryQuery(baseQuery, "bot_observations");

    expect(sql).toContain("FROM bot_observations");
    expect(sql).not.toContain("FROM bot_events");
    expect(sql).toContain("LIMIT 200");
  });
});

describe("buildBotAiBotsQuery", () => {
  it("lists each named AI bot with its operator and purpose", () => {
    const sql = buildBotAiBotsQuery(baseQuery);

    expect(sql).toContain("bot_operator AS operator");
    expect(sql).toContain("bot_name AS name");
    expect(sql).toContain("bot_purpose AS purpose");
    expect(sql).toContain("uniqExact(pathname) AS pages");
    expect(sql).toContain("AND bot_purpose IN ('ai_training', 'ai_search', 'ai_agent')");
    expect(sql).toContain("LIMIT 500");
    expect(sql).not.toContain("trend");
  });

  it("adds reads per bucket only when a bucket is asked for", () => {
    const sql = buildBotAiBotsQuery({ ...baseQuery, bucket: "day" });

    expect(sql).toContain("toStartOfDay(toTimeZone(timestamp, 'UTC'))");
    expect(sql).toContain("AS trend");
    // Distinct pages do not add across buckets, so the state is merged.
    expect(sql).toContain("uniqExactState(pathname) AS pages_state");
    expect(sql).toContain("uniqExactMerge(pages_state) AS pages");
    expect(sql).toContain("LIMIT 500");
  });

  it("rejects a bucket it does not know rather than interpolating it", () => {
    expect(() => buildBotAiBotsQuery({ ...baseQuery, bucket: "day); DROP TABLE events" })).toThrow();
  });

  it("follows the source table and the filters", () => {
    const sql = buildBotAiBotsQuery({ ...baseQuery, filters: countryFilter, bucket: "hour" }, "bot_observations");

    expect(sql).toContain("FROM bot_observations");
    expect(sql).toContain("country = 'US'");
  });
});
