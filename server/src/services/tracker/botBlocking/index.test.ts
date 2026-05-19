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

    expect(result).toEqual({
      blocked: true,
      message: "Event not tracked - bot detected using cloudflare bot score",
    });
  });
});
