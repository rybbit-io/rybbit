import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { resolveTrackingIdentity } from "./requestIdentity.js";

function requestWithHeaders(headers: Record<string, string | string[]>, ip = "198.51.100.10"): FastifyRequest {
  return { headers, ip } as unknown as FastifyRequest;
}

describe("resolveTrackingIdentity", () => {
  it("ignores public payload IP and user-agent overrides", () => {
    const request = requestWithHeaders({
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-forwarded-for": "198.51.100.20, 10.0.0.1",
    });

    expect(
      resolveTrackingIdentity(
        request,
        {
          ip_address: "203.0.113.10",
          user_agent: "SpoofedBot/1.0",
        },
        false
      )
    ).toEqual({
      ipAddress: "198.51.100.20",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
      // Exclusion candidates still include everything the request presented.
      candidateIps: ["198.51.100.20", "10.0.0.1", "198.51.100.10"],
    });
  });

  it("allows payload IP and user-agent overrides for trusted server-side ingestion", () => {
    const request = requestWithHeaders({
      "user-agent": "ServerSDK/1.0",
      "x-forwarded-for": "198.51.100.20",
    });

    expect(
      resolveTrackingIdentity(
        request,
        {
          ip_address: "203.0.113.10",
          user_agent: "Mozilla/5.0 Chrome/120 Safari/537.36",
        },
        true
      )
    ).toEqual({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
      candidateIps: ["203.0.113.10", "198.51.100.20", "198.51.100.10"],
    });
  });
});
