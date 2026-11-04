import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});

import { sql as pgClient } from "../../db/postgres/postgres.js";
import { resetAdminUserTwoFactor } from "./adminTwoFactor.js";

const DDL = `
CREATE TABLE "user" (
  "id" text PRIMARY KEY,
  "twoFactorEnabled" boolean DEFAULT false
);
CREATE TABLE "twoFactor" (
  "id" text PRIMARY KEY,
  "secret" text NOT NULL,
  "backupCodes" text NOT NULL,
  "userId" text NOT NULL
);
CREATE TABLE "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL
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

function requestStub(userId: string) {
  return {
    params: { userId },
    user: { id: "system_admin" },
    log: { error: vi.fn(), info: vi.fn() },
  } as any;
}

async function rows(query: string) {
  return ((await (pgClient as any).query(query)) as { rows: unknown[] }).rows;
}

beforeAll(async () => {
  await (pgClient as any).exec(DDL);
});

beforeEach(async () => {
  await (pgClient as any).exec(`
    TRUNCATE "user", "twoFactor", "verification";
    INSERT INTO "user" ("id","twoFactorEnabled") VALUES ('u_locked', true), ('u_other', true);
    INSERT INTO "twoFactor" ("id","secret","backupCodes","userId") VALUES
      ('tf_locked','s1','c1','u_locked'),
      ('tf_other','s2','c2','u_other');
    INSERT INTO "verification" ("id","identifier","value","expiresAt") VALUES
      ('v_trust_locked','trust-device-aaa','u_locked', now() + interval '1 day'),
      ('v_trust_other','trust-device-bbb','u_other', now() + interval '1 day'),
      ('v_challenge','2fa-ccc','u_locked', now() + interval '1 day');
  `);
});

describe("resetAdminUserTwoFactor", () => {
  it("turns two-factor off for the user and revokes their trusted devices only", async () => {
    const reply = replyStub();
    await resetAdminUserTwoFactor(requestStub("u_locked"), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ success: true });
    expect(await rows(`SELECT id, "twoFactorEnabled" FROM "user" ORDER BY id`)).toEqual([
      { id: "u_locked", twoFactorEnabled: false },
      { id: "u_other", twoFactorEnabled: true },
    ]);
    expect(await rows(`SELECT id FROM "twoFactor"`)).toEqual([{ id: "tf_other" }]);
    expect(await rows(`SELECT id FROM "verification" ORDER BY id`)).toEqual([
      { id: "v_challenge" },
      { id: "v_trust_other" },
    ]);
  });

  it("404s for an unknown user and changes nothing", async () => {
    const reply = replyStub();
    await resetAdminUserTwoFactor(requestStub("u_gone"), reply);

    expect(reply.statusCode).toBe(404);
    expect(await rows(`SELECT id FROM "twoFactor" ORDER BY id`)).toHaveLength(2);
    expect(await rows(`SELECT id FROM "verification"`)).toHaveLength(3);
  });
});
