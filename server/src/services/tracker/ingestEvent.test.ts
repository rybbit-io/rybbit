import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteConfigData } from "../../lib/siteConfig.js";
import type { TrackingRequest } from "./trackingRequest.js";

const mocks = vi.hoisted(() => ({
  addBotEvent: vi.fn(),
  addPageview: vi.fn(),
  checkBotBlocking: vi.fn(),
  decideSiteExclusion: vi.fn(),
  isSiteOverLimit: vi.fn(),
  updateSession: vi.fn(),
  generateUserId: vi.fn(),
  generateUserIdFromClientId: vi.fn(),
}));

vi.mock("../usageService.js", () => ({
  usageService: { isSiteOverLimit: mocks.isSiteOverLimit },
}));

vi.mock("./pageviewQueue.js", () => ({
  pageviewQueue: { add: mocks.addPageview },
}));

vi.mock("../sessions/sessionsService.js", () => ({
  sessionsService: { updateSession: mocks.updateSession },
}));

vi.mock("./botBlocking/index.js", () => ({
  checkBotBlocking: mocks.checkBotBlocking,
}));

vi.mock("./botBlocking/botEventQueue.js", () => ({
  botEventQueue: { add: mocks.addBotEvent },
}));

vi.mock("../sites/siteExclusionDecision.js", () => ({
  decideSiteExclusion: mocks.decideSiteExclusion,
}));

vi.mock("../userId/userIdService.js", () => ({
  userIdService: {
    generateUserId: mocks.generateUserId,
    generateUserIdFromClientId: mocks.generateUserIdFromClientId,
  },
}));

import { ingestEvent } from "./ingestEvent.js";

const site = {
  id: "site_abc",
  siteId: 42,
  type: "web",
  blockBots: true,
  saltUserIds: false,
  trackIp: false,
  firstPartyProxy: false,
  excludedIPs: [],
  excludedCountries: [],
  excludedPaths: [],
  excludedHostnames: [],
  excludedUserAgents: [],
  excludedASNs: [],
  excludedQueryParams: [],
} as unknown as SiteConfigData;

const lookupAsn = vi.fn(() => null);

function trackingRequest(overrides: Partial<TrackingRequest> = {}): TrackingRequest {
  return {
    payload: {
      type: "pageview",
      site_id: "site_abc",
      pathname: "/pricing",
      hostname: "example.com",
    } as TrackingRequest["payload"],
    site,
    ipAddress: "198.51.100.10",
    userAgent: "Mozilla/5.0",
    candidateIps: ["198.51.100.10"],
    trustedServerSideIngestion: false,
    headers: { "user-agent": "Mozilla/5.0" },
    lookupAsn,
    receivedAt: new Date("2026-08-14T10:38:37.000Z"),
    ...overrides,
  };
}

