import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  command: vi.fn(async () => ({})),
  aliases: [] as { anonymousId: string }[],
}));

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { command: mocks.command, query: vi.fn() } }));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => mocks.aliases }) }),
    delete: () => ({ where: async () => undefined }),
  },
}));
vi.mock("../../../services/storage/r2StorageService.js", () => ({ r2Storage: { isEnabled: () => false } }));

import { deleteUser } from "./deleteUser.js";

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.aliases = [];
  app = Fastify();
  app.delete("/sites/:siteId/users/:userId", deleteUser);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe("deleteUser", () => {
  it("refuses an empty user id without touching ClickHouse", async () => {
    const response = await app.inject({ method: "DELETE", url: "/sites/1/users/" });
    expect(response.statusCode).toBe(400);
    expect(mocks.command).not.toHaveBeenCalled();
  });

  it("still erases a whitespace identity, which identify() accepts", async () => {
    const response = await app.inject({ method: "DELETE", url: "/sites/1/users/%20%20" });
    expect(response.statusCode).toBe(200);
    expect(mocks.command).toHaveBeenCalledTimes(3);
  });

  it("deletes only the user's rows and never matches the empty id", async () => {
    mocks.aliases = [{ anonymousId: "device-1" }, { anonymousId: "" }];
    const response = await app.inject({ method: "DELETE", url: "/sites/1/users/user-42" });

    expect(response.statusCode).toBe(200);
    expect(mocks.command).toHaveBeenCalledTimes(3);
    for (const [call] of mocks.command.mock.calls as unknown as [
      { query: string; query_params: Record<string, unknown> },
    ][]) {
      expect(call.query).toContain("{userId:String} != ''");
      expect(call.query_params).toEqual({ siteId: 1, userId: "user-42", deviceIds: ["user-42", "device-1"] });
    }
  });
});
