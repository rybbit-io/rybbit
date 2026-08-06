import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordSessionReplayRequest } from "../../types/sessionReplay.js";

const mocks = vi.hoisted(() => ({
  generateUserId: vi.fn(),
  insert: vi.fn(),
  updateSession: vi.fn(),
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
    isEnabled: () => false,
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
