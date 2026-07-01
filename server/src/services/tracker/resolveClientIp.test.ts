import { describe, it, expect } from "vitest";
import { FastifyRequest } from "fastify";
import { resolveClientIp } from "./resolveClientIp.js";

function requestWithHeaders(headers: Record<string, string | string[]>, ip = "198.51.100.10"): FastifyRequest {
  return { headers, ip } as unknown as FastifyRequest;
}

// Inject a deterministic edge predicate so tests don't depend on the MaxMind DB.
const proxied = () => true;
const direct = () => false;

describe("resolveClientIp", () => {
  it("trusts the forwarded visitor IP when the edge is a datacenter (proxied)", () => {
    // CloudFront case: CF-Connecting-IP is the proxy egress node; the real
    // visitor is in X-Forwarded-For.
    const request = requestWithHeaders({
      "cf-connecting-ip": "13.224.0.1", // CloudFront egress
      "x-forwarded-for": "203.0.113.10, 13.224.0.1", // visitor, then edge
    });

    expect(resolveClientIp(request, proxied)).toBe("203.0.113.10");
  });

  it("prefers X-Real-IP over X-Forwarded-For on the proxied path", () => {
    const request = requestWithHeaders({
      "cf-connecting-ip": "13.224.0.1",
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "192.0.2.10",
    });

    expect(resolveClientIp(request, proxied)).toBe("192.0.2.10");
  });

  it("falls back to the edge IP if a proxy forwarded nothing", () => {
    const request = requestWithHeaders({ "cf-connecting-ip": "13.224.0.1" });
    expect(resolveClientIp(request, proxied)).toBe("13.224.0.1");
  });

  it("trusts the edge IP and ignores spoofable forwarded headers on the direct path", () => {
    // A direct visitor cannot spoof their geo: CF-Connecting-IP wins and the
    // attacker-supplied X-Forwarded-For / X-Real-IP are discarded.
    const request = requestWithHeaders({
      "cf-connecting-ip": "203.0.113.55", // residential visitor
      "x-forwarded-for": "8.8.8.8", // spoofed
      "x-real-ip": "1.1.1.1", // spoofed
    });

    expect(resolveClientIp(request, direct)).toBe("203.0.113.55");
  });

  it("uses forwarded headers when there is no Cloudflare edge (self-hosted)", () => {
    expect(resolveClientIp(requestWithHeaders({ "x-real-ip": "192.0.2.10" }), direct)).toBe("192.0.2.10");
    expect(resolveClientIp(requestWithHeaders({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" }), direct)).toBe(
      "203.0.113.10"
    );
  });

  it("falls back to the socket IP when no usable headers are present", () => {
    expect(resolveClientIp(requestWithHeaders({}), direct)).toBe("198.51.100.10");
  });
});
