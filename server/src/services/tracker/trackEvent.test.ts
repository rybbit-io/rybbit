import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addBotEvent: vi.fn(),
  addPageview: vi.fn(),
  checkBotBlocking: vi.fn(),
  createBasePayload: vi.fn(),
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
});
