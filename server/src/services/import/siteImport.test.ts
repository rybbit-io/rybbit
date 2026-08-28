import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    siteRows: [{ organizationId: "org-1", stripeCustomerId: "cus-1" }] as Array<{
      organizationId: string | null;
      stripeCustomerId: string | null;
    }>,
  };

  return {
    state,
    clickhouseInsert: vi.fn(),
    clickhouseCommand: vi.fn(),
    leaseAcquire: vi.fn(),
    leaseRefresh: vi.fn(),
    leaseRelease: vi.fn(),
    getTracker: vi.fn(),
    invalidateTracker: vi.fn(),
    reserveBatch: vi.fn(),
    createImport: vi.fn(),
    deleteImport: vi.fn(),
    getImportById: vi.fn(),
    getImportsForSite: vi.fn(),
    recordImportBatch: vi.fn(),
    getBestSubscription: vi.fn(),
    umamiTransform: vi.fn(),
    simpleAnalyticsTransform: vi.fn(),
    plausibleTransform: vi.fn(),
    logError: vi.fn(),
  };
});

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { insert: mocks.clickhouseInsert, command: mocks.clickhouseCommand },
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    select: vi.fn(() => {
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(async () => mocks.state.siteRows),
      };
      return chain;
    }),
  },
}));

vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true }));
vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ error: mocks.logError }),
}));
vi.mock("../../lib/subscriptionUtils.js", () => ({ getBestSubscription: mocks.getBestSubscription }));
vi.mock("./importLease.js", () => ({
  importLease: {
    acquire: mocks.leaseAcquire,
    refresh: mocks.leaseRefresh,
    release: mocks.leaseRelease,
  },
}));
vi.mock("./importQuotaManager.js", () => ({
  importQuotaManager: {
    getTracker: mocks.getTracker,
    invalidateTracker: mocks.invalidateTracker,
  },
}));
vi.mock("./importStatusManager.js", () => ({
  createImport: mocks.createImport,
  deleteImport: mocks.deleteImport,
  getImportById: mocks.getImportById,
  getImportsForSite: mocks.getImportsForSite,
  recordImportBatch: mocks.recordImportBatch,
}));
vi.mock("./mappers/umami.js", () => ({
  UmamiImportMapper: { transform: mocks.umamiTransform },
}));
vi.mock("./mappers/simpleAnalytics.js", () => ({
  SimpleAnalyticsImportMapper: { transform: mocks.simpleAnalyticsTransform },
}));
vi.mock("./mappers/plausible.js", () => ({
  PlausibleImportMapper: { transform: mocks.plausibleTransform },
}));

import { importSiteEvents, removeSiteImport, SiteImportError, startSiteImport } from "./siteImport.js";

const importId = "11111111-1111-4111-8111-111111111111";
const transformedEvent = {
  site_id: 7,
  timestamp: "2026-08-01 12:00:00",
  import_id: importId,
};

function importRecord(platform: "umami" | "simple_analytics" | "plausible" = "umami") {
  return {
    importId,
    siteId: 7,
    organizationId: "org-1",
    platform,
    importedEvents: 0,
    skippedEvents: 0,
    invalidEvents: 0,
    startedAt: "2026-08-28T00:00:00.000Z",
    completedAt: null,
  };
}

