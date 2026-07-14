import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  command: vi.fn(),
  generateUserId: vi.fn(),
  getConfig: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { command: mocks.command },
}));

vi.mock("../../db/postgres/postgres.js", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("../../lib/siteConfig.js", () => ({ siteConfig: { getConfig: mocks.getConfig } }));
vi.mock("../userId/userIdService.js", () => ({
  userIdService: { generateUserId: mocks.generateUserId },
}));

import { backfillIdentifiedUserId, handleIdentify } from "./identifyService.js";

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

describe("identified-user backfill delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const insertChain = {
      values: vi.fn(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };
    insertChain.values.mockReturnValue(insertChain);
    mocks.transaction.mockImplementation(async callback => callback({ insert: () => insertChain }));
    mocks.getConfig.mockResolvedValue({ siteId: 42 });
    mocks.generateUserId.mockResolvedValue("anonymous");
    mocks.command.mockResolvedValue(undefined);
  });

  it("surfaces a ClickHouse mutation failure so identify can be retried", async () => {
    mocks.command.mockRejectedValueOnce(new Error("ClickHouse unavailable"));

    await expect(backfillIdentifiedUserId(42, "anonymous", "employee")).rejects.toThrow("ClickHouse unavailable");
  });

  it("returns an error when the awaited backfill fails", async () => {
    mocks.command.mockRejectedValueOnce(new Error("ClickHouse unavailable"));
    const request = {
      body: { site_id: "site-1", user_id: "employee", is_new_identify: true },
      headers: { "user-agent": "Browser" },
      ip: "198.51.100.10",
    } as unknown as FastifyRequest;
    const reply = replyStub();

    await handleIdentify(request, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
