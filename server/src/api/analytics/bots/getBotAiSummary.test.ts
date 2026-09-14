import { describe, expect, it } from "vitest";
import { buildBotAiSummaryQuery } from "./getBotAiSummary.js";

const baseQuery = { start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" } as any;

describe("buildBotAiSummaryQuery", () => {
  it("counts crawls per operator, split by purpose", () => {
    const sql = buildBotAiSummaryQuery(baseQuery);

    expect(sql).toContain("bot_operator AS operator");
    expect(sql).toContain("countIf(bot_purpose = 'ai_training') AS training_crawls");
    expect(sql).toContain("countIf(bot_purpose = 'ai_search') AS search_crawls");
    expect(sql).toContain("countIf(bot_purpose = 'ai_agent') AS agent_requests");
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
    expect(sql).toContain("domainWithoutWWW(referrer)");
    expect(sql).toContain("AND channel = 'AI'");
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
});
