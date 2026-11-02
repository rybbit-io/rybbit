import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isSiteWithoutPlan: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  generateUserId: vi.fn(),
  generateUserIdFromClientId: vi.fn(),
  backfillAdd: vi.fn(),
  isTrustedServerSideIngestion: vi.fn(),
  resolveClientIp: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({ siteConfig: { getConfig: mocks.getConfig } }));
vi.mock("../usageService.js", () => ({ usageService: { isSiteWithoutPlan: mocks.isSiteWithoutPlan } }));
vi.mock("../../db/postgres/postgres.js", () => ({ db: { insert: mocks.insert, select: mocks.select } }));
vi.mock("../userId/userIdService.js", () => ({
  userIdService: {
    generateUserId: mocks.generateUserId,
    generateUserIdFromClientId: mocks.generateUserIdFromClientId,
  },
}));
vi.mock("./identityBackfillQueue.js", () => ({ identityBackfillQueue: { add: mocks.backfillAdd } }));
vi.mock("./trackingRequest.js", () => ({ isTrustedServerSideIngestion: mocks.isTrustedServerSideIngestion }));
vi.mock("./resolveClientIp.js", () => ({ resolveClientIp: mocks.resolveClientIp }));
vi.mock("../../lib/logger/logger.js", () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger, createServiceLogger: () => logger };
});

import { handleIdentify } from "./identifyService.js";

function replyStub() {
  const reply: any = {};
  reply.status = vi.fn(() => reply);
  reply.send = vi.fn(() => reply);
  return reply;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getConfig.mockResolvedValue({ siteId: 7, firstPartyProxy: false });
  mocks.isSiteWithoutPlan.mockReturnValue(false);
  mocks.resolveClientIp.mockReturnValue("198.51.100.7");
});

describe("handleIdentify — site with no plan", () => {
  it("stores no profile, alias or traits while the organization has no plan", async () => {
    mocks.isSiteWithoutPlan.mockReturnValue(true);
    const reply = replyStub();

    await handleIdentify(
      {
        body: { site_id: "7", user_id: "user_1", anonymous_id: "anon_1", is_new_identify: true, traits: { plan: "pro" } },
        headers: {},
      } as any,
      reply
    );

    expect(mocks.isSiteWithoutPlan).toHaveBeenCalledWith(7);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(mocks.generateUserIdFromClientId).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.backfillAdd).not.toHaveBeenCalled();
  });
});

describe("handleIdentify — ip_address / user_agent overrides", () => {
  const body = {
    site_id: "7",
    user_id: "attacker_pick",
    ip_address: "203.0.113.50",
    user_agent: "Victim UA",
    is_new_identify: false,
  };

  it("ignores them without a trusted ingest:write bearer and fingerprints the caller instead", async () => {
    mocks.isTrustedServerSideIngestion.mockResolvedValue(false);

    await handleIdentify({ body, headers: { "user-agent": "Caller UA" } } as any, replyStub());

    expect(mocks.generateUserId).toHaveBeenCalledWith("198.51.100.7", "Caller UA", 7);
  });

  it("uses them when the request carries a trusted ingest:write bearer", async () => {
    mocks.isTrustedServerSideIngestion.mockResolvedValue(true);

    await handleIdentify({ body, headers: { "user-agent": "Server UA" } } as any, replyStub());

    expect(mocks.generateUserId).toHaveBeenCalledWith("203.0.113.50", "Victim UA", 7);
  });

  it("skips the bearer check when no override is sent", async () => {
    await handleIdentify(
      { body: { site_id: "7", user_id: "u", is_new_identify: false }, headers: { "user-agent": "Caller UA" } } as any,
      replyStub()
    );

    expect(mocks.isTrustedServerSideIngestion).not.toHaveBeenCalled();
    expect(mocks.generateUserId).toHaveBeenCalledWith("198.51.100.7", "Caller UA", 7);
  });
});
