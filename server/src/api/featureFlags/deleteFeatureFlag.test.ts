import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findExperiment: vi.fn(),
  deleteReturning: vi.fn(),
  invalidateFeatureFlagDefinitions: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    query: { experiments: { findFirst: mocks.findExperiment } },
    delete: () => ({ where: () => ({ returning: mocks.deleteReturning }) }),
  },
}));
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { query: vi.fn() } }));
vi.mock("../../db/geolocation/geolocation.js", () => ({ getLocation: vi.fn() }));
vi.mock("../../lib/siteConfig.js", () => ({ siteConfig: { getConfig: vi.fn() } }));
vi.mock("../../services/featureFlags/definitions.js", () => ({
  getFeatureFlagDefinitionsForRuntime: vi.fn(),
  invalidateFeatureFlagDefinitions: mocks.invalidateFeatureFlagDefinitions,
}));

import { deleteFeatureFlag } from "./index.js";

type DeleteRequest = FastifyRequest<{ Params: { siteId: string; flagId: string } }>;

function requestStub(siteId = "1", flagId = "7") {
  return { params: { siteId, flagId } } as unknown as DeleteRequest;
}

function replyStub() {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findExperiment.mockResolvedValue(undefined);
  mocks.deleteReturning.mockResolvedValue([{ flagId: 7 }]);
});

describe("deleteFeatureFlag", () => {
  it("refuses to delete a flag an experiment is built on", async () => {
    mocks.findExperiment.mockResolvedValue({ name: "Checkout copy" });
    const reply = replyStub();

    await deleteFeatureFlag(requestStub(), reply);

    expect(reply.status).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'This flag is used by experiment "Checkout copy". Delete the experiment first.',
    });
    expect(mocks.deleteReturning).not.toHaveBeenCalled();
    expect(mocks.invalidateFeatureFlagDefinitions).not.toHaveBeenCalled();
  });

  it("deletes a flag no experiment uses", async () => {
    const reply = replyStub();

    await deleteFeatureFlag(requestStub(), reply);

    expect(mocks.deleteReturning).toHaveBeenCalled();
    expect(mocks.invalidateFeatureFlagDefinitions).toHaveBeenCalledWith(1);
    expect(reply.send).toHaveBeenCalledWith({ success: true });
  });

  it("returns 404 when the flag does not exist on the site", async () => {
    mocks.deleteReturning.mockResolvedValue([]);
    const reply = replyStub();

    await deleteFeatureFlag(requestStub(), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(mocks.invalidateFeatureFlagDefinitions).not.toHaveBeenCalled();
  });
});
