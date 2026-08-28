import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidateSitesAccessCache: vi.fn(),
  siteIdsInOrganization: vi.fn(async (siteIds: number[]) => siteIds),
}));

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});

vi.mock("../../lib/access.js", () => ({
  siteIdsInOrganization: mocks.siteIdsInOrganization,
}));

vi.mock("../../services/sites/siteAccessCache.js", () => ({
  invalidateSitesAccessCache: mocks.invalidateSitesAccessCache,
}));

import { eq } from "drizzle-orm";
import { db, sql } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess } from "../../db/postgres/schema.js";
import { updateMemberSiteAccess } from "./updateMemberSiteAccess.js";

const DDL = `
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
  "member_id" text NOT NULL,
  "site_id" integer NOT NULL CHECK ("site_id" <> 99),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" text
);
CREATE TABLE "sites" (
  "site_id" integer PRIMARY KEY,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "organization_id" text
);
`;

function replyStub() {
  const reply: any = { statusCode: 200 };
  reply.status = (statusCode: number) => {
    reply.statusCode = statusCode;
    return reply;
  };
  reply.send = (body: unknown) => {
    reply.body = body;
    return reply;
  };
  return reply;
}

function requestFor(siteIds: number[]) {
  return {
    params: { organizationId: "org-1", memberId: "member-1" },
    body: { hasRestrictedSiteAccess: true, siteIds },
    user: { id: "admin-1" },
    log: { error: vi.fn() },
  } as any;
}

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (sql as any).exec(`
    TRUNCATE "member", "member_site_access", "sites" RESTART IDENTITY;
    INSERT INTO "member" ("id", "organizationId", "userId", "role", "has_restricted_site_access")
      VALUES ('member-1', 'org-1', 'user-1', 'member', false);
    INSERT INTO "sites" ("site_id", "name", "domain", "organization_id") VALUES
      (1, 'Old', 'old.example.com', 'org-1'),
      (2, 'New', 'new.example.com', 'org-1'),
      (99, 'Rejected', 'rejected.example.com', 'org-1');
    INSERT INTO "member_site_access" ("member_id", "site_id") VALUES ('member-1', 1);
  `);
});

describe("updateMemberSiteAccess", () => {
  it("rolls back the restriction flag and old grants when replacement insertion fails", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestFor([99]), reply);

    const [memberRow] = await db
      .select({ restricted: member.hasRestrictedSiteAccess })
      .from(member)
      .where(eq(member.id, "member-1"));
    const grants = await db
      .select({ siteId: memberSiteAccess.siteId })
      .from(memberSiteAccess)
      .where(eq(memberSiteAccess.memberId, "member-1"));

    expect(reply.statusCode).toBe(500);
    expect(memberRow.restricted).toBe(false);
    expect(grants).toEqual([{ siteId: 1 }]);
    expect(mocks.invalidateSitesAccessCache).not.toHaveBeenCalled();
  });

  it("commits the flag and grant replacement before invalidating the member cache", async () => {
    const reply = replyStub();

    await updateMemberSiteAccess(requestFor([2]), reply);

    const [memberRow] = await db
      .select({ restricted: member.hasRestrictedSiteAccess })
      .from(member)
      .where(eq(member.id, "member-1"));
    const grants = await db
      .select({ siteId: memberSiteAccess.siteId })
      .from(memberSiteAccess)
      .where(eq(memberSiteAccess.memberId, "member-1"));

    expect(reply.statusCode).toBe(200);
    expect(memberRow.restricted).toBe(true);
    expect(grants).toEqual([{ siteId: 2 }]);
    expect(mocks.invalidateSitesAccessCache).toHaveBeenCalledWith("user-1");
  });
});
