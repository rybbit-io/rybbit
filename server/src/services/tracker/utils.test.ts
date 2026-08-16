import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteConfigData } from "../../lib/siteConfig.js";
import type { TrackingRequest } from "./trackingRequest.js";

const mocks = vi.hoisted(() => ({
  generateUserId: vi.fn(),
  generateUserIdFromClientId: vi.fn(),
}));

vi.mock("../userId/userIdService.js", () => ({
  userIdService: {
    generateUserId: mocks.generateUserId,
    generateUserIdFromClientId: mocks.generateUserIdFromClientId,
  },
}));

import { createBasePayload } from "./utils.js";

const site = {
  id: "site_abc",
  siteId: 42,
  saltUserIds: false,
  trackIp: false,
} as unknown as SiteConfigData;

const lookupAsn = vi.fn(() => null);

function trackingRequest(overrides: Partial<TrackingRequest> = {}): TrackingRequest {
  return {
    payload: { type: "pageview", site_id: "site_abc" } as TrackingRequest["payload"],
    site,
    ipAddress: "198.51.100.10",
    userAgent: "Mozilla/5.0 (Macintosh) Chrome/120 Safari/537.36",
    candidateIps: ["198.51.100.10"],
    trustedServerSideIngestion: false,
    headers: {},
    lookupAsn,
    receivedAt: new Date("2026-08-14T10:38:37.000Z"),
    ...overrides,
  };
}

describe("createBasePayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateUserId.mockResolvedValue("device-fingerprint");
    mocks.generateUserIdFromClientId.mockResolvedValue("client-id-fingerprint");
  });

  it("uses the request's resolved identity rather than re-deriving one", async () => {
    const payload = await createBasePayload(trackingRequest({ ipAddress: "203.0.113.10", userAgent: "ServerSDK/1.0" }));

    expect(mocks.generateUserId).toHaveBeenCalledWith("203.0.113.10", "ServerSDK/1.0", 42, {
      saltUserIds: false,
      lookupAsn,
      receivedAt: new Date("2026-08-14T10:38:37.000Z"),
    });
    expect(payload).toMatchObject({
      ipAddress: "203.0.113.10",
      userAgent: "ServerSDK/1.0",
      userId: "device-fingerprint",
      identifiedUserId: "",
    });
  });

  it("stamps the event with the time the request was accepted", async () => {
    const payload = await createBasePayload(trackingRequest());

    expect(payload.timestamp).toBe("2026-08-14T10:38:37.000Z");
  });

  it("resolves the numeric Site id and defaults the optional string fields", async () => {
    const payload = await createBasePayload(trackingRequest());

    expect(payload).toMatchObject({
      site_id: 42,
      hostname: "",
      pathname: "",
      querystring: "",
      page_title: "",
      referrer: "",
      language: "",
      screenWidth: 0,
      screenHeight: 0,
      type: "pageview",
    });
  });

  it("never leaks the payload's IP and user-agent overrides into the event", async () => {
    const payload = await createBasePayload(
      trackingRequest({
        payload: {
          type: "pageview",
          site_id: "site_abc",
          ip_address: "203.0.113.10",
          user_agent: "SpoofedBot/1.0",
        } as TrackingRequest["payload"],
      })
    );

    expect(payload).not.toHaveProperty("ip_address");
    expect(payload).not.toHaveProperty("user_agent");
  });

  it("prefers an anonymous id over the IP/user-agent fingerprint", async () => {
    const payload = await createBasePayload(
      trackingRequest({
        site: { ...site, saltUserIds: true } as SiteConfigData,
        payload: {
          type: "pageview",
          site_id: "site_abc",
          anonymous_id: "consented-visitor",
        } as TrackingRequest["payload"],
      })
    );

    expect(mocks.generateUserIdFromClientId).toHaveBeenCalledWith("consented-visitor", 42, {
      saltUserIds: true,
      receivedAt: new Date("2026-08-14T10:38:37.000Z"),
    });
    expect(mocks.generateUserId).not.toHaveBeenCalled();
    expect(payload.userId).toBe("client-id-fingerprint");
  });

  it("keeps the device fingerprint separate from an identified user", async () => {
    const payload = await createBasePayload(
      trackingRequest({
        payload: {
          type: "pageview",
          site_id: "site_abc",
          user_id: "  employee-alice  ",
        } as TrackingRequest["payload"],
      })
    );

    expect(payload.userId).toBe("device-fingerprint");
    expect(payload.identifiedUserId).toBe("employee-alice");
  });

  it("carries the Site's IP storage setting onto the event", async () => {
    const payload = await createBasePayload(trackingRequest({ site: { ...site, trackIp: true } as SiteConfigData }));

    expect(payload.storeIp).toBe(true);
  });
});
