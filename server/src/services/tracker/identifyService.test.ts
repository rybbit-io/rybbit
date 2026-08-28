import type { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  checkApiKey: vi.fn(),
  lookupAsn: vi.fn(),
  generateUserId: vi.fn(),
  generateUserIdFromClientId: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { getConfig: mocks.getConfig },
}));

vi.mock("../../lib/auth-utils.js", () => ({
  checkApiKey: mocks.checkApiKey,
}));

vi.mock("../../db/geolocation/asn.js", () => ({
  createAsnLookup: () => mocks.lookupAsn,
}));

vi.mock("../userId/userIdService.js", () => ({
  userIdService: {
    generateUserId: mocks.generateUserId,
    generateUserIdFromClientId: mocks.generateUserIdFromClientId,
  },
}));

// These collaborators are not reached when is_new_identify is false and no
// traits are submitted; keeping them inert makes the test about request trust
// and identity inputs only.
vi.mock("../../db/postgres/postgres.js", () => ({ db: {} }));
vi.mock("./identityBackfillQueue.js", () => ({ identityBackfillQueue: { enqueue: vi.fn() } }));
vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ error: vi.fn(), debug: vi.fn(), warn: mocks.logWarn }),
}));

import { handleIdentify } from "./identifyService.js";

const site = {
  id: "site_abc",
  siteId: 42,
  firstPartyProxy: false,
  saltUserIds: true,
};

function request(body: Record<string, unknown>, headers: Record<string, string> = {}, ip = "198.51.100.10") {
  return { body, headers, ip } as unknown as FastifyRequest;
}

function replyStub() {
  const reply: any = { statusCode: 200 };
  reply.status = (statusCode: number) => {
    reply.statusCode = statusCode;
    return reply;
  };
  reply.send = (body: unknown) => {
    reply.body = body;
    return reply;
  };
  return reply;
}

function identifyBody(overrides: Record<string, unknown> = {}) {
  return {
    site_id: "site_abc",
    user_id: "known-user",
    is_new_identify: false,
    ...overrides,
  };
}

describe("handleIdentify Site Ingestion Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue(site);
    mocks.lookupAsn.mockReturnValue(null);
    mocks.generateUserId.mockResolvedValue("request-fingerprint");
    mocks.generateUserIdFromClientId.mockResolvedValue("client-id-fingerprint");
  });

  it("ignores public payload identity overrides", async () => {
    const reply = replyStub();

    await handleIdentify(
      request(identifyBody({ ip_address: "203.0.113.10", user_agent: "SpoofedBot/1.0" }), {
        "user-agent": "Browser/1.0",
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(mocks.generateUserId).toHaveBeenCalledWith(
      "198.51.100.10",
      "Browser/1.0",
      42,
      expect.objectContaining({
        saltUserIds: true,
        lookupAsn: mocks.lookupAsn,
        receivedAt: expect.any(Date),
      })
    );
    expect(mocks.checkApiKey).not.toHaveBeenCalled();
    expect(mocks.logWarn).toHaveBeenCalledWith(
      {
        siteId: 42,
        ignoredIpAddressOverride: true,
        ignoredUserAgentOverride: true,
      },
      "Ignored untrusted identity overrides; an ingest:write bearer is required"
    );
  });

  it("accepts identity overrides from an ingest:write bearer", async () => {
    mocks.checkApiKey.mockResolvedValue({ valid: true, statements: { ingest: ["write"] } });
    const reply = replyStub();

    await handleIdentify(
      request(identifyBody({ ip_address: "203.0.113.10", user_agent: "ServerSDK/1.0" }), {
        authorization: "Bearer sk_test",
        "user-agent": "Transport/1.0",
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(mocks.generateUserId).toHaveBeenCalledWith(
      "203.0.113.10",
      "ServerSDK/1.0",
      42,
      expect.objectContaining({ saltUserIds: true, receivedAt: expect.any(Date) })
    );
  });

  it("passes Site salting and request time to client-id identity generation", async () => {
    const reply = replyStub();

    await handleIdentify(request(identifyBody({ anonymous_id: "browser-client-id" })), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.generateUserIdFromClientId).toHaveBeenCalledWith(
      "browser-client-id",
      42,
      expect.objectContaining({ saltUserIds: true, receivedAt: expect.any(Date) })
    );
    expect(mocks.generateUserId).not.toHaveBeenCalled();
  });
});
