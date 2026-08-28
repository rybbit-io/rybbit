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
      where: vi.fn(async () => undefined),
    };
    return chain;
  }

  const transactionAdapter = {
    update: vi.fn(() => writeChain()),
    delete: vi.fn(() => writeChain()),
  };

  return {
    db: {
      transaction: vi.fn(async callback => callback(transactionAdapter)),
    },
  };
});

import { applySiteMove } from "./applySiteMove.js";

describe("applySiteMove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateOrganizationSitesAccessCache.mockResolvedValue(undefined);
  });

  it("invalidates member and Organization-owned Site views in both Organizations", async () => {
    await applySiteMove(7, "org-source", "org-target");

    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledTimes(2);
    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledWith("org-source");
    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledWith("org-target");
  });

  it("invalidates only the target Organization when the Site had no previous owner", async () => {
    await applySiteMove(7, null, "org-target");

    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledOnce();
    expect(mocks.invalidateOrganizationSitesAccessCache).toHaveBeenCalledWith("org-target");
  });
});