describe("ingestEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decideSiteExclusion.mockResolvedValue({ excluded: false });
    mocks.isSiteOverLimit.mockReturnValue(false);
    mocks.checkBotBlocking.mockResolvedValue(null);
    mocks.updateSession.mockResolvedValue({ sessionId: "session-alice" });
    mocks.generateUserId.mockResolvedValue("shared-fingerprint");
    mocks.addPageview.mockResolvedValue(undefined);
  });

  it("queues an accepted event with its session and resolved identity", async () => {
    const outcome = await ingestEvent(
      trackingRequest({
        payload: {
          type: "pageview",
          site_id: "site_abc",
          user_id: "employee-alice",
        } as TrackingRequest["payload"],
      })
    );

    expect(outcome).toEqual({ status: "tracked", sessionId: "session-alice" });
    expect(mocks.updateSession).toHaveBeenCalledWith({
      userId: "shared-fingerprint",
      identifiedUserId: "employee-alice",
      siteId: 42,
    });
    expect(mocks.addPageview).toHaveBeenCalledWith(
      expect.objectContaining({
        site_id: 42,
        sessionId: "session-alice",
        userId: "shared-fingerprint",
        identifiedUserId: "employee-alice",
        ipAddress: "198.51.100.10",
        timestamp: "2026-08-14T10:38:37.000Z",
      })
    );
  });

  it("passes the resolved request to the Site Exclusion Decision without re-deriving it", async () => {
    await ingestEvent(
      trackingRequest({
        ipAddress: "203.0.113.7",
        candidateIps: ["203.0.113.7", "198.51.100.10"],
        userAgent: "ServerSDK/1.0",
        payload: {
          type: "pageview",
          site_id: "site_abc",
          pathname: "/admin/users",
          querystring: "utm_source=newsletter",
          hostname: "example.com",
        } as TrackingRequest["payload"],
      })
    );

    expect(mocks.decideSiteExclusion).toHaveBeenCalledWith(site, {
      ipAddress: "203.0.113.7",
      candidateIps: ["203.0.113.7", "198.51.100.10"],
      pathname: "/admin/users",
      querystring: "utm_source=newsletter",
      hostname: "example.com",
      userAgent: "ServerSDK/1.0",
      lookupAsn,
    });
  });

  // The ordering fix: exclusion used to run *after* bot detection, so a Site
  // owner's own excluded office IP still drove every anomaly counter.
  it("decides exclusion before bot detection, so excluded traffic leaves no trace", async () => {
    mocks.decideSiteExclusion.mockResolvedValue({
      excluded: true,
      reason: "path",
      label: "path",
      value: "/admin/users",
    });

    const outcome = await ingestEvent(trackingRequest());

    expect(outcome).toEqual({
      status: "excluded",
      exclusion: { excluded: true, reason: "path", label: "path", value: "/admin/users" },
    });
    expect(mocks.checkBotBlocking).not.toHaveBeenCalled();
    expect(mocks.isSiteOverLimit).not.toHaveBeenCalled();
    expect(mocks.generateUserId).not.toHaveBeenCalled();
    expect(mocks.addPageview).not.toHaveBeenCalled();
    expect(mocks.addBotEvent).not.toHaveBeenCalled();
  });

  it("stops at the monthly limit before charging bot detection a Redis round-trip", async () => {
    mocks.isSiteOverLimit.mockReturnValue(true);

    const outcome = await ingestEvent(trackingRequest());

    expect(outcome).toEqual({ status: "over_limit" });
    expect(mocks.checkBotBlocking).not.toHaveBeenCalled();
    expect(mocks.addPageview).not.toHaveBeenCalled();
  });

  it("routes detected bots to the bot queue instead of a session", async () => {
    mocks.checkBotBlocking.mockResolvedValue({
      eventProperties: { bot_layer: "ua_pattern" },
    });

    const outcome = await ingestEvent(trackingRequest());

    expect(outcome).toEqual({ status: "bot" });
    expect(mocks.addBotEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        bot_layer: "ua_pattern",
        sessionId: "bot:shared-fingerprint",
      })
    );
    expect(mocks.updateSession).not.toHaveBeenCalled();
    expect(mocks.addPageview).not.toHaveBeenCalled();
  });

  it("hands bot detection the request's own headers and ASN resolver", async () => {
    await ingestEvent(
      trackingRequest({
        headers: { "user-agent": "Mozilla/5.0", "accept-language": "en-US" },
        trustedServerSideIngestion: true,
      })
    );

    expect(mocks.checkBotBlocking).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "user-agent": "Mozilla/5.0", "accept-language": "en-US" },
        blockBots: true,
        trustedServerSideIngestion: true,
        isMobileSite: false,
        lookupAsn,
      })
    );
  });

  it("reuses the request's Site Configuration for identity instead of re-reading it", async () => {
    await ingestEvent(
      trackingRequest({
        site: { ...site, saltUserIds: true } as SiteConfigData,
      })
    );

    expect(mocks.generateUserId).toHaveBeenCalledWith("198.51.100.10", "Mozilla/5.0", 42, {
      saltUserIds: true,
      lookupAsn,
      // The event's own instant decides its salt day, not the clock at hash time.
      receivedAt: new Date("2026-08-14T10:38:37.000Z"),
    });
  });
});
