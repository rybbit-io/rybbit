import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import type { BotAiSummaryRow, BotTimeSeriesPoint, Goal } from "../../../api/analytics/endpoints";
import {
  aiPurposeCounts,
  alignTrend,
  botFamilyCounts,
  buildOperatorRows,
  filterOperatorRows,
  formatCompact,
  formatCount,
  formatRatio,
  readsPerVisit,
  resolveSignupGoal,
  share,
  sortOperatorRows,
  startedBuckets,
  unnamedGrowth,
} from "./botsData";

const point = (overrides: Partial<BotTimeSeriesPoint> = {}): BotTimeSeriesPoint => ({
  time: "2026-09-01 00:00:00",
  bot_requests: 0,
  ai_agent_requests: 0,
  ai_crawler_requests: 0,
  ai_training_requests: 0,
  ai_search_requests: 0,
  search_requests: 0,
  scripted_requests: 0,
  unclassified_requests: 0,
  ...overrides,
});

const operator = (overrides: Partial<BotAiSummaryRow> = {}): BotAiSummaryRow => ({
  operator: "OpenAI",
  crawls: 0,
  training_crawls: 0,
  search_crawls: 0,
  agent_requests: 0,
  pages: 0,
  referrals: 0,
  crawls_per_referral: 0,
  referrer_domains: [],
  bots: [],
  ...overrides,
});

const goal = (overrides: Partial<Goal>): Goal => ({
  goalId: 1,
  name: null,
  goalType: "path",
  config: {},
  createdAt: "2026-01-01",
  total_conversions: 0,
  total_sessions: 0,
  conversion_rate: 0,
  ...overrides,
});

describe("aiPurposeCounts", () => {
  it("reads the three AI purposes off a bucket", () => {
    expect(aiPurposeCounts(point({ ai_training_requests: 7, ai_search_requests: 2, ai_agent_requests: 3 }))).toEqual({
      training: 7,
      search: 2,
      agent: 3,
    });
  });
});

describe("botFamilyCounts", () => {
  it("splits a bucket into families that add up to its total", () => {
    const families = botFamilyCounts(
      point({
        bot_requests: 100,
        ai_agent_requests: 10,
        ai_crawler_requests: 30,
        search_requests: 20,
        scripted_requests: 15,
        unclassified_requests: 5,
      })
    );

    expect(families).toEqual({ ai: 40, search: 20, scripted: 15, unclassified: 5, tools: 20 });
    expect(Object.values(families).reduce((total, value) => total + value, 0)).toBe(100);
  });

  it("never reports a negative remainder", () => {
    expect(botFamilyCounts(point({ bot_requests: 3, search_requests: 5 })).tools).toBe(0);
  });
});

describe("startedBuckets", () => {
  it("drops buckets that have not started yet", () => {
    const now = DateTime.fromISO("2026-09-02T12:00:00", { zone: "America/Los_Angeles" });
    const points = [
      point({ time: "2026-09-01 00:00:00" }),
      point({ time: "2026-09-02 00:00:00" }),
      point({ time: "2026-09-03 00:00:00" }),
    ];

    expect(startedBuckets(points, "America/Los_Angeles", now).map(p => p.time)).toEqual([
      "2026-09-01 00:00:00",
      "2026-09-02 00:00:00",
    ]);
    expect(startedBuckets(undefined, "UTC", now)).toEqual([]);
  });
});

describe("alignTrend", () => {
  it("lays a sparse trend onto the chart's buckets", () => {
    const times = ["2026-09-01 00:00:00", "2026-09-02 00:00:00", "2026-09-03 00:00:00"];
    expect(alignTrend([["2026-09-02 00:00:00", 4]], times)).toEqual([0, 4, 0]);
    expect(alignTrend(undefined, times)).toEqual([0, 0, 0]);
  });
});

describe("readsPerVisit", () => {
  it("is the reads for each visit sent back", () => {
    expect(readsPerVisit(19580, 1720)).toBeCloseTo(11.38, 2);
  });

  it("has no rate without both halves", () => {
    expect(readsPerVisit(4310, 0)).toBeNull();
    expect(readsPerVisit(0, 96)).toBeNull();
  });
});

describe("formatRatio", () => {
  it("keeps one decimal until the number is large", () => {
    expect(formatRatio(11.38, "en-US")).toBe("11.4");
    expect(formatRatio(336.7, "en-US")).toBe("337");
    expect(formatRatio(1234.5, "en-US")).toBe("1,235");
  });
});

