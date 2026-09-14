import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invalidateSitesAccessCache: vi.fn() }));

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

import { sql as pgClient } from "../../db/postgres/postgres.js";
import {
  deleteAdminOrganizationMember,
  getAdminOrganizationOptions,
  updateAdminOrganizationMember,
  updateAdminSubscriptionOverride,
} from "./adminOrganizationManagement.js";

const DDL = `
CREATE TABLE "organization" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "createdAt" timestamp NOT NULL,
  "planOverride" text,
  "custom_plan" jsonb
);
CREATE TABLE "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "role" text NOT NULL DEFAULT 'user',
  "banned" boolean,
  "banReason" text,
  "banExpires" timestamp
);
CREATE TABLE "sites" (
  "site_id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "organization_id" text
);
CREATE TABLE "member" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "has_restricted_site_access" boolean NOT NULL DEFAULT false
);
CREATE TABLE "member_site_access" (
  "id" serial PRIMARY KEY,
  "member_id" text NOT NULL REFERENCES "member"("id") ON DELETE CASCADE,
  "site_id" integer NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" text
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

function requestStub(overrides: Record<string, unknown>) {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: "system_admin" },
    log: { error: vi.fn() },
    ...overrides,
  } as any;
}

beforeAll(async () => {
  await (pgClient as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (pgClient as any).exec(`
    TRUNCATE "member_site_access", "member", "sites", "user", "organization" RESTART IDENTITY;
    INSERT INTO "organization" ("id","name","slug","createdAt","planOverride","custom_plan") VALUES
      ('org_old','Old Org','old','2026-01-01',NULL,NULL),
      ('org_new','New Org','new','2026-08-01','pro1m','{"events":5000,"members":2,"websites":3}');
    INSERT INTO "user" ("id","name","email","role") VALUES
      ('u_owner','Owner','owner@example.com','user'),
      ('u_member','Member','member@example.com','user');
    INSERT INTO "sites" ("name","domain","organization_id") VALUES
      ('Old Site','old.example.com','org_old'),
      ('New Site','new.example.com','org_new');
    INSERT INTO "member" ("id","organizationId","userId","role","has_restricted_site_access") VALUES
      ('m_owner','org_new','u_owner','owner',false),
      ('m_member','org_new','u_member','member',true);
    INSERT INTO "member_site_access" ("member_id","site_id") VALUES ('m_member',2);
  `);
});

describe("admin subscription overrides", () => {
  it("sets a preset and clears custom limits", async () => {
    const reply = replyStub();
    await updateAdminSubscriptionOverride(
      requestStub({ params: { organizationId: "org_new" }, body: { mode: "preset", planOverride: "appsumo-4" } }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    const rows = await (pgClient as any).query(
      `SELECT "planOverride", custom_plan FROM "organization" WHERE id='org_new'`
    );
    expect(rows.rows[0]).toEqual({ planOverride: "appsumo-4", custom_plan: null });
  });

  it("sets custom limits and clears the preset", async () => {
    const reply = replyStub();
    await updateAdminSubscriptionOverride(
      requestStub({
        params: { organizationId: "org_new" },
        body: { mode: "custom", customPlan: { events: 1_000_000, members: null, websites: 20 } },
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    const rows = await (pgClient as any).query(
      `SELECT "planOverride", custom_plan FROM "organization" WHERE id='org_new'`
    );
    expect(rows.rows[0]).toEqual({
      planOverride: null,
      custom_plan: { events: 1_000_000, members: null, websites: 20 },
    });
  });

  it("rejects unknown preset names", async () => {
    const reply = replyStub();
    await updateAdminSubscriptionOverride(
      requestStub({ params: { organizationId: "org_new" }, body: { mode: "preset", planOverride: "secret-tier" } }),
      reply
    );
    expect(reply.statusCode).toBe(400);
  });
});

describe("admin member management", () => {
  it("promotes a member and clears obsolete site restrictions", async () => {
    const reply = replyStub();
    await updateAdminOrganizationMember(
      requestStub({
        params: { organizationId: "org_new", memberId: "m_member" },
        body: { role: "admin", hasRestrictedSiteAccess: true, siteIds: [2] },
      }),
      reply
    );

    expect(reply.statusCode).toBe(200);
    const members = await (pgClient as any).query(
      `SELECT role, has_restricted_site_access FROM "member" WHERE id='m_member'`
    );
    const grants = await (pgClient as any).query(`SELECT * FROM member_site_access WHERE member_id='m_member'`);
    expect(members.rows[0]).toEqual({ role: "admin", has_restricted_site_access: false });
    expect(grants.rows).toHaveLength(0);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledWith("u_member");
  });

  it("rejects grants for a site in another organization", async () => {
    const reply = replyStub();
    await updateAdminOrganizationMember(
      requestStub({
        params: { organizationId: "org_new", memberId: "m_member" },
        body: { role: "member", hasRestrictedSiteAccess: true, siteIds: [1] },
      }),
      reply
    );
    expect(reply.statusCode).toBe(400);
  });

  it("cannot demote or remove the last owner", async () => {
    const demoteReply = replyStub();
    await updateAdminOrganizationMember(
      requestStub({
        params: { organizationId: "org_new", memberId: "m_owner" },
        body: { role: "member", hasRestrictedSiteAccess: false, siteIds: [] },
      }),
      demoteReply
    );
    expect(demoteReply.statusCode).toBe(400);

    const deleteReply = replyStub();
    await deleteAdminOrganizationMember(
      requestStub({ params: { organizationId: "org_new", memberId: "m_owner" } }),
      deleteReply
    );
    expect(deleteReply.statusCode).toBe(400);
  });
});

describe("admin organization option search", () => {
  it("searches domains and member emails and orders blank results newest first", async () => {
    const domainReply = replyStub();
    await getAdminOrganizationOptions(requestStub({ query: { search: "old.example", limit: 25 } }), domainReply);
    expect(domainReply.body.items).toEqual([{ id: "org_old", name: "Old Org" }]);

    const emailReply = replyStub();
    await getAdminOrganizationOptions(requestStub({ query: { search: "member@example", limit: 25 } }), emailReply);
    expect(emailReply.body.items).toEqual([{ id: "org_new", name: "New Org" }]);

    const recentReply = replyStub();
    await getAdminOrganizationOptions(requestStub({ query: { search: "", limit: 1 } }), recentReply);
    expect(recentReply.body.items).toEqual([{ id: "org_new", name: "New Org" }]);
  });
});
