import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { checkBotBlocking } from "./index.js";

function requestWithHeaders(headers: Record<string, string | string[]>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

const basePayload = {
  siteId: "site_123",
  ipAddress: "203.0.113.10",
};

describe("checkBotBlocking", () => {
  it("does nothing when bot blocking is disabled", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({ "cf-bot-score": "1" }),
      blockBots: false,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("skips bearer-token authenticated requests", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({ authorization: "Bearer token", "cf-bot-score": "1" }),
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("returns the block response message for detected bots", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({ "cf-bot-score": "12" }),
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toMatchObject({
      blocked: true,
      message: "Event not tracked - bot detected using cloudflare bot score",
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["cloudflare_bot_score", "header_heuristics"]);
  });

  it("collects every matching bot signal before returning", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({
        "cf-bot-score": "12",
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
      "cloudflare_bot_score",
      "header_heuristics",
      "client_signals",
      "desktop_800x600",
    ]);
  });
});
