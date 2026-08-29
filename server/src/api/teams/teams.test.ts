import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserIdFromRequest: vi.fn(),
  invalidateSitesAccessCache: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});

vi.mock("../../lib/auth-utils.js", () => ({
  getUserIdFromRequest: mocks.getUserIdFromRequest,
  invalidateSitesAccessCache: mocks.invalidateSitesAccessCache,
}));

import { db, sql as pgClient } from "../../db/postgres/postgres.js";
import { createTeam } from "./createTeam.js";
import { deleteTeam } from "./deleteTeam.js";
import { listTeams } from "./listTeams.js";
import { updateTeam } from "./updateTeam.js";

const DDL = `
CREATE TABLE "organization" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "createdAt" timestamp NOT NULL
);
CREATE TABLE "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL
);
CREATE TABLE "sites" (
  "site_id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "organization_id" text REFERENCES "organization"("id")
);
CREATE TABLE "member" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id"),
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "createdAt" timestamp NOT NULL,
  "has_restricted_site_access" boolean NOT NULL DEFAULT false
);
CREATE TABLE "team" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp
);
CREATE TABLE "teamMember" (
  "id" text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "createdAt" timestamp
);
CREATE TABLE "team_site_access" (
  "id" serial PRIMARY KEY,
  "team_id" text NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "site_id" integer NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("team_id", "site_id")
);
`;

function replyStub() {
  const reply: any = { statusCode: 200 };
  reply.status = (code: number) => {
    reply.statusCode = code;
    return reply;
  };
  reply.send = (body: unknown) => {
    reply.body = body;
    return reply;
  };
  return reply;
}

function requestStub(overrides: Record<string, unknown> = {}) {
  return {
    params: { organizationId: "org_1" },
    body: {},
    user: { id: "owner" },
    log: { error: vi.fn() },
    ...overrides,
  } as any;
}

async function rows(query: string) {
  return (await (pgClient as any).query(query)).rows;
}

beforeAll(async () => {
  await (pgClient as any).exec(DDL);
});

afterAll(async () => {
  await (pgClient as any).close();
});

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.getUserIdFromRequest.mockResolvedValue("member_1");

  await (pgClient as any).exec(`
    TRUNCATE "team_site_access", "teamMember", "team", "member", "sites", "user", "organization" RESTART IDENTITY;
    INSERT INTO "organization" ("id", "name", "slug", "createdAt") VALUES
      ('org_1', 'One', 'one', '2026-01-01'),
      ('org_2', 'Two', 'two', '2026-01-01');
    INSERT INTO "user" ("id", "name", "email") VALUES
      ('owner', 'Owner', 'owner@example.com'),
      ('member_1', 'Member One', 'one@example.com'),
      ('member_2', 'Member Two', 'two@example.com'),
      ('outsider', 'Outsider', 'outside@example.com');
    INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt") VALUES
      ('membership_owner', 'org_1', 'owner', 'owner', '2026-01-01'),
      ('membership_1', 'org_1', 'member_1', 'member', '2026-01-01'),
      ('membership_2', 'org_1', 'member_2', 'member', '2026-01-01'),
      ('membership_outsider', 'org_2', 'outsider', 'owner', '2026-01-01');
    INSERT INTO "sites" ("name", "domain", "organization_id") VALUES
      ('One A', 'a.example.com', 'org_1'),
      ('One B', 'b.example.com', 'org_1'),
      ('Other', 'other.example.com', 'org_2');
  `);
});

