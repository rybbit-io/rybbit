import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidateOrganizationSitesAccessCache: vi.fn(),
}));

vi.mock("../../services/sites/siteAccessCache.js", () => ({
  invalidateOrganizationSitesAccessCache: mocks.invalidateOrganizationSitesAccessCache,
}));

vi.mock("../../db/postgres/postgres.js", () => {
  function writeChain() {
    const chain = {
      set: vi.fn(() => chain),
      values: vi.fn(async () => undefined),
      where: vi.fn(async () => undefined),
    };
    return chain;
  }

  const transactionAdapter = {
    insert: vi.fn(() => writeChain()),
    update: vi.fn(() => writeChain()),
    delete: vi.fn(() => writeChain()),
  };

  return {
    db: {
      select: vi.fn(() => {
        const chain = {
          from: vi.fn(() => chain),
          where: vi.fn(() => chain),
          limit: vi.fn(async () => [{ id: "team-1", organizationId: "org-1" }]),
        };
        return chain;
      }),
      delete: vi.fn(() => writeChain()),
      transaction: vi.fn(async callback => callback(transactionAdapter)),
    },
  };
});

import { createTeam } from "./createTeam.js";
import { deleteTeam } from "./deleteTeam.js";
import { updateTeam } from "./updateTeam.js";

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

function request(body: Record<string, unknown> = {}) {
  return {
    params: { organizationId: "org-1", teamId: "team-1" },
    body,
    log: { error: vi.fn() },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invalidateOrganizationSitesAccessCache.mockResolvedValue(undefined);
});

describe("Team Site-access cache invalidation", () => {
  it("invalidates the whole Organization after creating a team", async () => {
    const reply = replyStub();

    await createTeam(request({ name: "Editors" }), reply);

    expect(reply.statusCode).toBe(201);
    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledWith("org-1");
  });

  it("invalidates the whole Organization after updating team gating", async () => {
    const reply = replyStub();

    await updateTeam(request({ name: "Publishers" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledWith("org-1");
  });

  it("invalidates the whole Organization after deleting a team", async () => {
    const reply = replyStub();

    await deleteTeam(request(), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledWith("org-1");
  });
});
