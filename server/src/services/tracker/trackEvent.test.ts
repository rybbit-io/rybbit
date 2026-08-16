import { ALL_CLIENT_BOT_SIGNAL_BITS, MAX_CLIENT_BOT_SCORE } from "@rybbit/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addBotEvent: vi.fn(),
  addPageview: vi.fn(),
  checkBotBlocking: vi.fn(),
  createBasePayload: vi.fn(),
  decideSiteExclusion: vi.fn(),
  getConfig: vi.fn(),
  isSiteOverLimit: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {
    getConfig: mocks.getConfig,
  },
}));

vi.mock("../usageService.js", () => ({
  usageService: {
    isSiteOverLimit: mocks.isSiteOverLimit,
  },
}));

vi.mock("./pageviewQueue.js", () => ({
  pageviewQueue: {
    add: mocks.addPageview,
  },
}));

vi.mock("../sessions/sessionsService.js", () => ({
  sessionsService: {
    updateSession: mocks.updateSession,
  },
}));

vi.mock("./botBlocking/index.js", () => ({
  checkBotBlocking: mocks.checkBotBlocking,
}));

vi.mock("./botBlocking/botEventQueue.js", () => ({
  botEventQueue: {
    add: mocks.addBotEvent,
  },
}));

vi.mock("../../lib/auth-utils.js", () => ({
  checkApiKey: vi.fn(),
}));

vi.mock("./utils.js", () => ({
  createBasePayload: mocks.createBasePayload,
}));

vi.mock("../sites/siteExclusionDecision.js", () => ({
  decideSiteExclusion: mocks.decideSiteExclusion,
}));

import { trackEvent } from "./trackEvent.js";

const siteConfiguration = {
  id: "site_abc",
  siteId: 42,
  type: "web",
  blockBots: false,
  excludedIPs: [],
  excludedCountries: [],
  excludedPaths: [],
  excludedHostnames: [],
  excludedUserAgents: [],
};

function replyStub(): FastifyReply {
  const reply = {
    status: vi.fn(function (this: typeof reply) {
      return this;
    }),
    send: vi.fn(function (this: typeof reply) {
      return this;
    }),
  };
  return reply as unknown as FastifyReply;
}

describe("trackEvent session identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue(siteConfiguration);
    mocks.isSiteOverLimit.mockReturnValue(false);
    mocks.checkBotBlocking.mockResolvedValue(null);
    mocks.decideSiteExclusion.mockResolvedValue({ excluded: false });
    mocks.createBasePayload.mockResolvedValue({
      site_id: 42,
      userId: "shared-fingerprint",
      identifiedUserId: "employee-alice",
    });
    mocks.updateSession.mockResolvedValue({ sessionId: "session-alice" });
    mocks.addPageview.mockResolvedValue(undefined);
  });

  it("passes the identified user into session assignment", async () => {
    const request = {
      body: {
        type: "pageview",
        site_id: "site_abc",
      },
      headers: {},
      ip: "198.51.100.10",
    } as unknown as FastifyRequest;

    await trackEvent(request, replyStub());

    expect(mocks.updateSession).toHaveBeenCalledWith({
      userId: "shared-fingerprint",
      identifiedUserId: "employee-alice",
      siteId: 42,
    });
    expect(mocks.addPageview).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-alice",
        userId: "shared-fingerprint",
        identifiedUserId: "employee-alice",
      })
    );
  });

  // The tracker's 12th signal bit (squareScreen = 2048) once exceeded a
  // hard-coded `_bsm` bound, so every event carrying it failed validation and
  // was dropped with a 400 — the whole event, not just the signal.
  it("accepts a bot signal mask carrying every bit the contract defines", async () => {
    const request = {
      body: {
        type: "pageview",
        site_id: "site_abc",
        _bs: MAX_CLIENT_BOT_SCORE,
        _bsm: ALL_CLIENT_BOT_SIGNAL_BITS,
      },
      headers: {},
      ip: "198.51.100.10",
    } as unknown as FastifyRequest;
    const reply = replyStub();

    await trackEvent(request, reply);

    expect(reply.status).not.toHaveBeenCalledWith(400);
    expect(mocks.checkBotBlocking).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ clientBotSignalMask: ALL_CLIENT_BOT_SIGNAL_BITS }),
      })
    );
  });

  it("rejects a bot signal mask carrying bits the contract does not define", async () => {
    const request = {
      body: {
        type: "pageview",
        site_id: "site_abc",
        _bsm: ALL_CLIENT_BOT_SIGNAL_BITS + 1,
      },
      headers: {},
      ip: "198.51.100.10",
    } as unknown as FastifyRequest;
    const reply = replyStub();

    await trackEvent(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
  });

  // Anomaly counters are namespaced by this id. Passing the incoming identifier
  // instead split one Site across two namespaces — the text id the UI emits and
  // the legacy numeric id still accepted — each seeing half the traffic.
  it("namespaces bot blocking by the numeric Site id, not the incoming identifier", async () => {
    const request = {
      body: {
        type: "pageview",
        site_id: "site_abc",
      },
      headers: {},
      ip: "198.51.100.10",
    } as unknown as FastifyRequest;

    await trackEvent(request, replyStub());

    expect(mocks.checkBotBlocking).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ siteId: siteConfiguration.siteId }),
      })
    );
  });

  it("maps a Site Exclusion Decision to the event skip response", async () => {
    mocks.decideSiteExclusion.mockResolvedValue({
      excluded: true,
      reason: "path",
      label: "path",
      value: "/admin/users",
    });
    const request = {
      body: {
        type: "pageview",
        site_id: "site_abc",
        pathname: "/admin/users",
        hostname: "example.com",
      },
      headers: { "user-agent": "Mozilla/5.0" },
      ip: "198.51.100.10",
    } as unknown as FastifyRequest;
    const reply = replyStub();

    await trackEvent(request, reply);

    expect(mocks.decideSiteExclusion).toHaveBeenCalledWith(siteConfiguration, {
      ipAddress: "198.51.100.10",
      candidateIps: ["198.51.100.10"],
      pathname: "/admin/users",
      hostname: "example.com",
      userAgent: "Mozilla/5.0",
    });
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      message: "Event not tracked - path excluded",
    });
    expect(mocks.createBasePayload).not.toHaveBeenCalled();
  });
});
