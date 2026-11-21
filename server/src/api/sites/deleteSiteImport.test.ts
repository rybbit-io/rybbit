import { DateTime } from "luxon";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getImportById: vi.fn(),
  deleteImport: vi.fn(async () => {}),
  chCommand: vi.fn(async () => {}),
}));

vi.mock("../../services/import/importStatusManager.js", () => ({
  getImportById: mocks.getImportById,
  deleteImport: mocks.deleteImport,
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { command: mocks.chCommand },
}));

vi.mock("../../db/postgres/postgres.js", () => ({ db: {} }));
vi.mock("../../lib/subscriptionUtils.js", () => ({ getBestSubscription: vi.fn() }));
vi.mock("../../services/import/importQuotaTracker.js", () => ({ ImportQuotaTracker: {} }));
vi.mock("../../lib/const.js", () => ({ IS_CLOUD: false }));
vi.mock("../../db/redis/redis.js", () => ({}));

import { deleteSiteImport } from "./deleteSiteImport.js";

const SITE_ID = 7;
const IMPORT_ID = "6c1f3a52-0d7e-4f4b-9a8e-2b6f8f0c1d23";

function createReply() {
  const reply = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body?: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply;
}

// startedAt as Postgres returns a `timestamp` column in string mode.
const startedHoursAgo = (hours: number) => DateTime.utc().minus({ hours }).toFormat("yyyy-MM-dd HH:mm:ss.SSS");

async function deleteWith(record: { startedAt: string; completedAt: string | null }) {
  mocks.getImportById.mockResolvedValue({
    importId: IMPORT_ID,
    siteId: SITE_ID,
    organizationId: "org_1",
    ...record,
  });
  const reply = createReply();
  await deleteSiteImport(
    { params: { siteId: String(SITE_ID), importId: IMPORT_ID }, log: { error: vi.fn() } } as any,
    reply as any
  );
  return reply;
}

describe("deleteSiteImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a completed import", async () => {
    const reply = await deleteWith({ startedAt: startedHoursAgo(0.5), completedAt: startedHoursAgo(0.1) });

    expect(reply.statusCode).toBe(200);
    expect(mocks.chCommand).toHaveBeenCalledTimes(1);
    expect(mocks.deleteImport).toHaveBeenCalledWith(IMPORT_ID);
  });

  it("refuses to delete an incomplete import that may still be uploading", async () => {
    const reply = await deleteWith({ startedAt: startedHoursAgo(1), completedAt: null });

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: "Cannot delete active import" });
    expect(mocks.chCommand).not.toHaveBeenCalled();
    expect(mocks.deleteImport).not.toHaveBeenCalled();
  });

  it("deletes an incomplete import once it is past the import timeout", async () => {
    // A client that never sent its final batch (tab closed, network lost) leaves completedAt null.
    const reply = await deleteWith({ startedAt: startedHoursAgo(3), completedAt: null });

    expect(reply.statusCode).toBe(200);
    expect(mocks.chCommand).toHaveBeenCalledTimes(1);
    expect(mocks.deleteImport).toHaveBeenCalledWith(IMPORT_ID);
  });
});
