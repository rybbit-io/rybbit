import { beforeEach, describe, expect, it, vi } from "vitest";
import { toClickHouseDateTime } from "../../db/clickhouse/dateTime.js";
import type { RecordSessionReplayRequest } from "../../types/sessionReplay.js";

const mocks = vi.hoisted(() => ({
  generateUserId: vi.fn(),
  insert: vi.fn(),
  updateSession: vi.fn(),
  chargeReplaySessionBudget: vi.fn(),
  storeBatch: vi.fn(),
  r2Enabled: false,
}));

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: {
    insert: mocks.insert,
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
    isEnabled: () => mocks.r2Enabled,
    storeBatch: mocks.storeBatch,
  },
}));

vi.mock("./replaySessionBudget.js", () => ({
  chargeReplaySessionBudget: mocks.chargeReplaySessionBudget,
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
    mocks.chargeReplaySessionBudget.mockResolvedValue({ accepted: true, usedBytes: 0 });
    mocks.r2Enabled = false;
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
});

describe("SessionReplayIngestService size cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateUserId.mockResolvedValue("fingerprint");
    mocks.updateSession.mockResolvedValue({ sessionId: "session-1" });
    mocks.insert.mockResolvedValue(undefined);
    mocks.storeBatch.mockResolvedValue("r2-key");
    mocks.r2Enabled = true;
  });

  it("charges the serialized size of the batch against its session", async () => {
    mocks.chargeReplaySessionBudget.mockResolvedValue({ accepted: true, usedBytes: 100 });
    const service = new SessionReplayIngestService();
    const request: RecordSessionReplayRequest = {
      userId: "",
      events: [
        { type: 2, data: { a: 1 }, timestamp: 1_700_000_000_000 },
        { type: 3, data: { bb: "xy" }, timestamp: 1_700_000_000_100 },
      ],
    };

    const result = await service.recordEvents(42, request, requestMeta);

    const expectedBytes = JSON.stringify({ a: 1 }).length + JSON.stringify({ bb: "xy" }).length;
    expect(mocks.chargeReplaySessionBudget).toHaveBeenCalledWith(42, "session-1", expectedBytes);
    expect(result).toEqual({ capped: false });
    expect(mocks.storeBatch).toHaveBeenCalledOnce();
    expect(
      mocks.insert.mock.calls[0][0].values.map((row: { event_size_bytes: number }) => row.event_size_bytes)
    ).toEqual([JSON.stringify({ a: 1 }).length, JSON.stringify({ bb: "xy" }).length]);
  });

  it("stores nothing once the session is over its cap", async () => {
    mocks.chargeReplaySessionBudget.mockResolvedValue({ accepted: false, usedBytes: 60_000_000 });
    const service = new SessionReplayIngestService();

    const result = await service.recordEvents(
      42,
      {
        userId: "",
        events: [{ type: 2, data: { a: 1 }, timestamp: 1_700_000_000_000 }],
        metadata: { pageUrl: "https://example.com/" },
      },
      requestMeta
    );

    expect(result).toEqual({ capped: true });
    expect(mocks.storeBatch).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("SessionReplayIngestService batch serialization", () => {
  // Inside the clock-skew window, so the batch is stored as sent.
  const base = Date.now() - 60_000;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateUserId.mockResolvedValue("fingerprint");
    mocks.updateSession.mockResolvedValue({ sessionId: "session-1" });
    mocks.insert.mockResolvedValue(undefined);
    mocks.chargeReplaySessionBudget.mockResolvedValue({ accepted: true, usedBytes: 0 });
    mocks.storeBatch.mockResolvedValue("r2-key");
    mocks.r2Enabled = true;
  });

  it("hands R2 the per-event strings, which join to the serialized data array", async () => {
    const service = new SessionReplayIngestService();
    const events = [
      { type: 2, data: { node: { id: 1, textContent: 'quote " and é' } }, timestamp: base },
      { type: 3, data: { source: 1, positions: [{ x: 1, y: 2 }] }, timestamp: base + 10 },
      { type: 4, data: null, timestamp: base + 20 },
    ];

    await service.recordEvents(42, { userId: "", events }, requestMeta);

    const serialized: string[] = mocks.storeBatch.mock.calls[0][2];
    expect(serialized).toEqual(events.map(event => JSON.stringify(event.data)));
    expect(`[${serialized.join(",")}]`).toBe(JSON.stringify(events.map(event => event.data)));
    expect(mocks.insert.mock.calls[0][0].values.map((row: { event_data_key: string }) => row.event_data_key)).toEqual([
      "r2-key",
      "r2-key",
      "r2-key",
    ]);
  });

  it("bounds the metadata row by the earliest and latest event, whatever their order", async () => {
    const service = new SessionReplayIngestService();
    const events = [
      { type: 3, data: {}, timestamp: base + 500 },
      { type: 3, data: {}, timestamp: base },
      { type: 3, data: {}, timestamp: base + 900 },
      { type: 3, data: {}, timestamp: base + 100 },
    ];

    await service.recordEvents(42, { userId: "", events, metadata: { pageUrl: "https://example.com/" } }, requestMeta);

    const metadataRow = mocks.insert.mock.calls[1][0].values[0];
    expect(metadataRow.start_time).toBe(toClickHouseDateTime(new Date(base)));
    expect(metadataRow.end_time).toBe(toClickHouseDateTime(new Date(base + 900)));
    expect(metadataRow.event_count).toBe(4);
  });

  it("records a batch too large to spread into Math.min", async () => {
    // Math.min(...timestamps) overflows the call stack somewhere past ~120k
    // arguments; a small-event batch that size still fits the body limit.
    const service = new SessionReplayIngestService();
    const events = Array.from({ length: 200_000 }, (_, index) => ({ type: 3, data: {}, timestamp: base + index }));

    await service.recordEvents(42, { userId: "", events, metadata: { pageUrl: "https://example.com/" } }, requestMeta);

    const metadataRow = mocks.insert.mock.calls[1][0].values[0];
    expect(metadataRow.start_time).toBe(toClickHouseDateTime(new Date(base)));
    expect(metadataRow.end_time).toBe(toClickHouseDateTime(new Date(base + 199_999)));
  });
});
