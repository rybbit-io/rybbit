import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});

import { sql as pgClient } from "../../db/postgres/postgres.js";
import { deleteAdminApiKey, getAdminApiKeys, updateAdminApiKey } from "./adminApiKeys.js";

const DDL = `
CREATE TABLE "organization" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL
);
CREATE TABLE "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE
);
CREATE TABLE "apikey" (
  "id" text PRIMARY KEY,
  "name" text,
  "start" text,
  "prefix" text,
  "key" text NOT NULL,
  "referenceId" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "lastRequest" timestamp,
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL,
  "configId" text,
  "permissions" text,
  "metadata" jsonb
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
    params: {},
    query: {},
    body: {},
    user: { id: "system_admin" },
    log: { error: vi.fn(), info: vi.fn() },
    ...overrides,
  } as any;
}

beforeAll(async () => {
  await (pgClient as any).exec(DDL);
});

beforeEach(async () => {
  await (pgClient as any).exec(`
    TRUNCATE "apikey", "user", "organization";
    INSERT INTO "organization" ("id","name") VALUES ('org_1','Acme');
    INSERT INTO "user" ("id","name","email") VALUES
      ('u_1','Alice','alice@example.com'),
      ('u_2','Bob','bob@example.com');
    INSERT INTO "apikey" ("id","name","start","key","referenceId","configId","permissions","metadata","createdAt","updatedAt") VALUES
      ('k_legacy','Legacy','rb_abc','hash1','u_1',NULL,NULL,NULL,'2026-01-01','2026-01-01'),
      ('k_user','Scoped','rb_def','hash2','u_2','default','{"analytics":["read"]}',NULL,'2026-02-01','2026-02-01'),
      ('k_org','Org key','rb_org_ghi','hash3','org_1','org',NULL,'{"createdBy":"u_1"}','2026-03-01','2026-03-01'),
      ('k_org_legacy_meta','Old meta','rb_org_jkl','hash4','org_1','org',NULL,'"{\\"createdBy\\":\\"u_2\\"}"','2026-04-01','2026-04-01'),
      ('k_orphan','Orphan','rb_mno','hash5','u_gone',NULL,NULL,NULL,'2026-05-01','2026-05-01');
  `);
});

describe("getAdminApiKeys", () => {
  it("lists user and organization keys with their owners, newest first, without the key hash", async () => {
    const reply = replyStub();
    await getAdminApiKeys(requestStub(), reply);

    expect(reply.statusCode).toBe(200);
    const keys = reply.body as any[];
    expect(keys.map(k => k.id)).toEqual(["k_orphan", "k_org_legacy_meta", "k_org", "k_user", "k_legacy"]);
    expect(keys.every(k => !("key" in k))).toBe(true);

    const byId = Object.fromEntries(keys.map(k => [k.id, k]));
    expect(byId.k_legacy).toMatchObject({
      ownerType: "user",
      ownerId: "u_1",
      ownerName: "Alice",
      ownerEmail: "alice@example.com",
      createdBy: null,
      permissions: null,
      enabled: true,
    });
    expect(byId.k_user).toMatchObject({ ownerType: "user", permissions: { analytics: ["read"] } });
    expect(byId.k_org).toMatchObject({
      ownerType: "organization",
      ownerId: "org_1",
      ownerName: "Acme",
      ownerEmail: null,
      createdBy: { id: "u_1", name: "Alice", email: "alice@example.com" },
    });
    expect(byId.k_org_legacy_meta.createdBy).toEqual({ id: "u_2", name: "Bob", email: "bob@example.com" });
    expect(byId.k_orphan).toMatchObject({ ownerType: "user", ownerName: null, ownerEmail: null });
  });
});

describe("updateAdminApiKey", () => {
  it("disables and re-enables a key", async () => {
    const reply = replyStub();
    await updateAdminApiKey(requestStub({ params: { keyId: "k_org" }, body: { enabled: false } }), reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ id: "k_org", enabled: false });

    const rows = await (pgClient as any).query(`SELECT enabled FROM "apikey" WHERE id='k_org'`);
    expect(rows.rows[0].enabled).toBe(false);

    const again = replyStub();
    await updateAdminApiKey(requestStub({ params: { keyId: "k_org" }, body: { enabled: true } }), again);
    expect(again.body).toEqual({ id: "k_org", enabled: true });
  });

  it("rejects fields other than enabled", async () => {
    const reply = replyStub();
    await updateAdminApiKey(
      requestStub({ params: { keyId: "k_user" }, body: { enabled: true, referenceId: "u_1" } }),
      reply
    );
    expect(reply.statusCode).toBe(400);
  });

  it("404s for an unknown key", async () => {
    const reply = replyStub();
    await updateAdminApiKey(requestStub({ params: { keyId: "nope" }, body: { enabled: false } }), reply);
    expect(reply.statusCode).toBe(404);
  });
});

describe("deleteAdminApiKey", () => {
  it("deletes only the targeted key", async () => {
    const reply = replyStub();
    await deleteAdminApiKey(requestStub({ params: { keyId: "k_user" } }), reply);
    expect(reply.statusCode).toBe(200);

    const rows = await (pgClient as any).query(`SELECT id FROM "apikey" ORDER BY id`);
    expect(rows.rows.map((r: any) => r.id)).toEqual(["k_legacy", "k_org", "k_org_legacy_meta", "k_orphan"]);
  });

  it("404s for an unknown key", async () => {
    const reply = replyStub();
    await deleteAdminApiKey(requestStub({ params: { keyId: "nope" } }), reply);
    expect(reply.statusCode).toBe(404);
  });
});
