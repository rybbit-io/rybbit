import { describe, expect, it } from "vitest";
import { FastifyRequest } from "fastify";
import { detectBot } from "./headerHeuristics.js";

function requestWithHeaders(headers: Record<string, string | string[]>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

const browserUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("header heuristic bot detection", () => {
  it("detects scripting framework user agents", () => {
    const result = detectBot(requestWithHeaders({}), "python-requests/2.31.0");

    expect(result).toEqual({
      isBot: true,
      score: 5,
      reason: "bot_framework:python-requests",
    });
  });

  it("scores missing browser headers", () => {
    const result = detectBot(requestWithHeaders({}), browserUserAgent);

    expect(result).toMatchObject({
      isBot: true,
      score: 9,
    });
    expect(result.reason).toContain("missing_accept_language");
    expect(result.reason).toContain("missing_accept");
    expect(result.reason).toContain("missing_accept_encoding");
    expect(result.reason).toContain("missing_sec_fetch_site");
  });

  it("does not score complete browser fetch headers", () => {
    const request = requestWithHeaders({
      accept: "*/*",
      "accept-encoding": "gzip, br",
      "accept-language": "en-US,en;q=0.9",
      "sec-fetch-site": "cross-site",
    });

    expect(detectBot(request, browserUserAgent)).toEqual({
      isBot: false,
      score: 0,
      reason: undefined,
    });
  });
});
