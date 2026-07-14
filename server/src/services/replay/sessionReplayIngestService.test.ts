import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordSessionReplayRequest } from "../../types/sessionReplay.js";

const mocks = vi.hoisted(() => ({
  generateUserId: vi.fn(),
  insert: vi.fn(),
  query: vi.fn(),
  r2Enabled: vi.fn(),
  storeBatch: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: {
    insert: mocks.insert,
    query: mocks.query,
  },
}));

vi.mock("../sessions/sessionsService.js", () => ({
  sessionsService: {
    updateSession: mocks.updateSession,
  },
}));

vi.mock("../userId/userIdService.js", () => ({
  userIdService: {
    generateUserId: mocks.generateUserId,
  },
}));

vi.mock("../storage/r2StorageService.js", () => ({
  r2Storage: {
    isEnabled: mocks.r2Enabled,
    storeBatch: mocks.storeBatch,
  },
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {},
}));

import { SessionReplayIngestService } from "./sessionReplayIngestService.js";

const requestMeta = {
  ipAddress: "198.51.100.10",
  userAgent: "Standardized Corporate Browser/1.0",
  origin: "https://internal.example",
  referrer: "",
};

function replayRequest(identifiedUserId: string): RecordSessionReplayRequest {
  return {
    userId: identifiedUserId,
    events: [{ type: 2, data: { user: identifiedUserId }, timestamp: 1_700_000_000_000 }],
  };
}

describe("SessionReplayIngestService identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateUserId.mockResolvedValue("shared-fingerprint");
    mocks.updateSession.mockImplementation(
      async ({ userId, identifiedUserId }: { userId: string; identifiedUserId?: string }) => ({
        sessionId: `session-${userId}-${identifiedUserId || "anonymous"}`,
      })
    );
    mocks.insert.mockResolvedValue(undefined);
    mocks.query.mockResolvedValue({ json: async () => [] });
    mocks.r2Enabled.mockReturnValue(false);
    mocks.storeBatch.mockResolvedValue("unused");
  });

  it("separates identified replay users behind a shared proxy", async () => {
    const service = new SessionReplayIngestService();

    await service.recordEvents(42, replayRequest("employee-alice"), requestMeta);
    await service.recordEvents(42, replayRequest("employee-bob"), requestMeta);

    expect(mocks.updateSession).toHaveBeenNthCalledWith(1, {
      userId: "shared-fingerprint",
      identifiedUserId: "employee-alice",
      siteId: 42,
    });
    expect(mocks.updateSession).toHaveBeenNthCalledWith(2, {
      userId: "shared-fingerprint",
      identifiedUserId: "employee-bob",
      siteId: 42,
    });

    const insertedRows = mocks.insert.mock.calls.flatMap(call => call[0].values);
    expect(new Set(insertedRows.map(row => row.user_id))).toEqual(new Set(["shared-fingerprint"]));
    expect(new Set(insertedRows.map(row => row.identified_user_id))).toEqual(
      new Set(["employee-alice", "employee-bob"])
    );
    expect(new Set(insertedRows.map(row => row.session_id)).size).toBe(2);
  });

  it("retains the existing anonymous replay session key", async () => {
    const service = new SessionReplayIngestService();

    await service.recordEvents(42, replayRequest(""), requestMeta);

    expect(mocks.generateUserId).toHaveBeenCalledWith(requestMeta.ipAddress, requestMeta.userAgent, 42);
    expect(mocks.updateSession).toHaveBeenCalledWith({
      userId: "shared-fingerprint",
      identifiedUserId: "",
      siteId: 42,
    });
  });

  it("stores a stable batch id and the recorder's global sequence number", async () => {
    const service = new SessionReplayIngestService();
    await service.recordEvents(
      42,
      {
        batchId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
        userId: "employee-alice",
        events: [{ type: 3, data: { ordered: true }, timestamp: 1_700_000_000_000, sequence: 73 }],
      },
      requestMeta
    );

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        clickhouse_settings: {
          insert_deduplication_token: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
        values: [
          expect.objectContaining({
            batch_id: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
            batch_index: 0,
            sequence_number: 73,
          }),
        ],
      })
    );
  });

  it("does not insert a replay batch whose indices are already stored", async () => {
    mocks.query.mockResolvedValue({ json: async () => [{ session_id: "original-session", batch_index: 0 }] });
    const service = new SessionReplayIngestService();

    await service.recordEvents(
      42,
      {
        batchId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
        userId: "employee-alice",
        events: [{ type: 3, data: { ordered: true }, timestamp: 1_700_000_000_000, sequence: 73 }],
      },
      requestMeta
    );

    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("deduplicates a retry even when session resolution would return a different session", async () => {
    mocks.updateSession.mockResolvedValue({ sessionId: "new-session" });
    mocks.query.mockImplementation(async options => ({
      json: async () =>
        "sessionId" in options.query_params ? [] : [{ session_id: "original-session", batch_index: 0 }],
    }));
    const service = new SessionReplayIngestService();

    await service.recordEvents(
      42,
      {
        batchId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
        userId: "employee-alice",
        events: [{ type: 3, data: { ordered: true }, timestamp: 1_700_000_000_000, sequence: 73 }],
      },
      requestMeta
    );

    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("uses the stable batch id in the R2 object key", async () => {
    mocks.r2Enabled.mockReturnValue(true);
    mocks.storeBatch.mockResolvedValue("42/session/batch.json.zst");
    const service = new SessionReplayIngestService();

    await service.recordEvents(
      42,
      {
        batchId: "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
        userId: "employee-alice",
        events: [{ type: 3, data: { ordered: true }, timestamp: 1_700_000_000_000, sequence: 73 }],
      },
      requestMeta
    );

    expect(mocks.storeBatch).toHaveBeenCalledWith(
      42,
      "session-shared-fingerprint-employee-alice",
      "76c8fb17-e7b5-41f7-b4f9-a21a4efca1d4",
      [{ ordered: true }]
    );
  });
});
