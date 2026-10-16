import type { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValidatedTrackingPayload } from "./trackingPayload.js";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  checkApiKey: vi.fn(),
  lookupAsn: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { getConfig: mocks.getConfig },
}));

vi.mock("../../lib/auth-utils.js", () => ({
  checkApiKey: mocks.checkApiKey,
}));

// The memoising factory is the real one, wired to a fake reader — these tests
// exercise the shipped memoisation, not a stand-in for it.
vi.mock("../../db/geolocation/asn.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../db/geolocation/asn.js")>();
  return {
    ...actual,
    lookupAsn: mocks.lookupAsn,
    createAsnLookup: (lookup = mocks.lookupAsn) => actual.createAsnLookup(lookup),
  };
});

import { resolveTrackingRequest } from "./trackingRequest.js";

const site = {
  id: "site_abc",
  siteId: 42,
  type: "web",
  firstPartyProxy: false,
  saltUserIds: false,
};

const mobileSite = { ...site, type: "mobile" };

const SDK_USER_AGENT = "MyApp/1.4.2 (cz.nkshub.myapp; Android 14; SM-G991B) RybbitFlutter/0.2.5";

function request(headers: Record<string, string | string[]>, ip = "198.51.100.10"): FastifyRequest {
  return { headers, ip } as unknown as FastifyRequest;
}

const payload = (overrides: Record<string, unknown> = {}) =>
  ({ type: "pageview", site_id: "site_abc", ...overrides }) as ValidatedTrackingPayload;

describe("resolveTrackingRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue(site);
    mocks.lookupAsn.mockReturnValue(null);
  });

  it("returns null for an unknown Site", async () => {
    mocks.getConfig.mockResolvedValue(undefined);

    expect(await resolveTrackingRequest(request({}), payload())).toBeNull();
  });

  it("reads the Site Configuration once for the whole request", async () => {
    await resolveTrackingRequest(request({}), payload());

    expect(mocks.getConfig).toHaveBeenCalledOnce();
    expect(mocks.getConfig).toHaveBeenCalledWith("site_abc");
  });

  it("ignores public payload IP and user-agent overrides", async () => {
    const resolved = await resolveTrackingRequest(
      request({
        "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
        "x-forwarded-for": "198.51.100.20, 10.0.0.1",
      }),
      payload({ ip_address: "203.0.113.10", user_agent: "SpoofedBot/1.0" })
    );

    expect(resolved).toMatchObject({
      ipAddress: "198.51.100.20",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
      trustedServerSideIngestion: false,
      // Exclusion candidates still include everything the request presented.
      candidateIps: ["198.51.100.20", "10.0.0.1", "198.51.100.10"],
    });
  });

  it("accepts a native SDK's declared user agent on a mobile Site, but not its IP", async () => {
    // The header belongs to the HTTP client library, not to the app: Dart, OkHttp
    // and friends send their own, and a browser will not let the SDK set one at
    // all. Without this the platform, OS version and device model never arrive.
    mocks.getConfig.mockResolvedValue(mobileSite);

    const resolved = await resolveTrackingRequest(
      request({ "user-agent": "Dart/3.9 (dart:io)", "x-forwarded-for": "198.51.100.20" }),
      payload({ ip_address: "203.0.113.10", user_agent: SDK_USER_AGENT })
    );

    expect(resolved).toMatchObject({
      ipAddress: "198.51.100.20",
      userAgent: SDK_USER_AGENT,
      trustedServerSideIngestion: false,
    });
  });

  it("ignores an SDK-shaped user agent on a web Site", async () => {
    // Otherwise a page script could dress up as a phone and take the user agent
    // out of bot detection's hands.
    const resolved = await resolveTrackingRequest(
      request({ "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36" }),
      payload({ user_agent: SDK_USER_AGENT })
    );

    expect(resolved).toMatchObject({ userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36" });
  });

  it("keeps the header on a mobile Site when the payload user agent is not in SDK format", async () => {
    mocks.getConfig.mockResolvedValue(mobileSite);

    const resolved = await resolveTrackingRequest(
      request({ "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36" }),
      payload({ user_agent: "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36" })
    );

    expect(resolved).toMatchObject({ userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36" });
  });

  it("allows payload IP and user-agent overrides for trusted server-side ingestion", async () => {
    mocks.checkApiKey.mockResolvedValue({
      valid: true,
      statements: { ingest: ["write"] },
    });

    const resolved = await resolveTrackingRequest(
      request({
        authorization: "Bearer sk_test",
        "user-agent": "ServerSDK/1.0",
        "x-forwarded-for": "198.51.100.20",
      }),
      payload({ ip_address: "203.0.113.10", user_agent: "Mozilla/5.0 Chrome/120 Safari/537.36" })
    );

    expect(resolved).toMatchObject({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
      trustedServerSideIngestion: true,
      candidateIps: ["203.0.113.10", "198.51.100.20", "198.51.100.10"],
    });
  });

  it("degrades an under-scoped bearer to untrusted client-side traffic", async () => {
    mocks.checkApiKey.mockResolvedValue({
      valid: true,
      statements: { site: ["read"] },
    });

    const resolved = await resolveTrackingRequest(
      request({ authorization: "Bearer sk_test", "user-agent": "ServerSDK/1.0" }),
      payload({ ip_address: "203.0.113.10" })
    );

    expect(resolved).toMatchObject({
      ipAddress: "198.51.100.10",
      trustedServerSideIngestion: false,
    });
  });

  it("carries an ASN resolver that answers each IP once per request", async () => {
    mocks.lookupAsn.mockReturnValue({ asn: 13335, organization: "Cloudflare" });

    const resolved = await resolveTrackingRequest(request({}), payload());
    mocks.lookupAsn.mockClear();

    expect(resolved!.lookupAsn("203.0.113.7")).toEqual({ asn: 13335, organization: "Cloudflare" });
    expect(resolved!.lookupAsn("203.0.113.7")).toEqual({ asn: 13335, organization: "Cloudflare" });
    expect(mocks.lookupAsn).toHaveBeenCalledOnce();
  });

  it("resolves the client IP through the same request-scoped ASN resolver", async () => {
    // A datacenter edge IP means a first-party proxy is in front, so the
    // forwarded visitor IP wins over the Cloudflare edge IP.
    mocks.lookupAsn.mockImplementation((ip: string) =>
      ip === "203.0.113.99" ? { asn: 16509, organization: "AMAZON-02" } : null
    );

    const resolved = await resolveTrackingRequest(
      request({ "cf-connecting-ip": "203.0.113.99", "x-forwarded-for": "198.51.100.20" }),
      payload()
    );

    expect(resolved!.ipAddress).toBe("198.51.100.20");
  });
});
