import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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
  invalidateSitesAccessCache: mocks.invalidateSitesAccessCache,
}));

import { db, sql as pgClient } from "../../db/postgres/postgres.js";
import { updateMemberSiteAccess } from "./updateMemberSiteAccess.js";

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
CREATE TABLE "member_site_access" (
  "id" serial PRIMARY KEY,
  "member_id" text NOT NULL REFERENCES "member"("id") ON DELETE CASCADE,
  "site_id" integer NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  UNIQUE ("member_id", "site_id")
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
    params: { organizationId: "org_1", memberId: "membership_member" },
    body: { hasRestrictedSiteAccess: true, siteIds: [1] },
    user: { id: "admin" },
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

  await (pgClient as any).exec(`
    TRUNCATE "member_site_access", "member", "sites", "user", "organization" RESTART IDENTITY;
    INSERT INTO "organization" ("id", "name", "slug", "createdAt") VALUES
      ('org_1', 'One', 'one', '2026-01-01'),
      ('org_2', 'Two', 'two', '2026-01-01');
    INSERT INTO "user" ("id", "name", "email") VALUES
      ('admin', 'Admin', 'admin@example.com'),
      ('member_user', 'Member', 'member@example.com'),
      ('admin_user', 'Another Admin', 'another-admin@example.com'),
      ('owner_user', 'Owner', 'owner@example.com'),
      ('other_user', 'Other Member', 'other@example.com');
    INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt", "has_restricted_site_access") VALUES
      ('membership_admin_actor', 'org_1', 'admin', 'admin', '2026-01-01', false),
      ('membership_member', 'org_1', 'member_user', 'member', '2026-01-01', true),
      ('membership_admin', 'org_1', 'admin_user', 'admin', '2026-01-01', false),
      ('membership_owner', 'org_1', 'owner_user', 'owner', '2026-01-01', false),
      ('membership_other', 'org_2', 'other_user', 'member', '2026-01-01', false);
    INSERT INTO "sites" ("name", "domain", "organization_id") VALUES
      ('One A', 'a.example.com', 'org_1'),
      ('One B', 'b.example.com', 'org_1'),
      ('Other', 'other.example.com', 'org_2');
    INSERT INTO "member_site_access" ("member_id", "site_id", "created_by")
      VALUES ('membership_member', 1, 'admin');
  `);
});