describe("buildOperatorRows", () => {
  const times = ["2026-09-01 00:00:00", "2026-09-02 00:00:00"];
  const current = [
    operator({
      operator: "OpenAI",
      crawls: 30,
      training_crawls: 20,
      agent_requests: 10,
      pages: 12,
      referrals: 6,
      referrer_domains: ["chatgpt.com", "chat.openai.com"],
      bots: [
        { name: "GPTBot", purpose: "ai_training", reads: 20, pages: 9, trend: [["2026-09-01 00:00:00", 20]] },
        { name: "ChatGPT-User", purpose: "ai_agent", reads: 10, pages: 5, trend: [["2026-09-02 00:00:00", 10]] },
      ],
    }),
    operator({ operator: "Microsoft", referrals: 4, referrer_domains: ["copilot.microsoft.com"] }),
  ];

  it("joins the two periods and sums the bots' trends", () => {
    const previous = [
      operator({
        operator: "OpenAI",
        crawls: 20,
        referrals: 3,
        bots: [{ name: "GPTBot", purpose: "ai_training", reads: 20, pages: 8 }],
      }),
    ];
    const [openai, microsoft] = buildOperatorRows(current, previous, times);

    expect(openai).toMatchObject({
      reads: 30,
      previousReads: 20,
      training: 20,
      agent: 10,
      pages: 12,
      visits: 6,
      previousVisits: 3,
      readsPerVisit: 5,
      referrerDomains: ["chatgpt.com", "chat.openai.com"],
      trend: [20, 10],
    });
    expect(openai.bots.map(bot => [bot.name, bot.previousReads, bot.trend])).toEqual([
      ["GPTBot", 20, [20, 0]],
      // New this period: a previous value of zero, not a missing one.
      ["ChatGPT-User", 0, [0, 10]],
    ]);
    // Refers but does not crawl: no rate, and nothing before.
    expect(microsoft).toMatchObject({ reads: 0, previousReads: 0, visits: 4, readsPerVisit: null, trend: [0, 0] });
  });

  it("leaves the previous figures null when there is no comparison period", () => {
    const [openai] = buildOperatorRows(current, undefined, times);

    expect(openai.previousReads).toBeNull();
    expect(openai.previousVisits).toBeNull();
    expect(openai.bots.every(bot => bot.previousReads === null)).toBe(true);
  });

  it("handles a response that has not arrived", () => {
    expect(buildOperatorRows(undefined, undefined, times)).toEqual([]);
  });
});

describe("sortOperatorRows", () => {
  const rows = buildOperatorRows(
    [
      operator({ operator: "OpenAI", crawls: 30, referrals: 6, pages: 5 }),
      operator({ operator: "ByteDance", crawls: 50, referrals: 0, pages: 9 }),
      operator({ operator: "Anthropic", crawls: 10, referrals: 5, pages: 7 }),
    ],
    [
      operator({ operator: "OpenAI", crawls: 15 }),
      operator({ operator: "ByteDance", crawls: 100 }),
      operator({ operator: "Anthropic", crawls: 0 }),
    ],
    []
  );
  const names = (sorted: typeof rows) => sorted.map(row => row.operator);

  it("sorts by a count in either direction", () => {
    expect(names(sortOperatorRows(rows, "reads", true))).toEqual(["ByteDance", "OpenAI", "Anthropic"]);
    expect(names(sortOperatorRows(rows, "reads", false))).toEqual(["Anthropic", "OpenAI", "ByteDance"]);
    expect(names(sortOperatorRows(rows, "operator", false))).toEqual(["Anthropic", "ByteDance", "OpenAI"]);
  });

  it("keeps rows with no value at the bottom in both directions", () => {
    // ByteDance sent nobody back: no rate.
    expect(names(sortOperatorRows(rows, "readsPerVisit", true))).toEqual(["OpenAI", "Anthropic", "ByteDance"]);
    expect(names(sortOperatorRows(rows, "readsPerVisit", false))).toEqual(["Anthropic", "OpenAI", "ByteDance"]);
    // Anthropic had no reads before: no percentage.
    expect(names(sortOperatorRows(rows, "change", true))).toEqual(["OpenAI", "ByteDance", "Anthropic"]);
  });

  it("does not mutate its input", () => {
    const before = names(rows);
    sortOperatorRows(rows, "pages", true);
    expect(names(rows)).toEqual(before);
  });
});

