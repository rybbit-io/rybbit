import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isSiteWithoutPlan: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  generateUserId: vi.fn(),
  generateUserIdFromClientId: vi.fn(),
  backfillAdd: vi.fn(),
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