describe("createTeam", () => {
  it("creates a trimmed team, its members, and site grants atomically", async () => {
    const reply = replyStub();

    await createTeam(
      requestStub({
        body: { name: "  Product  ", memberUserIds: ["member_1", "member_2"], siteIds: [1, 2] },
      }),
      reply
    );

    expect(reply.statusCode).toBe(201);
    expect(reply.body).toMatchObject({
      id: expect.any(String),
      name: "Product",
      organizationId: "org_1",
      members: ["member_1", "member_2"],
      siteIds: [1, 2],
    });
    expect(await rows(`SELECT name, "organizationId" FROM team`)).toEqual([
      { name: "Product", organizationId: "org_1" },
    ]);
    expect(await rows(`SELECT "userId" FROM "teamMember" ORDER BY "userId"`)).toEqual([
      { userId: "member_1" },
      { userId: "member_2" },
    ]);
    expect(await rows(`SELECT site_id FROM team_site_access ORDER BY site_id`)).toEqual([
      { site_id: 1 },
      { site_id: 2 },
    ]);
    expect(mocks.invalidateSitesAccessCache.mock.calls).toEqual([["member_1"], ["member_2"]]);
  });

  it("rejects blank names before querying or writing", async () => {
    const reply = replyStub();
    const selectSpy = vi.spyOn(db, "select");

    await createTeam(requestStub({ body: { name: "   ", memberUserIds: ["member_1"] } }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: "Team name is required" });
    expect(selectSpy).not.toHaveBeenCalled();
    expect(await rows(`SELECT * FROM team`)).toEqual([]);
  });

  it("rejects users outside the organization without partially creating a team", async () => {
    const reply = replyStub();

    await createTeam(
      requestStub({ body: { name: "Product", memberUserIds: ["member_1", "outsider", "missing"] } }),
      reply
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: "Users not in organization: outsider, missing" });
    expect(await rows(`SELECT * FROM team`)).toEqual([]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("rejects sites outside the organization without partially creating a team", async () => {
    const reply = replyStub();

    await createTeam(
      requestStub({ body: { name: "Product", memberUserIds: ["member_1"], siteIds: [1, 3, 99] } }),
      reply
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: "Sites not in organization: 3, 99" });
    expect(await rows(`SELECT * FROM team`)).toEqual([]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("returns 500 and logs database failures", async () => {
    const request = requestStub({ body: { name: "Product", memberUserIds: ["member_1"] } });
    const reply = replyStub();
    vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("database offline");
    });

    await createTeam(request, reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ error: "Failed to create team" });
    expect(request.log.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Error creating team");
  });
});

describe("listTeams", () => {
  beforeEach(async () => {
    await (pgClient as any).exec(`
      INSERT INTO "team" ("id", "name", "organizationId", "createdAt", "updatedAt") VALUES
        ('team_a', 'Alpha', 'org_1', '2026-01-01', '2026-01-02'),
        ('team_b', 'Beta', 'org_1', '2026-02-01', '2026-02-02'),
        ('team_other', 'Other', 'org_2', '2026-03-01', '2026-03-02');
      INSERT INTO "teamMember" ("id", "teamId", "userId", "createdAt") VALUES
        ('tm_1', 'team_a', 'member_1', '2026-01-01'),
        ('tm_2', 'team_a', 'member_2', '2026-01-01'),
        ('tm_3', 'team_b', 'member_2', '2026-01-01'),
        ('tm_4', 'team_other', 'outsider', '2026-01-01');
      INSERT INTO "team_site_access" ("team_id", "site_id") VALUES
        ('team_a', 1), ('team_a', 2), ('team_other', 3);
    `);
  });

  it("returns every organization team with populated member and site details to owners", async () => {
    const reply = replyStub();

    await listTeams(requestStub(), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body.teams).toHaveLength(2);
    expect(reply.body.teams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "team_a",
          name: "Alpha",
          members: expect.arrayContaining([
            { userId: "member_1", userName: "Member One", userEmail: "one@example.com" },
            { userId: "member_2", userName: "Member Two", userEmail: "two@example.com" },
          ]),
          sites: expect.arrayContaining([
            { siteId: 1, domain: "a.example.com", name: "One A" },
            { siteId: 2, domain: "b.example.com", name: "One B" },
          ]),
        }),
        expect.objectContaining({
          id: "team_b",
          name: "Beta",
          members: [expect.objectContaining({ userId: "member_2" })],
          sites: [],
        }),
      ])
    );
    const alpha = reply.body.teams.find((entry: { id: string }) => entry.id === "team_a");
    expect(alpha.members).toHaveLength(2);
    expect(alpha.sites).toHaveLength(2);
  });

  it("limits ordinary members to their own teams", async () => {
    const reply = replyStub();

    await listTeams(requestStub({ user: { id: "member_1" } }), reply);

    expect(reply.body.teams).toHaveLength(1);
    expect(reply.body.teams[0]).toMatchObject({ id: "team_a", name: "Alpha" });
  });

  it("uses credential-derived identity when request.user is absent", async () => {
    const reply = replyStub();

    await listTeams(requestStub({ user: undefined }), reply);

    expect(mocks.getUserIdFromRequest).toHaveBeenCalledOnce();
    expect(reply.body.teams.map((entry: { id: string }) => entry.id)).toEqual(["team_a"]);
  });

  it("returns an empty collection when the member has no teams in the organization", async () => {
    const reply = replyStub();

    await listTeams(requestStub({ user: { id: "member_2" }, params: { organizationId: "org_2" } }), reply);

    expect(reply.body).toEqual({ teams: [] });
  });

  it("returns 500 and logs database failures", async () => {
    const request = requestStub();
    const reply = replyStub();
    vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("database offline");
    });

    await listTeams(request, reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ error: "Failed to list teams" });
    expect(request.log.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Error listing teams");
  });
});