describe("filterOperatorRows", () => {
  const rows = buildOperatorRows(
    [
      operator({ operator: "OpenAI", bots: [{ name: "GPTBot", purpose: "ai_training", reads: 1, pages: 1 }] }),
      operator({ operator: "Anthropic", bots: [{ name: "ClaudeBot", purpose: "ai_training", reads: 1, pages: 1 }] }),
    ],
    undefined,
    []
  );

  it("matches the operator or one of its bots, ignoring case", () => {
    expect(filterOperatorRows(rows, "  open ").map(row => row.operator)).toEqual(["OpenAI"]);
    expect(filterOperatorRows(rows, "claudebot").map(row => row.operator)).toEqual(["Anthropic"]);
    expect(filterOperatorRows(rows, "")).toHaveLength(2);
    expect(filterOperatorRows(rows, "nothing")).toEqual([]);
  });
});

describe("unnamedGrowth", () => {
  it("reports unnamed automation that grew faster than named bots", () => {
    const growth = unnamedGrowth(
      { bot_requests: 132000, named_requests: 105600 },
      { bot_requests: 109800, named_requests: 90900 }
    );

    expect(growth).toMatchObject({ current: 26400, previous: 18900 });
    expect(growth?.change).toBeCloseTo(39.68, 1);
    expect(growth?.namedChange).toBeCloseTo(16.17, 1);
  });

  it("stays silent without a comparison period", () => {
    expect(unnamedGrowth({ bot_requests: 500, named_requests: 100 }, undefined)).toBeNull();
    expect(unnamedGrowth(undefined, { bot_requests: 500, named_requests: 100 })).toBeNull();
  });

  it("stays silent when the baseline is too small for a percentage", () => {
    expect(unnamedGrowth({ bot_requests: 400, named_requests: 0 }, { bot_requests: 99, named_requests: 0 })).toBeNull();
  });

  it("stays silent when unnamed automation shrank or barely moved", () => {
    expect(
      unnamedGrowth({ bot_requests: 900, named_requests: 0 }, { bot_requests: 1000, named_requests: 0 })
    ).toBeNull();
    expect(
      unnamedGrowth({ bot_requests: 1050, named_requests: 0 }, { bot_requests: 1000, named_requests: 0 })
    ).toBeNull();
  });

  it("stays silent when named bots grew at least as fast", () => {
    expect(
      unnamedGrowth({ bot_requests: 3200, named_requests: 2000 }, { bot_requests: 2000, named_requests: 1000 })
    ).toBeNull();
  });
});

describe("resolveSignupGoal", () => {
  it("picks a goal whose name says signup", () => {
    const goals = [goal({ goalId: 4, name: "Checkout" }), goal({ goalId: 7, name: "Sign-up" })];
    expect(resolveSignupGoal(goals)?.goalId).toBe(7);
    expect(resolveSignupGoal([goal({ goalId: 2, name: "Signed up" })])?.goalId).toBe(2);
    expect(resolveSignupGoal([goal({ goalId: 3, name: "Signups (paid)" })])?.goalId).toBe(3);
  });

  it("prefers the oldest match", () => {
    const goals = [goal({ goalId: 9, name: "Signup v2" }), goal({ goalId: 5, name: "Signup" })];
    expect(resolveSignupGoal(goals)?.goalId).toBe(5);
  });

  it("falls back to an event goal on a signup event", () => {
    const goals = [goal({ goalId: 1, name: "New account", goalType: "event", config: { eventName: "sign_up" } })];
    expect(resolveSignupGoal(goals)?.goalId).toBe(1);
  });

  it("resolves nothing when no goal is a signup", () => {
    expect(resolveSignupGoal([goal({ name: "Design updates" }), goal({ name: null })])).toBeNull();
    expect(resolveSignupGoal(undefined)).toBeNull();
    expect(resolveSignupGoal([])).toBeNull();
  });
});

describe("formatCompact and formatCount", () => {
  it("keeps one decimal in compact form", () => {
    expect(formatCompact(27120, "en-US")).toBe("27.1K");
    expect(formatCompact(132000, "en-US")).toBe("132K");
    expect(formatCompact(1_250_000, "en-US")).toBe("1.3M");
  });

  it("prints every digit until the number is too long for a stat cell", () => {
    expect(formatCount(8680, "en-US")).toBe("8,680");
    expect(formatCount(99_999, "en-US")).toBe("99,999");
    expect(formatCount(132_000, "en-US")).toBe("132K");
    expect(formatCount(0, "en-US")).toBe("0");
  });
});

describe("share", () => {
  it("is a percentage of the total, or nothing without one", () => {
    expect(share(27, 100)).toBe(27);
    expect(share(5, 0)).toBeNull();
  });
});