describe("Site Import lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.siteRows = [{ organizationId: "org-1", stripeCustomerId: "cus-1" }];
    mocks.getBestSubscription.mockResolvedValue({ source: "stripe", planName: "pro100k" });
    mocks.leaseAcquire.mockResolvedValue(true);
    mocks.leaseRefresh.mockResolvedValue(true);
    mocks.leaseRelease.mockResolvedValue(undefined);
    mocks.getImportById.mockResolvedValue(importRecord());
    mocks.createImport.mockResolvedValue({ importId });
    mocks.getTracker.mockResolvedValue({
      getOldestAllowedMonth: () => "202401",
      reserveBatch: mocks.reserveBatch,
    });
    mocks.reserveBatch.mockReturnValue({ allowedIndices: [0], rollback: vi.fn() });
    mocks.umamiTransform.mockReturnValue([transformedEvent]);
    mocks.simpleAnalyticsTransform.mockReturnValue([transformedEvent]);
    mocks.plausibleTransform.mockReturnValue([transformedEvent]);
    mocks.clickhouseInsert.mockResolvedValue(undefined);
    mocks.clickhouseCommand.mockResolvedValue(undefined);
    mocks.recordImportBatch.mockResolvedValue(undefined);
    mocks.deleteImport.mockResolvedValue(undefined);
  });

  it("rejects a second import when the Organization lease is held", async () => {
    mocks.leaseAcquire.mockResolvedValue(false);

    await expect(startSiteImport({ siteId: 7, platform: "umami" })).rejects.toMatchObject({
      statusCode: 429,
      message: "Only 1 concurrent import allowed per organization",
    });
    expect(mocks.createImport).not.toHaveBeenCalled();
  });

  it("creates the import record with the acquired lease token", async () => {
    const result = await startSiteImport({ siteId: 7, platform: "plausible" });
    const acquiredImportId = mocks.leaseAcquire.mock.calls[0][1];

    expect(result).toMatchObject({
      importId: acquiredImportId,
      allowedDateRange: { earliestAllowedDate: "2024-01-01" },
    });
    expect(mocks.createImport).toHaveBeenCalledWith({
      importId: acquiredImportId,
      siteId: 7,
      organizationId: "org-1",
      platform: "plausible",
    });
  });

  it("releases the lease when import record creation fails", async () => {
    mocks.createImport.mockRejectedValue(new Error("Postgres unavailable"));

    await expect(startSiteImport({ siteId: 7, platform: "umami" })).rejects.toThrow("Postgres unavailable");

    const acquiredImportId = mocks.leaseAcquire.mock.calls[0][1];
    expect(mocks.leaseRelease).toHaveBeenCalledWith("org-1", acquiredImportId);
  });

  it("enforces the paid-plan gate before acquiring a lease", async () => {
    mocks.getBestSubscription.mockResolvedValue({ source: "free" });

    await expect(startSiteImport({ siteId: 7, platform: "umami" })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mocks.leaseAcquire).not.toHaveBeenCalled();
    expect(mocks.createImport).not.toHaveBeenCalled();
  });

  it("does not complete or release a failed last batch", async () => {
    const rollback = vi.fn();
    mocks.reserveBatch.mockReturnValue({ allowedIndices: [0], rollback });
    mocks.clickhouseInsert.mockRejectedValue(new Error("ClickHouse unavailable"));

    await expect(importSiteEvents({ siteId: 7, importId, events: [{}], isLastBatch: true })).rejects.toThrow(
      "ClickHouse unavailable"
    );

    expect(rollback).toHaveBeenCalledOnce();
    expect(mocks.recordImportBatch).not.toHaveBeenCalled();
    expect(mocks.leaseRelease).not.toHaveBeenCalled();
  });

  it("aborts both stores and releases the lease when progress recording fails after insertion", async () => {
    const rollback = vi.fn();
    mocks.reserveBatch.mockReturnValue({ allowedIndices: [0], rollback });
    mocks.recordImportBatch.mockRejectedValue(new Error("Postgres unavailable"));

    const result = importSiteEvents({ siteId: 7, importId, events: [{}], isLastBatch: true });
    await expect(result).rejects.toBeInstanceOf(SiteImportError);
    await expect(result).rejects.toThrow("Import was aborted");

    expect(rollback).toHaveBeenCalledOnce();
    expect(mocks.clickhouseCommand).toHaveBeenCalledWith(
      expect.objectContaining({ query_params: { importId, siteId: 7 } })
    );
    expect(mocks.deleteImport).toHaveBeenCalledWith(importId);
    expect(mocks.invalidateTracker).toHaveBeenCalledWith("org-1");
    expect(mocks.leaseRelease).toHaveBeenCalledWith("org-1", importId);
  });

  it("records completion and releases the lease only after a successful final batch", async () => {
    await importSiteEvents({ siteId: 7, importId, events: [{}], isLastBatch: true });

    expect(mocks.recordImportBatch).toHaveBeenCalledWith(importId, 1, 0, 0, true);
    expect(mocks.leaseRelease).toHaveBeenCalledWith("org-1", importId);
  });

  it("treats a retry of an already-completed final batch as success without duplicating events", async () => {
    mocks.getImportById.mockResolvedValue({
      ...importRecord(),
      completedAt: "2026-08-28T00:05:00.000Z",
    });

    await expect(importSiteEvents({ siteId: 7, importId, events: [{}], isLastBatch: true })).resolves.toBeUndefined();

    expect(mocks.leaseRefresh).not.toHaveBeenCalled();
    expect(mocks.clickhouseInsert).not.toHaveBeenCalled();
    expect(mocks.recordImportBatch).not.toHaveBeenCalled();
  });

  it("does not wait for a user-requested ClickHouse deletion to materialize", async () => {
    mocks.getImportById.mockResolvedValue({
      ...importRecord(),
      completedAt: "2026-08-28T00:05:00.000Z",
    });

    await removeSiteImport({ siteId: 7, importId });

    expect(mocks.clickhouseCommand).toHaveBeenCalledWith({
      query: "DELETE FROM events WHERE import_id = {importId:UUID} AND site_id = {siteId:UInt16}",
      query_params: { importId, siteId: 7 },
    });
    expect(mocks.deleteImport).toHaveBeenCalledWith(importId);
  });

  it.each([
    ["umami", mocks.umamiTransform],
    ["simple_analytics", mocks.simpleAnalyticsTransform],
    ["plausible", mocks.plausibleTransform],
  ] as const)("dispatches %s imports through their mapper", async (platform, mapper) => {
    mocks.getImportById.mockResolvedValue(importRecord(platform));

    await importSiteEvents({ siteId: 7, importId, events: [{ source: platform }], isLastBatch: false });

    expect(mapper).toHaveBeenCalledWith([{ source: platform }], 7, importId);
    expect(mocks.clickhouseInsert).toHaveBeenCalledWith(
      expect.objectContaining({ table: "events", values: [transformedEvent] })
    );
  });
});
