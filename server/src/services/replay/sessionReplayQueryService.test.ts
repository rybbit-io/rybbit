import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), command: vi.fn(), getBatch: vi.fn(), isEnabled: vi.fn() }));
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { query: mocks.query, command: mocks.command } }));
vi.mock("../../api/analytics/utils/utils.js", () => ({ processResults: (result: { rows: unknown[] }) => result.rows }));
vi.mock("../storage/r2StorageService.js", () => ({
  r2Storage: { isEnabled: mocks.isEnabled, getBatch: mocks.getBatch },
}));

import { SessionReplayQueryService } from "./sessionReplayQueryService.js";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isEnabled.mockReturnValue(true);
});

describe("session replay event ordering", () => {
  it("preserves sequence order for same-millisecond events across inline and R2 batches", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ session_id: "session" }] }).mockResolvedValueOnce({
      rows: [
        { timestamp: 1000, type: "2", data: "", event_data_key: "first", batch_index: 0, sequence_number: 0 },
        {
          timestamp: 1000,
          type: "3",
          data: '{"order":1}',
          event_data_key: null,
          batch_index: null,
          sequence_number: 1,
        },
        { timestamp: 1000, type: "3", data: "", event_data_key: "second", batch_index: 0, sequence_number: 2 },
      ],
    });
    mocks.getBatch.mockImplementation(async (key: string) => [{ order: key === "first" ? 0 : 2 }]);

    const result = await new SessionReplayQueryService().getSessionReplayEvents(1, "session");

    expect(result.events.map(event => event.data)).toEqual([{ order: 0 }, { order: 1 }, { order: 2 }]);
    expect(result.events.every(event => !("sequenceNumber" in event))).toBe(true);
    expect(mocks.query.mock.calls[1][0].query).toContain("sequence_number");
  });
});

describe("session replay deletion", () => {
  it.each([
    { retained: [] },
    { retained: [{ name: "session_replay_metadata" }, { name: "session_replay_metadata_v2_backfill" }] },
  ])("erases active metadata and any retained rollback copies: $retained", async ({ retained }) => {
    mocks.isEnabled.mockReturnValue(false);
    mocks.query.mockResolvedValue({ json: async () => retained });
    await new SessionReplayQueryService().deleteSessionReplay(7, "session");
    const queries = mocks.command.mock.calls.map(([command]) => command.query);
    for (const table of ["session_replay_metadata_v2", ...retained.map(row => row.name)]) {
      expect(queries).toContain(
        `DELETE FROM ${table} WHERE site_id = {siteId:UInt16} AND session_id = {sessionId:String}`
      );
    }
    expect(mocks.command).toHaveBeenCalledTimes(2 + retained.length);
    for (const [command] of mocks.command.mock.calls) {
      expect(command.query_params).toEqual({ siteId: 7, sessionId: "session" });
    }
  });
});