describe("updateTeam", () => {
  beforeEach(async () => {
    await (pgClient as any).exec(`
      INSERT INTO "team" ("id", "name", "organizationId", "createdAt", "updatedAt")
        VALUES ('team_a', 'Alpha', 'org_1', '2026-01-01', '2026-01-02');
      INSERT INTO "teamMember" ("id", "teamId", "userId", "createdAt")
        VALUES ('tm_old', 'team_a', 'member_1', '2026-01-01');
      INSERT INTO "team_site_access" ("team_id", "site_id") VALUES ('team_a', 1);
    `);
  });

  it("replaces supplied fields and invalidates both removed and added members", async () => {
    const reply = replyStub();

    await updateTeam(
      requestStub({
        params: { organizationId: "org_1", teamId: "team_a" },
        body: { name: "  Renamed  ", memberUserIds: ["member_2"], siteIds: [2] },
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ success: true });
    expect(await rows(`SELECT name FROM team WHERE id = 'team_a'`)).toEqual([{ name: "Renamed" }]);
    expect(await rows(`SELECT "userId" FROM "teamMember" WHERE "teamId" = 'team_a'`)).toEqual([{ userId: "member_2" }]);
    expect(await rows(`SELECT site_id FROM team_site_access WHERE team_id = 'team_a'`)).toEqual([{ site_id: 2 }]);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledTimes(2);
    expect(mocks.invalidateSitesAccessCache.mock.calls).toEqual(expect.arrayContaining([["member_1"], ["member_2"]]));
  });

  it("preserves members and sites when those fields are omitted", async () => {
    const reply = replyStub();

    await updateTeam(
      requestStub({ params: { organizationId: "org_1", teamId: "team_a" }, body: { name: "Renamed" } }),
      reply
    );

    expect(await rows(`SELECT "userId" FROM "teamMember"`)).toEqual([{ userId: "member_1" }]);
    expect(await rows(`SELECT site_id FROM team_site_access`)).toEqual([{ site_id: 1 }]);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledOnce();
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledWith("member_1");
  });

  it("clears members and sites when supplied empty arrays", async () => {
    const reply = replyStub();

    await updateTeam(
      requestStub({
        params: { organizationId: "org_1", teamId: "team_a" },
        body: { memberUserIds: [], siteIds: [] },
      }),
      reply
    );

    expect(await rows(`SELECT * FROM "teamMember"`)).toEqual([]);
    expect(await rows(`SELECT * FROM team_site_access`)).toEqual([]);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledWith("member_1");
  });

  it("returns 404 for a missing team or a team in another organization", async () => {
    for (const params of [
      { organizationId: "org_1", teamId: "missing" },
      { organizationId: "org_2", teamId: "team_a" },
    ]) {
      const reply = replyStub();
      await updateTeam(requestStub({ params, body: { name: "Nope" } }), reply);
      expect(reply.statusCode).toBe(404);
      expect(reply.body).toEqual({ error: "Team not found" });
    }
    expect(await rows(`SELECT name FROM team WHERE id = 'team_a'`)).toEqual([{ name: "Alpha" }]);
  });

  it("rejects members and sites outside the organization without mutating the team", async () => {
    const memberReply = replyStub();
    await updateTeam(
      requestStub({
        params: { organizationId: "org_1", teamId: "team_a" },
        body: { name: "Nope", memberUserIds: ["outsider"] },
      }),
      memberReply
    );
    expect(memberReply.statusCode).toBe(400);
    expect(memberReply.body).toEqual({ error: "Users not in organization: outsider" });

    const siteReply = replyStub();
    await updateTeam(
      requestStub({
        params: { organizationId: "org_1", teamId: "team_a" },
        body: { name: "Nope", siteIds: [3] },
      }),
      siteReply
    );
    expect(siteReply.statusCode).toBe(400);
    expect(siteReply.body).toEqual({ error: "Sites not in organization: 3" });
    expect(await rows(`SELECT name FROM team WHERE id = 'team_a'`)).toEqual([{ name: "Alpha" }]);
  });

  it("returns 500 and logs database failures", async () => {
    const request = requestStub({ params: { organizationId: "org_1", teamId: "team_a" } });
    const reply = replyStub();
    vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("database offline");
    });

    await updateTeam(request, reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ error: "Failed to update team" });
    expect(request.log.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Error updating team");
  });
});

