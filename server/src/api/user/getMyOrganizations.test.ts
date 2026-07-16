import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionFromReq: vi.fn(),
  getUserIdFromRequest: vi.fn(),
}));

// Keep the real db (PGlite below) but stub the two auth resolvers so we can
// drive the session-vs-bearer branch directly.
vi.mock("../../lib/auth-utils.js", () => ({
  getSessionFromReq: mocks.getSessionFromReq,
  getUserIdFromRequest: mocks.getUserIdFromRequest,
}));

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { db, sql: client };
});

import { sql } from "../../db/postgres/postgres.js";
import { getMyOrganizations } from "./getMyOrganizations.js";

const DDL = `
CREATE TABLE "organization" ("id" text PRIMARY KEY, "name" text NOT NULL, "slug" text, "logo" text, "createdAt" timestamp DEFAULT now());
CREATE TABLE "user" ("id" text PRIMARY KEY, "name" text, "email" text, "emailVerified" boolean DEFAULT false, "createdAt" timestamp DEFAULT now(), "updatedAt" timestamp DEFAULT now());
CREATE TABLE "member" ("id" text PRIMARY KEY, "organizationId" text NOT NULL, "userId" text NOT NULL, "role" text NOT NULL, "createdAt" timestamp DEFAULT now(), "has_restricted_site_access" boolean NOT NULL DEFAULT false);
CREATE TABLE "sites" ("id" text, "site_id" serial PRIMARY KEY, "name" text, "domain" text, "organization_id" text, "created_by" text, "public" boolean DEFAULT false, "saltUserIds" boolean DEFAULT false, "blockBots" boolean DEFAULT true, "created_at" timestamp DEFAULT now());
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

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  vi.clearAllMocks();
  await (sql as any).exec(`TRUNCATE "organization", "user", "member", "sites"`);
  await (sql as any).exec(`
    INSERT INTO "organization" ("id","name","slug") VALUES ('org_1','Acme','acme');
    INSERT INTO "user" ("id","name","email") VALUES ('u_caller','Owner','owner@acme.com'),('u_peer','Peer','peer@acme.com');
    INSERT INTO "member" ("id","organizationId","userId","role") VALUES ('m_caller','org_1','u_caller','owner'),('m_peer','org_1','u_peer','member');
    INSERT INTO "sites" ("id","name","domain","organization_id","public") VALUES ('hex1','Acme Site','acme.com','org_1',false);
  `);
  mocks.getUserIdFromRequest.mockResolvedValue("u_caller");
});

describe("getMyOrganizations — member roster exposure", () => {
  it("returns the member roster with PII for cookie-session requests", async () => {
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "u_caller" } });
    const reply = replyStub();

    await getMyOrganizations({ headers: {} } as any, reply);

    const [org] = reply.body;
    expect(org.members).toHaveLength(2);
    expect(org.members.map((m: any) => m.user.email)).toContain("peer@acme.com");
    expect(org.sites).toHaveLength(1);
  });

  it("omits the member roster for bearer credentials (no session)", async () => {
    mocks.getSessionFromReq.mockResolvedValue(null); // API key / OAuth token
    const reply = replyStub();

    await getMyOrganizations({ headers: { authorization: "Bearer rb_key" } } as any, reply);

    const [org] = reply.body;
    expect(org.members).toEqual([]);
    // Sites (what list_sites needs) are still returned; only member PII is withheld.
    expect(org.sites).toHaveLength(1);
    expect(JSON.stringify(reply.body)).not.toContain("peer@acme.com");
  });
});
