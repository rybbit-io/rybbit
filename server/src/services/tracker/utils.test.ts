import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyRequest } from "fastify";
import type { SiteConfigData } from "../../lib/siteConfig.js";

const mocks = vi.hoisted(() => ({
  generateUserId: vi.fn(),
  generateUserIdFromClientId: vi.fn(),
  resolveTrackingIdentity: vi.fn(),
}));

vi.mock("../userId/userIdService.js", () => ({
  userIdService: {
    generateUserId: mocks.generateUserId,
    generateUserIdFromClientId: mocks.generateUserIdFromClientId,
  },
}));

vi.mock("./requestIdentity.js", () => ({
  resolveTrackingIdentity: mocks.resolveTrackingIdentity,
}));

import { createBasePayload } from "./utils.js";

function baseSiteConfig(overrides: Partial<SiteConfigData> = {}): SiteConfigData {
  return {
    id: "abc123",
    siteId: 42,
    type: "web",
    public: false,
    embedEnabled: false,
    saltUserIds: false,
    domain: "example.com",
    blockBots: true,
    firstPartyProxy: false,
    persistentClientIds: false,
    excludedIPs: [],
    excludedCountries: [],
    excludedPaths: [],
    excludedHostnames: [],
    excludedUserAgents: [],
    sessionReplay: false,
    webVitals: false,
    trackErrors: false,
    trackOutbound: true,
    trackUrlParams: true,
    trackInitialPageView: true,
    trackSpaNavigation: true,
    trackIp: false,
    trackButtonClicks: false,
    trackCopy: false,
    trackFormInteractions: false,
    tags: [],
    ...overrides,
  };
}

describe("createBasePayload anonymous_id gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveTrackingIdentity.mockReturnValue({
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0",
      candidateIps: ["203.0.113.10"],
    });
    mocks.generateUserId.mockResolvedValue("fingerprint-abc");
    mocks.generateUserIdFromClientId.mockResolvedValue("client-id-xyz");
  });

  it("ignores a client-supplied anonymous_id when persistentClientIds is off", async () => {
    const payload = await createBasePayload(
      {} as FastifyRequest,
      "pageview",
      { type: "pageview", site_id: "42", anonymous_id: "spoofed-visitor" } as any,
      baseSiteConfig({ persistentClientIds: false })
    );

    expect(mocks.generateUserIdFromClientId).not.toHaveBeenCalled();
    expect(mocks.generateUserId).toHaveBeenCalledWith("203.0.113.10", "Mozilla/5.0", 42);
    expect(payload.userId).toBe("fingerprint-abc");
  });

  it("honors the client-supplied anonymous_id when persistentClientIds is on", async () => {
    const payload = await createBasePayload(
      {} as FastifyRequest,
      "pageview",
      { type: "pageview", site_id: "42", anonymous_id: "visitor-real" } as any,
      baseSiteConfig({ persistentClientIds: true })
    );

    expect(mocks.generateUserIdFromClientId).toHaveBeenCalledWith("visitor-real", 42);
    expect(mocks.generateUserId).not.toHaveBeenCalled();
    expect(payload.userId).toBe("client-id-xyz");
  });

  it("falls back to the fingerprint when persistentClientIds is on but no anonymous_id is sent", async () => {
    const payload = await createBasePayload(
      {} as FastifyRequest,
      "pageview",
      { type: "pageview", site_id: "42" } as any,
      baseSiteConfig({ persistentClientIds: true })
    );

    expect(mocks.generateUserIdFromClientId).not.toHaveBeenCalled();
    expect(mocks.generateUserId).toHaveBeenCalledWith("203.0.113.10", "Mozilla/5.0", 42);
    expect(payload.userId).toBe("fingerprint-abc");
  });
});