describe("deleteTeam", () => {
  beforeEach(async () => {
    await (pgClient as any).exec(`
      INSERT INTO "team" ("id", "name", "organizationId", "createdAt")
        VALUES ('team_a', 'Alpha', 'org_1', '2026-01-01');
      INSERT INTO "teamMember" ("id", "teamId", "userId") VALUES
        ('tm_1', 'team_a', 'member_1'), ('tm_2', 'team_a', 'member_2');
      INSERT INTO "team_site_access" ("team_id", "site_id") VALUES ('team_a', 1);
    `);
  });

  it("deletes the team with cascading relationships and invalidates affected users", async () => {
    const reply = replyStub();

    await deleteTeam(requestStub({ params: { organizationId: "org_1", teamId: "team_a" } }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ success: true });
    expect(await rows(`SELECT * FROM team`)).toEqual([]);
    expect(await rows(`SELECT * FROM "teamMember"`)).toEqual([]);
    expect(await rows(`SELECT * FROM team_site_access`)).toEqual([]);
    expect(mocks.invalidateSitesAccessCache.mock.calls).toEqual([["member_1"], ["member_2"]]);
  });

  it("does not expose or delete a team through the wrong organization", async () => {
    const reply = replyStub();

    await deleteTeam(requestStub({ params: { organizationId: "org_2", teamId: "team_a" } }), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body).toEqual({ error: "Team not found" });
    expect(await rows(`SELECT id FROM team`)).toEqual([{ id: "team_a" }]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("returns 500 and logs database failures", async () => {
    const request = requestStub({ params: { organizationId: "org_1", teamId: "team_a" } });
    const reply = replyStub();
    vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("database offline");
    });

    await deleteTeam(request, reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ error: "Failed to delete team" });
    expect(request.log.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Error deleting team");
  });
});
