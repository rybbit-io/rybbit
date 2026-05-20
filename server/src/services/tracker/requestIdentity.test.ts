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
        {}
      )
    ).toEqual({
      ipAddress: "198.51.100.20",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
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
        { trustedServerSideIngestion: true }
      )
    ).toEqual({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
    });
  });

  it("uses verified first-party proxy IP headers without trusting payload overrides", () => {
    const request = requestWithHeaders({
      "cf-connecting-ip": "198.51.100.20",
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-rybbit-client-ip": "203.0.113.10",
    });

    expect(
      resolveTrackingIdentity(
        request,
        {
          ip_address: "192.0.2.10",
          user_agent: "SpoofedBot/1.0",
        },
        { trustedFirstPartyProxy: true }
      )
    ).toEqual({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
    });
  });

  it("does not trust first-party proxy IP headers without trusted proxy mode", () => {
    const request = requestWithHeaders({
      "cf-connecting-ip": "198.51.100.20",
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-rybbit-client-ip": "203.0.113.10",
    });

    expect(resolveTrackingIdentity(request, {}, {})).toEqual({
      ipAddress: "198.51.100.20",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
    });
  });

  it("parses CloudFront viewer addresses with ports for trusted proxy mode", () => {
    const request = requestWithHeaders({
      "cloudfront-viewer-address": "203.0.113.20:443",
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
    });

    expect(resolveTrackingIdentity(request, {}, { trustedFirstPartyProxy: true })).toEqual({
      ipAddress: "203.0.113.20",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
    });
  });

  it("falls back to the normal request IP when trusted proxy headers are invalid", () => {
    const request = requestWithHeaders({
      "cf-connecting-ip": "198.51.100.20",
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-rybbit-client-ip": "not-an-ip",
    });

    expect(resolveTrackingIdentity(request, {}, { trustedFirstPartyProxy: true })).toEqual({
      ipAddress: "198.51.100.20",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
    });
  });
});
