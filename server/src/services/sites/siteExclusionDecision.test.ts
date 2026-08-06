import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLocation: vi.fn(),
  lookupAsn: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("../../db/geolocation/geolocation.js", () => ({
  getLocation: mocks.getLocation,
}));

vi.mock("../../db/geolocation/asn.js", () => ({
  lookupAsn: mocks.lookupAsn,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  logger: { warn: mocks.loggerWarn },
}));

import { decideSiteExclusion } from "./siteExclusionDecision.js";

function configuration(overrides: Partial<Parameters<typeof decideSiteExclusion>[0]> = {}) {
  return {
    excludedIPs: [],
    excludedCountries: [],
    excludedPaths: [],
    excludedHostnames: [],
    excludedUserAgents: [],
    excludedASNs: [],
    excludedQueryParams: [],
    ...overrides,
  };
}

const request = {
  ipAddress: "198.51.100.10",
  pathname: "/admin/users",
  hostname: "preview.vercel.app",
  userAgent: "Mozilla/5.0 HeadlessChrome/120",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLocation.mockResolvedValue({});
  mocks.lookupAsn.mockReturnValue(null);
});

describe("decideSiteExclusion", () => {
  it("accepts a request when no exclusion matches without resolving geolocation", async () => {
    await expect(decideSiteExclusion(configuration(), request)).resolves.toEqual({ excluded: false });
    expect(mocks.getLocation).not.toHaveBeenCalled();
  });

  it.each([
    ["single address", "198.51.100.10"],
    ["CIDR", "198.51.100.0/24"],
    ["range", "198.51.100.1-198.51.100.20"],
  ])("matches an excluded IP using a %s rule", async (_description, pattern) => {
    await expect(decideSiteExclusion(configuration({ excludedIPs: [pattern] }), request)).resolves.toMatchObject({
      excluded: true,
      reason: "ip",
      label: "IP",
      value: "198.51.100.10",
    });
  });

  it("matches an excluded IP among the candidates when resolution picked a different one", async () => {
    // The visitor-splitting regression: the resolver lands on a proxy egress
    // IP, but the owner's real IP is still present among forwarded candidates.
    const rules = configuration({ excludedIPs: ["203.0.113.7"] });

    await expect(
      decideSiteExclusion(rules, {
        ...request,
        ipAddress: "172.68.34.28",
        candidateIps: ["172.68.34.28", "203.0.113.7"],
      })
    ).resolves.toMatchObject({ excluded: true, reason: "ip", value: "203.0.113.7" });

    await expect(
      decideSiteExclusion(rules, { ...request, ipAddress: "172.68.34.28", candidateIps: ["198.51.100.1"] })
    ).resolves.toEqual({ excluded: false });
  });

  it("resolves geolocation only when country rules exist", async () => {
    mocks.getLocation.mockResolvedValue({
      "198.51.100.10": { countryIso: "us" },
    });

    await expect(decideSiteExclusion(configuration({ excludedCountries: ["US", "GB"] }), request)).resolves.toEqual({
      excluded: true,
      reason: "country",
      label: "country",
      value: "us",
    });
    expect(mocks.getLocation).toHaveBeenCalledOnce();
    expect(mocks.getLocation).toHaveBeenCalledWith(["198.51.100.10"]);
  });

  it("matches path globs case-insensitively", async () => {
    const rules = configuration({ excludedPaths: ["/admin/*", "/preview"] });

    await expect(decideSiteExclusion(rules, { ...request, pathname: "/ADMIN/users" })).resolves.toMatchObject({
      excluded: true,
      reason: "path",
    });
    await expect(decideSiteExclusion(rules, { ...request, pathname: "/preview" })).resolves.toMatchObject({
      excluded: true,
      reason: "path",
    });
    await expect(decideSiteExclusion(rules, { ...request, pathname: "/admin" })).resolves.toEqual({
      excluded: false,
    });
  });

  it("handles multiple and consecutive wildcards without regex backtracking", async () => {
    const rules = configuration({ excludedPaths: ["/a/*/b/*", "/x**y", "/" + "*a".repeat(30) + "b"] });

    await expect(decideSiteExclusion(rules, { ...request, pathname: "/a/1/b/2" })).resolves.toMatchObject({
      excluded: true,
      reason: "path",
    });
    await expect(decideSiteExclusion(rules, { ...request, pathname: "/a//b/" })).resolves.toMatchObject({
      excluded: true,
      reason: "path",
    });
    await expect(decideSiteExclusion(rules, { ...request, pathname: "/xANYTHINGy" })).resolves.toMatchObject({
      excluded: true,
      reason: "path",
    });
    await expect(decideSiteExclusion(rules, { ...request, pathname: "/" + "a".repeat(2000) })).resolves.toEqual({
      excluded: false,
    });
  });

  it("matches hostname globs", async () => {
    const rules = configuration({ excludedHostnames: ["localhost", "*.vercel.app"] });

    await expect(decideSiteExclusion(rules, request)).resolves.toMatchObject({
      excluded: true,
      reason: "hostname",
    });
    await expect(decideSiteExclusion(rules, { ...request, hostname: "vercel.app" })).resolves.toEqual({
      excluded: false,
    });
  });

  it("matches user-agent substrings case-insensitively and ignores blank rules", async () => {
    const rules = configuration({ excludedUserAgents: ["  ", "headlesschrome"] });

    await expect(decideSiteExclusion(rules, request)).resolves.toMatchObject({
      excluded: true,
      reason: "user_agent",
    });
    await expect(decideSiteExclusion(rules, { ...request, userAgent: "Mozilla/5.0 (real browser)" })).resolves.toEqual({
      excluded: false,
    });
  });

  it("matches an excluded ASN with or without the AS prefix, ignoring invalid rules", async () => {
    mocks.lookupAsn.mockReturnValue({ asn: 13335, organization: "Cloudflare" });
    const expected = { excluded: true, reason: "asn", label: "ASN", value: "AS13335" };

    await expect(decideSiteExclusion(configuration({ excludedASNs: ["AS13335"] }), request)).resolves.toEqual(expected);
    await expect(decideSiteExclusion(configuration({ excludedASNs: ["as13335"] }), request)).resolves.toEqual(expected);
    await expect(decideSiteExclusion(configuration({ excludedASNs: ["13335"] }), request)).resolves.toEqual(expected);
    await expect(decideSiteExclusion(configuration({ excludedASNs: ["bogus", "AS999"] }), request)).resolves.toEqual({
      excluded: false,
    });
  });

  it("matches an excluded ASN on any candidate IP and skips lookups when no ASN rules exist", async () => {
    mocks.lookupAsn.mockImplementation((ip: string) =>
      ip === "203.0.113.7" ? { asn: 16509, organization: "Amazon" } : null
    );

    await expect(
      decideSiteExclusion(configuration({ excludedASNs: ["AS16509"] }), {
        ...request,
        candidateIps: ["203.0.113.7"],
      })
    ).resolves.toMatchObject({ excluded: true, reason: "asn", value: "AS16509" });

    mocks.lookupAsn.mockClear();
    await expect(decideSiteExclusion(configuration(), request)).resolves.toEqual({ excluded: false });
    expect(mocks.lookupAsn).not.toHaveBeenCalled();
  });

  it("matches query params by presence and by value glob, case-insensitively", async () => {
    const withQuery = { ...request, pathname: "/pricing", hostname: "example.com", userAgent: "Mozilla/5.0" };

    await expect(
      decideSiteExclusion(configuration({ excludedQueryParams: ["preview"] }), {
        ...withQuery,
        querystring: "?Preview=true&x=1",
      })
    ).resolves.toEqual({ excluded: true, reason: "query_param", label: "query param", value: "Preview=true" });

    await expect(
      decideSiteExclusion(configuration({ excludedQueryParams: ["utm_source=internal-*"] }), {
        ...withQuery,
        querystring: "utm_source=Internal-QA",
      })
    ).resolves.toMatchObject({ excluded: true, reason: "query_param", value: "utm_source=Internal-QA" });

    await expect(
      decideSiteExclusion(configuration({ excludedQueryParams: ["utm_source=internal", "preview"] }), {
        ...withQuery,
        querystring: "utm_source=external&other=preview",
      })
    ).resolves.toEqual({ excluded: false });

    await expect(
      decideSiteExclusion(configuration({ excludedQueryParams: ["preview"] }), withQuery)
    ).resolves.toEqual({ excluded: false });
  });

  it("returns the first exclusion in the fixed ordering and short-circuits later work", async () => {
    mocks.getLocation.mockResolvedValue({
      "198.51.100.10": { countryIso: "US" },
    });
    const rules = configuration({
      excludedIPs: ["198.51.100.0/24"],
      excludedCountries: ["US"],
      excludedPaths: ["/admin/*"],
      excludedHostnames: ["*.vercel.app"],
      excludedUserAgents: ["HeadlessChrome"],
    });

    await expect(decideSiteExclusion(rules, request)).resolves.toMatchObject({
      excluded: true,
      reason: "ip",
    });
    expect(mocks.getLocation).not.toHaveBeenCalled();
  });

  it("lets country exclusion preempt matching request metadata", async () => {
    mocks.getLocation.mockResolvedValue({
      "198.51.100.10": { countryIso: "US" },
    });
    const rules = configuration({
      excludedCountries: ["US"],
      excludedPaths: ["/admin/*"],
      excludedHostnames: ["*.vercel.app"],
      excludedUserAgents: ["HeadlessChrome"],
    });

    await expect(decideSiteExclusion(rules, request)).resolves.toMatchObject({
      excluded: true,
      reason: "country",
    });
  });

  it("propagates geolocation failures", async () => {
    mocks.getLocation.mockRejectedValue(new Error("geolocation unavailable"));

    await expect(decideSiteExclusion(configuration({ excludedCountries: ["US"] }), request)).rejects.toThrow(
      "geolocation unavailable"
    );
  });
});
