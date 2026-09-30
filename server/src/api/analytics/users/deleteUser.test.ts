import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), command: vi.fn(), deleteWhere: vi.fn() }));
vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: mocks.query, command: mocks.command },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => [{ anonymousId: "device" }] }) }),
    delete: () => ({ where: mocks.deleteWhere }),
  },
}));
vi.mock("../../../services/storage/r2StorageService.js", () => ({ r2Storage: { isEnabled: () => false } }));

import { deleteUser, type DeleteUserRequest } from "./deleteUser.js";

function request() {
  return {
    params: { siteId: "7", userId: "person" },
    log: { error: vi.fn() },
  } as unknown as FastifyRequest<DeleteUserRequest>;
}
function reply() {
  const response = { status: vi.fn(), send: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.command.mockResolvedValue(undefined);
  mocks.deleteWhere.mockResolvedValue(undefined);
});

describe("user privacy deletion during replay migration", () => {
  it.each([
    { retained: [] },
    { retained: [{ name: "session_replay_metadata" }, { name: "session_replay_metadata_v2_backfill" }] },
  ])("deletes user metadata from active and existing rollback copies: $retained", async ({ retained }) => {
    mocks.query.mockResolvedValue({ json: async () => retained });
    const response = reply();
    await deleteUser(request(), response as unknown as FastifyReply);
    expect(response.send).toHaveBeenCalledWith({ success: true });
    const commands = mocks.command.mock.calls.map(([command]) => command);
    for (const table of [
      "events",
      "session_replay_events",
      "session_replay_metadata_v2",
      ...retained.map(row => row.name),
    ]) {
      const command = commands.find(command => command.query.startsWith(`DELETE FROM ${table} WHERE `));
      expect(command).toBeDefined();
      expect(command.query).toContain("identified_user_id = {userId:String}");
      expect(command.query).toContain("user_id IN ({deviceIds:Array(String)}) AND identified_user_id = ''");
      expect(command.query_params).toEqual({ siteId: 7, userId: "person", deviceIds: ["person", "device"] });
    }
    expect(commands).toHaveLength(3 + retained.length);
    expect(mocks.deleteWhere).toHaveBeenCalledTimes(2);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("database = currentDatabase()"),
        query_params: { tables: ["session_replay_metadata", "session_replay_metadata_v2_backfill"] },
      })
    );
  });
  it("fails closed without erasing aliases if retained-table discovery fails", async () => {
    mocks.query.mockRejectedValueOnce(new Error("discovery failed"));
    const response = reply();
    await deleteUser(request(), response as unknown as FastifyReply);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(mocks.deleteWhere).not.toHaveBeenCalled();
  });
});
