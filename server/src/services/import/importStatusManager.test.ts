import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const findActive = vi.fn();
  const forUpdate = vi.fn();
  const insertReturning = vi.fn();
  const transaction = vi.fn();
  const updateWhere = vi.fn();

  const lockChain = { from: vi.fn(), where: vi.fn(), for: forUpdate };
  lockChain.from.mockReturnValue(lockChain);
  lockChain.where.mockReturnValue(lockChain);

  const updateChain = { set: vi.fn(), where: updateWhere };
  updateChain.set.mockReturnValue(updateChain);

  const insertChain = { values: vi.fn(), returning: insertReturning };
  insertChain.values.mockReturnValue(insertChain);

  const db = {
    insert: vi.fn(() => insertChain),
    query: { importStatus: { findFirst: findActive } },
    transaction,
    update: vi.fn(() => updateChain),
  };

  return {
    db,
    findActive,
    forUpdate,
    insertChain,
    insertReturning,
    lockChain,
    transaction,
    updateChain,
    updateWhere,
  };
});

vi.mock("../../db/postgres/postgres.js", () => ({ db: mocks.db }));

import { createImport } from "./importStatusManager.js";

describe("cluster-safe import creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lockChain.from.mockReturnValue(mocks.lockChain);
    mocks.lockChain.where.mockReturnValue(mocks.lockChain);
    mocks.updateChain.set.mockReturnValue(mocks.updateChain);
    mocks.insertChain.values.mockReturnValue(mocks.insertChain);
    mocks.forUpdate.mockResolvedValue([{ id: "org-1" }]);
    mocks.updateWhere.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async callback => callback({ select: () => mocks.lockChain }));
  });

  it("locks the organization row and rejects a second active import", async () => {
    mocks.findActive.mockResolvedValue({ importId: "existing" });

    const result = await createImport({
      siteId: 42,
      organizationId: "org-1",
      platform: "umami",
      enforceSingleActive: true,
    });

    expect(result).toBeNull();
    expect(mocks.forUpdate).toHaveBeenCalledWith("update");
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("creates the import while holding the same organization lock", async () => {
    mocks.findActive.mockResolvedValue(undefined);
    mocks.insertReturning.mockResolvedValue([{ importId: "new-import" }]);

    const result = await createImport({
      siteId: 42,
      organizationId: "org-1",
      platform: "umami",
      enforceSingleActive: true,
    });

    expect(result).toEqual({ importId: "new-import" });
    expect(mocks.forUpdate).toHaveBeenCalledWith("update");
    expect(mocks.db.insert).toHaveBeenCalledTimes(1);
  });
});
