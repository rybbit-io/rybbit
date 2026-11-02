import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  importLockAcquire: vi.fn(),
  importLockRelease: vi.fn(),
  getImportById: vi.fn(),
}));

vi.mock("../../db/redis/redis.js", () => mocks);
vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true }));
vi.mock("./importQuotaTracker.js", () => ({ ImportQuotaTracker: {} }));
vi.mock("./importStatusManager.js", () => ({ getImportById: mocks.getImportById }));
vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { IMPORT_TIMEOUT_MS, importQuotaManager } from "./importQuotaManager.js";

let orgCounter = 0;
let org: string;

beforeEach(() => {
  vi.clearAllMocks();
  // The manager is a singleton; a fresh organization keeps fallback locks from leaking between tests.
  org = `org_${++orgCounter}`;
  mocks.importLockAcquire.mockResolvedValue(true);
  mocks.importLockRelease.mockResolvedValue(true);
  // Imports are running unless a test says otherwise.
  mocks.getImportById.mockResolvedValue({ completedAt: null });
});

describe("importQuotaManager lock", () => {
  it("takes the shared lock for the import id and releases it by the same id", async () => {
    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);
    expect(mocks.importLockAcquire).toHaveBeenCalledWith(`import:lock:${org}`, "import_1", IMPORT_TIMEOUT_MS);

    await importQuotaManager.completeImport(org, "import_1");
    expect(mocks.importLockRelease).toHaveBeenCalledWith(`import:lock:${org}`, "import_1");
  });

  it("refuses a second import while another worker holds the lock", async () => {
    mocks.importLockAcquire.mockResolvedValue(false);

    expect(await importQuotaManager.startImport(org, "import_1")).toBe(false);
  });

  it("falls back to an in-process lock when Redis fails, without refusing the first import", async () => {
    mocks.importLockAcquire.mockRejectedValue(new Error("redis down"));

    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(false);

    // Only the import that holds the fallback lock releases it.
    await importQuotaManager.completeImport(org, "import_other");
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(false);

    await importQuotaManager.completeImport(org, "import_1");
    expect(await importQuotaManager.startImport(org, "import_3")).toBe(true);
  });

  it("lets only one of two concurrent starts through while Redis is down", async () => {
    mocks.importLockAcquire.mockRejectedValue(new Error("redis down"));

    const results = await Promise.all([
      importQuotaManager.startImport(org, "import_1"),
      importQuotaManager.startImport(org, "import_2"),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("keeps an import started while Redis was down exclusive after Redis recovers", async () => {
    mocks.importLockAcquire.mockRejectedValueOnce(new Error("redis down"));
    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);

    // Redis is back and has never heard of import_1.
    mocks.importLockAcquire.mockResolvedValue(true);
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(false);
    expect(mocks.importLockAcquire).toHaveBeenCalledTimes(1);

    await importQuotaManager.completeImport(org, "import_1");
    expect(await importQuotaManager.startImport(org, "import_3")).toBe(true);
  });

  it("releases a fallback lock once another worker has finished that import", async () => {
    mocks.importLockAcquire.mockRejectedValueOnce(new Error("redis down"));
    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);

    // import_1's final batch landed on another worker, which marked the row complete.
    mocks.getImportById.mockResolvedValue({ completedAt: "2026-10-24 10:00:00" });
    mocks.importLockAcquire.mockResolvedValue(true);
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(true);
  });

  it("keeps the fallback lock when the import row can't be read", async () => {
    mocks.importLockAcquire.mockRejectedValueOnce(new Error("redis down"));
    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);

    mocks.getImportById.mockRejectedValue(new Error("postgres down"));
    mocks.importLockAcquire.mockResolvedValue(true);
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(false);
  });

  it("keeps an import started through Redis exclusive when Redis goes down", async () => {
    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);

    mocks.importLockAcquire.mockRejectedValue(new Error("redis down"));
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(false);

    await importQuotaManager.completeImport(org, "import_1");
    expect(await importQuotaManager.startImport(org, "import_3")).toBe(true);
  });

  it("follows Redis while it is up, so an import another worker finished doesn't block this one", async () => {
    expect(await importQuotaManager.startImport(org, "import_1")).toBe(true);

    // import_1's last batch was served (and its Redis lock released) by a different worker.
    expect(await importQuotaManager.startImport(org, "import_2")).toBe(true);
  });

  it("never throws when releasing fails", async () => {
    mocks.importLockRelease.mockRejectedValue(new Error("redis down"));

    await expect(importQuotaManager.completeImport(org, "import_1")).resolves.toBeUndefined();
  });
});
