import { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { resetAnomalyScorerForTests } from "./anomalyScorer.js";
import { getBotDetectionStats, resetBotDetectionStatsForTests } from "./botDetectionStats.js";
import { checkBotBlocking } from "./index.js";

function requestWithHeaders(headers: Record<string, string | string[]>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

const basePayload = {
  siteId: "site_123",
  ipAddress: "203.0.113.10",
};

const browserHeaders = {
  accept: "*/*",
  "accept-encoding": "gzip, br",
  "accept-language": "en-US,en;q=0.9",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
};

describe("checkBotBlocking", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    resetBotDetectionStatsForTests();
  });

  it("does nothing when bot blocking is disabled", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: false,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("skips bearer-token authenticated requests", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({ authorization: "Bearer token" }),
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("counts requests before bot-blocking bypasses for percentage stats", () => {
    checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: false,
      payload: basePayload,
    });
    checkBotBlocking({
      request: requestWithHeaders({ authorization: "Bearer token" }),
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 0 },
    });

    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 2,
      totalBlockedRequests: 0,
      botRequestPercentage: 0,
      clientBotScoreHistogram: {
        missing: 1,
        score0: 1,
      },
    });
  });

  it("returns the block response message for detected bots", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toMatchObject({
      blocked: true,
      message: "Event not tracked - bot detected using header heuristics",
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["header_heuristics"]);
    expect(result?.detections[0]).not.toHaveProperty("message");
    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 1,
      totalBlockedRequests: 1,
      botRequestPercentage: 100,
      totals: {
        header_heuristics: 1,
      },
      clientBotScoreHistogram: {
        missing: 1,
      },
    });
  });

  it("records client bot score histogram for inspected requests", () => {
    const request = requestWithHeaders(browserHeaders);

    checkBotBlocking({
      request,
      blockBots: true,
      payload: basePayload,
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 0 },
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 1 },
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 2 },
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 3 },
    });

    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 5,
      totalBlockedRequests: 1,
      botRequestPercentage: 20,
      clientBotScoreHistogram: {
        missing: 1,
        score0: 1,
        score1: 1,
        score2: 1,
        score3Plus: 1,
      },
    });
  });

  it("collects every matching bot signal before returning", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      }),
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 3,
        screenWidth: 800,
        screenHeight: 600,
      },
    });

    expect(result).toMatchObject({
      blocked: true,
      message: "Event not tracked - bot detected using ua-pattern",
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual([
      "ua_pattern",
      "header_heuristics",
      "client_signals",
      "desktop_800x600",
    ]);
  });

  it("adds a rate anomaly layer after a request burst", () => {
    const request = requestWithHeaders(browserHeaders);

    let result: ReturnType<typeof checkBotBlocking> = null;
    for (let i = 0; i < 31; i++) {
      result = checkBotBlocking({
        request,
        blockBots: true,
        payload: {
          ...basePayload,
          clientBotScore: 0,
          hostname: "example.com",
          pathname: "/",
        },
      });
    }

    expect(result).toMatchObject({
      blocked: true,
      message: "Event not tracked - bot detected using rate anomaly",
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["rate_anomaly"]);
    expect(result?.detections[0].anomalyReasons?.map(reason => reason.rule)).toContain("tuple_events_10s");
  });
});
