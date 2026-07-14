import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transactionExecutor = {};
  return {
    completeImport: vi.fn(),
    getImportById: vi.fn(),
    insert: vi.fn(),
    transactionExecutor,
    updateImportProgress: vi.fn(),
    withOrganizationImportLock: vi.fn(async (_organizationId: string, work: (tx: unknown) => Promise<unknown>) =>
      work(transactionExecutor)
    ),
  };
});

const dbChain = {
  from: vi.fn(),
  leftJoin: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
};
dbChain.from.mockReturnValue(dbChain);
dbChain.leftJoin.mockReturnValue(dbChain);
dbChain.where.mockReturnValue(dbChain);

vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { insert: mocks.insert } }));
vi.mock("../../db/postgres/postgres.js", () => ({ db: { select: vi.fn(() => dbChain) } }));
vi.mock("../../lib/const.js", () => ({ IS_CLOUD: false }));
vi.mock("../../services/import/importStatusManager.js", () => ({
  completeImport: mocks.completeImport,
  getImportById: mocks.getImportById,
  updateImportProgress: mocks.updateImportProgress,
  withOrganizationImportLock: mocks.withOrganizationImportLock,
}));
vi.mock("../../services/import/importQuotaTracker.js", () => ({
  ImportQuotaTracker: {
    create: vi.fn(async () => ({ canImportBatch: () => [0] })),
  },
}));

import { batchImportEvents } from "./batchImportEvents.js";

const event = {
  session_id: "4f7371e6-41f5-41af-9b57-82a1c8cfeaf8",
  hostname: "example.com",
  browser: "chrome",
  os: "windows 10",
  device: "desktop",
  screen: "1920x1080",
  language: "en-US",
  country: "US",
  region: "US-CA",
  city: "Los Angeles",
  url_path: "/",
  url_query: "",
  referrer_path: "",
  referrer_domain: "",
  page_title: "Home",
  event_type: "1",
  event_name: "",
  distinct_id: "visitor-1",
  created_at: "2026-07-12 12:00:00",
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

describe("batchImportEvents failure semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbChain.from.mockReturnValue(dbChain);
    dbChain.leftJoin.mockReturnValue(dbChain);
    dbChain.where.mockReturnValue(dbChain);
    dbChain.limit.mockResolvedValue([{ organizationId: "org-1", stripeCustomerId: null }]);
    mocks.getImportById.mockResolvedValue({
      importId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
      siteId: 42,
      organizationId: "org-1",
      platform: "umami",
      completedAt: null,
    });
    mocks.updateImportProgress.mockResolvedValue(undefined);
    mocks.completeImport.mockResolvedValue(undefined);
  });

  it("does not mark a final batch complete when ClickHouse rejects it", async () => {
    mocks.insert.mockRejectedValueOnce(new Error("ClickHouse unavailable"));
    const request = {
      params: { siteId: 42, importId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4" },
      body: { events: [event], isLastBatch: true },
    } as unknown as FastifyRequest;
    const reply = replyStub();

    await batchImportEvents(request as any, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(mocks.completeImport).not.toHaveBeenCalled();
  });

  it("keeps import state writes on the transaction holding the organization lock", async () => {
    const request = {
      params: { siteId: 42, importId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4" },
      body: { events: [event], isLastBatch: true },
    } as unknown as FastifyRequest;
    const reply = replyStub();

    await batchImportEvents(request as any, reply);

    expect(mocks.getImportById).toHaveBeenCalledWith("76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4", mocks.transactionExecutor);
    expect(mocks.updateImportProgress).toHaveBeenCalledWith(
      "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
      1,
      0,
      0,
      mocks.transactionExecutor
    );
    expect(mocks.completeImport).toHaveBeenCalledWith(
      "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
      mocks.transactionExecutor
    );
  });
});
