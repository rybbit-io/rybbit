import { describe, expect, it } from "vitest";
import { FastifyRequest } from "fastify";
import { detectCloudflareBot, getCloudflareBotScore } from "./headerHeuristics.js";

function requestWithHeaders(headers: Record<string, string | string[]>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

describe("Cloudflare bot score detection", () => {
  it("reads cf-bot-score when Cloudflare forwards it to origin", () => {
    const request = requestWithHeaders({ "cf-bot-score": "12" });

    expect(getCloudflareBotScore(request)).toBe(12);
    expect(detectCloudflareBot(request)).toEqual({
      isBot: true,
      score: 12,
      reason: "cf_bot_score:12",
    });
  });

  it("supports Cloudflare's documented x-bot-score transform header", () => {
    const request = requestWithHeaders({ "x-bot-score": "29" });

    expect(detectCloudflareBot(request).isBot).toBe(true);
  });

  it("does not block likely-human or not-computed Cloudflare scores", () => {
    expect(detectCloudflareBot(requestWithHeaders({ "cf-bot-score": "30" }))).toMatchObject({
      isBot: false,
      score: 30,
    });
    expect(detectCloudflareBot(requestWithHeaders({ "cf-bot-score": "0" }))).toEqual({
      isBot: false,
      score: 0,
      reason: "cf_bot_score_not_computed",
    });
  });

  it("ignores malformed scores", () => {
    expect(getCloudflareBotScore(requestWithHeaders({ "cf-bot-score": "bad" }))).toBeNull();
    expect(getCloudflareBotScore(requestWithHeaders({ "cf-bot-score": "12abc" }))).toBeNull();
    expect(getCloudflareBotScore(requestWithHeaders({ "cf-bot-score": "101" }))).toBeNull();
  });
});
