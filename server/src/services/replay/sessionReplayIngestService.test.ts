import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordSessionReplayRequest } from "../../types/sessionReplay.js";

const mocks = vi.hoisted(() => ({
  generateUserId: vi.fn(),
  insert: vi.fn(),
  query: vi.fn(),
  updateSession: vi.fn(),
  withReplayMetadataLock: vi.fn(),
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
    isEnabled: () => false,
  },
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {},
}));

vi.mock("./replayMetadataLock.js", () => ({
  withReplayMetadataLock: mocks.withReplayMetadataLock,
}));

import { SessionReplayIngestService, SessionReplayMetadataUpdateError } from "./sessionReplayIngestService.js";

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
    mocks.withReplayMetadataLock.mockImplementation(
      async (_siteId: number, _sessionId: string, operation: () => Promise<unknown>) => operation()
    );
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

  it("rolls replay metadata forward without rescanning raw replay events", async () => {
    mocks.query.mockResolvedValue({
      json: async () => [
        {
          start_time: "2023-11-14 22:13:20",
          end_time: "2023-11-14 22:13:21",
          event_count: 10,
          compressed_size_bytes: 1000,
          screen_width: 1280,
          screen_height: 720,
          created_at: "2023-11-14 22:13:21",
        },
      ],
    });

    const service = new SessionReplayIngestService();
    await service.recordEvents(
      42,
      {
        userId: "employee-alice",
        events: [
          { type: 2, data: { value: "first" }, timestamp: 1_700_000_002_000 },
          { type: 3, data: { value: "second" }, timestamp: 1_700_000_003_000 },
        ],
        metadata: {
          pageUrl: "https://internal.example/page",
          viewportWidth: 1920,
          viewportHeight: 1080,
          language: "en-US",
        },
      },
      { ...requestMeta, userAgent: "" }
    );

    expect(mocks.query).toHaveBeenCalledTimes(1);
    const metadataQuery = mocks.query.mock.calls[0][0].query;
    expect(metadataQuery).toContain("FROM session_replay_metadata FINAL");
    expect(metadataQuery).not.toContain("FROM session_replay_events");
    expect(mocks.withReplayMetadataLock).toHaveBeenCalledTimes(1);

    const metadataInsert = mocks.insert.mock.calls.find(call => call[0].table === "session_replay_metadata");
    expect(metadataInsert?.[0].values[0]).toMatchObject({
      event_count: 12,
      compressed_size_bytes: 1035,
      screen_width: 1920,
      screen_height: 1080,
    });
    expect(metadataInsert?.[0].values[0].created_at).toBeDefined();
  });

  it("serializes concurrent metadata rollups so both batches are retained", async () => {
    type StoredMetadata = {
      start_time: string;
      end_time: string | null;
      event_count: number;
      compressed_size_bytes: number;
      screen_width: number;
      screen_height: number;
      created_at: string;
      [key: string]: unknown;
    };

    const lockTails = new Map<string, Promise<void>>();
    mocks.withReplayMetadataLock.mockImplementation(
      async (siteId: number, sessionId: string, operation: () => Promise<unknown>) => {
        const key = `${siteId}:${sessionId}`;
        const previous = lockTails.get(key) ?? Promise.resolve();
        let release!: () => void;
        const gate = new Promise<void>(resolve => {
          release = resolve;
        });
        const tail = previous.then(() => gate);
        lockTails.set(key, tail);

        await previous;
        try {
          return await operation();
        } finally {
          release();
          if (lockTails.get(key) === tail) lockTails.delete(key);
        }
      }
    );

    let storedMetadata: StoredMetadata | undefined;
    mocks.query.mockImplementation(async () => ({
      json: async () => (storedMetadata ? [storedMetadata] : []),
    }));
    mocks.insert.mockImplementation(async (insert: { table: string; values: Array<Record<string, unknown>> }) => {
      if (insert.table === "session_replay_metadata") {
        storedMetadata = { ...insert.values[0] } as StoredMetadata;
      }
    });

    const makeRequest = (timestamp: number): RecordSessionReplayRequest => ({
      userId: "employee-alice",
      events: [{ type: 2, data: { timestamp }, timestamp }],
      metadata: {
        pageUrl: "https://internal.example/page",
        viewportWidth: 1920,
        viewportHeight: 1080,
        language: "en-US",
      },
    });

    const service = new SessionReplayIngestService();
    await Promise.all([
      service.recordEvents(42, makeRequest(1_700_000_000_000), { ...requestMeta, userAgent: "" }),
      service.recordEvents(42, makeRequest(1_700_000_001_000), { ...requestMeta, userAgent: "" }),
    ]);

    expect(mocks.withReplayMetadataLock).toHaveBeenCalledTimes(2);
    expect(storedMetadata).toMatchObject({ event_count: 2 });
  });

  it("classifies metadata query failures", async () => {
    mocks.query.mockRejectedValueOnce(new Error("ClickHouse unavailable"));

    const service = new SessionReplayIngestService();
    await expect(
      service.recordEvents(
        42,
        {
          ...replayRequest("employee-alice"),
          metadata: {
            pageUrl: "https://internal.example/page",
            viewportWidth: 1920,
            viewportHeight: 1080,
            language: "en-US",
          },
        },
        requestMeta
      )
    ).rejects.toBeInstanceOf(SessionReplayMetadataUpdateError);
  });
});