describe("updateMemberSiteAccess", () => {
  it("replaces grants, records the acting user, and returns site metadata", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestStub({ body: { hasRestrictedSiteAccess: true, siteIds: [2] } }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      memberId: "membership_member",
      hasRestrictedSiteAccess: true,
      siteAccess: [{ siteId: 2, name: "One B", domain: "b.example.com" }],
    });
    expect(await rows(`SELECT has_restricted_site_access FROM member WHERE id = 'membership_member'`)).toEqual([
      { has_restricted_site_access: true },
    ]);
    expect(await rows(`SELECT site_id, created_by FROM member_site_access`)).toEqual([
      { site_id: 2, created_by: "admin" },
    ]);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledOnce();
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledWith("member_user");
  });

  it("supports multiple same-organization grants", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestStub({ body: { hasRestrictedSiteAccess: true, siteIds: [1, 2] } }), reply);

    expect(reply.body.siteAccess).toEqual([
      { siteId: 1, name: "One A", domain: "a.example.com" },
      { siteId: 2, name: "One B", domain: "b.example.com" },
    ]);
    expect(await rows(`SELECT site_id FROM member_site_access ORDER BY site_id`)).toEqual([
      { site_id: 1 },
      { site_id: 2 },
    ]);
  });

  it("can restrict a member to no sites", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestStub({ body: { hasRestrictedSiteAccess: true, siteIds: [] } }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      memberId: "membership_member",
      hasRestrictedSiteAccess: true,
      siteAccess: [],
    });
    expect(await rows(`SELECT * FROM member_site_access`)).toEqual([]);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledWith("member_user");
  });

  it("unrestricts a member and clears every prior explicit grant", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestStub({ body: { hasRestrictedSiteAccess: false, siteIds: [] } }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body.siteAccess).toEqual([]);
    expect(await rows(`SELECT has_restricted_site_access FROM member WHERE id = 'membership_member'`)).toEqual([
      { has_restricted_site_access: false },
    ]);
    expect(await rows(`SELECT * FROM member_site_access`)).toEqual([]);
  });

  it("stores null audit attribution when authentication did not populate request.user", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(
      requestStub({ user: undefined, body: { hasRestrictedSiteAccess: true, siteIds: [2] } }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(await rows(`SELECT site_id, created_by FROM member_site_access`)).toEqual([
      { site_id: 2, created_by: null },
    ]);
  });

  it("returns 404 for an unknown member or a member in another organization", async () => {
    for (const params of [
      { organizationId: "org_1", memberId: "missing" },
      { organizationId: "org_1", memberId: "membership_other" },
      { organizationId: "org_2", memberId: "membership_member" },
    ]) {
      const reply = replyStub();
      await updateMemberSiteAccess(requestStub({ params }), reply);

      expect(reply.statusCode).toBe(404);
      expect(reply.body).toEqual({ error: "Member not found" });
    }
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("rejects restricting admins and owners without changing their records", async () => {
    for (const memberId of ["membership_admin", "membership_owner"]) {
      const reply = replyStub();
      await updateMemberSiteAccess(requestStub({ params: { organizationId: "org_1", memberId } }), reply);

      expect(reply.statusCode).toBe(400);
      expect(reply.body).toEqual({ error: "Cannot restrict site access for admin or owner roles" });
    }
    expect(
      await rows(`SELECT id, has_restricted_site_access FROM member WHERE role IN ('admin', 'owner') ORDER BY id`)
    ).toEqual([
      { id: "membership_admin", has_restricted_site_access: false },
      { id: "membership_admin_actor", has_restricted_site_access: false },
      { id: "membership_owner", has_restricted_site_access: false },
    ]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("rejects foreign and nonexistent site IDs without changing existing access", async () => {
    const reply = replyStub();
    await (pgClient as any).exec(`UPDATE member SET has_restricted_site_access = false WHERE id = 'membership_member'`);

    await updateMemberSiteAccess(requestStub({ body: { hasRestrictedSiteAccess: true, siteIds: [1, 3, 99] } }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({
      error: "Invalid site IDs: 3, 99. Sites must belong to this organization.",
    });
    expect(await rows(`SELECT has_restricted_site_access FROM member WHERE id = 'membership_member'`)).toEqual([
      { has_restricted_site_access: false },
    ]);
    expect(await rows(`SELECT site_id FROM member_site_access`)).toEqual([{ site_id: 1 }]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("rolls back the flag and grants when replacement insertion fails", async () => {
    const request = requestStub({
      user: { id: "missing-actor" },
      body: { hasRestrictedSiteAccess: true, siteIds: [2] },
    });
    const reply = replyStub();
    await (pgClient as any).exec(`UPDATE member SET has_restricted_site_access = false WHERE id = 'membership_member'`);

    await updateMemberSiteAccess(request, reply);

    expect(reply.statusCode).toBe(500);
    expect(await rows(`SELECT has_restricted_site_access FROM member WHERE id = 'membership_member'`)).toEqual([
      { has_restricted_site_access: false },
    ]);
    expect(await rows(`SELECT site_id, created_by FROM member_site_access`)).toEqual([
      { site_id: 1, created_by: "admin" },
    ]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("does not retain submitted site IDs when switching to unrestricted access", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestStub({ body: { hasRestrictedSiteAccess: false, siteIds: [1] } }), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body.siteAccess).toEqual([]);
    expect(await rows(`SELECT * FROM member_site_access`)).toEqual([]);
  });

  it("returns 500 and logs database failures", async () => {
    const request = requestStub();
    const reply = replyStub();
    vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("database offline");
    });

    await updateMemberSiteAccess(request, reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ error: "Failed to update member site access" });
    expect(request.log.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Error updating member site access");
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });
});
