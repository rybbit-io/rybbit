import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionFromReq: vi.fn(),
  getUserIdFromRequest: vi.fn(),
  getOrganizationIdFromApiKey: vi.fn(),
  wasRateLimited: vi.fn(),
}));

// Keep the real db (PGlite below) but stub the auth resolvers so we can drive
// the session-vs-bearer-vs-org-key branch directly.
vi.mock("../../lib/auth-utils.js", () => ({
  getSessionFromReq: mocks.getSessionFromReq,
  getUserIdFromRequest: mocks.getUserIdFromRequest,
  getOrganizationIdFromApiKey: mocks.getOrganizationIdFromApiKey,
  wasRateLimited: mocks.wasRateLimited,
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
  const reply: any = { statusCode: 200, headers: {} };
  reply.status = (code: number) => {
    reply.statusCode = code;
    return reply;
  };
  reply.send = (body: unknown) => {
    reply.body = body;
    return reply;
  };
  reply.header = (name: string, value: unknown) => {
    reply.headers[name] = value;
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
    INSERT INTO "organization" ("id","name","slug") VALUES ('org_1','Acme','acme'),('org_2','Beta','beta');
    INSERT INTO "user" ("id","name","email") VALUES ('u_caller','Owner','owner@acme.com'),('u_peer','Peer','peer@acme.com');
    INSERT INTO "member" ("id","organizationId","userId","role") VALUES ('m_caller','org_1','u_caller','owner'),('m_peer','org_1','u_peer','member');
    INSERT INTO "sites" ("id","name","domain","organization_id","public") VALUES ('hex1','Acme Site','acme.com','org_1',false);
    INSERT INTO "sites" ("id","name","domain","organization_id","public") VALUES ('hex_beta1','Beta Site 1','beta1.com','org_2',false),('hex_beta2','Beta Site 2','beta2.com','org_2',false);
  `);
  mocks.getUserIdFromRequest.mockResolvedValue("u_caller");
  mocks.getOrganizationIdFromApiKey.mockResolvedValue(null);
  mocks.wasRateLimited.mockReturnValue(undefined);
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

describe("getMyOrganizations — organization-owned API keys", () => {
  beforeEach(() => {
    mocks.getUserIdFromRequest.mockResolvedValue(null);
    mocks.getSessionFromReq.mockResolvedValue(null);
  });

  it("returns only its own organization, with all its sites and no member PII", async () => {
    mocks.getOrganizationIdFromApiKey.mockResolvedValue("org_2");
    const reply = replyStub();

    await getMyOrganizations({ headers: { authorization: "Bearer rb_org_key" } } as any, reply);

    expect(reply.body).toHaveLength(1);
    const [org] = reply.body;
    expect(org.id).toBe("org_2");
    expect(org.role).toBe("admin");
    expect(org.members).toEqual([]);
    expect(org.sites.map((s: any) => s.domain).sort()).toEqual(["beta1.com", "beta2.com"]);
    expect(JSON.stringify(reply.body)).not.toContain("peer@acme.com");
    expect(JSON.stringify(reply.body)).not.toContain("owner@acme.com");
  });

  it("never returns another organization's data (org A key can't see org B)", async () => {
    mocks.getOrganizationIdFromApiKey.mockResolvedValue("org_1");
    const reply = replyStub();

    await getMyOrganizations({ headers: { authorization: "Bearer rb_org_key" } } as any, reply);

    expect(reply.body).toHaveLength(1);
    const [org] = reply.body;
    expect(org.id).toBe("org_1");
    expect(org.sites.map((s: any) => s.domain)).toEqual(["acme.com"]);
    // Only org_1's data is present anywhere in the payload — org_2 never leaks in.
    expect(JSON.stringify(reply.body)).not.toContain("org_2");
    expect(JSON.stringify(reply.body)).not.toContain("beta1.com");
    expect(JSON.stringify(reply.body)).not.toContain("beta2.com");
  });

  it("401s when neither a user id nor an org key resolve", async () => {
    mocks.getOrganizationIdFromApiKey.mockResolvedValue(null);
    const reply = replyStub();

    await getMyOrganizations({ headers: {} } as any, reply);

    expect(reply.statusCode).toBe(401);
  });

  it("429s instead of 401 when the credential was only rate-limited", async () => {
    mocks.getOrganizationIdFromApiKey.mockResolvedValue(null);
    mocks.wasRateLimited.mockReturnValue({ retryAfterSeconds: 30, scope: "org" });
    const reply = replyStub();

    await getMyOrganizations({ headers: { authorization: "Bearer rb_org_key" } } as any, reply);

    expect(reply.statusCode).toBe(429);
  });
});
