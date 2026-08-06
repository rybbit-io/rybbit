import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real drizzle queries against an in-memory PGlite database (same pattern as
// auth-utils.test.ts) — advisory locks and hashtextextended are plain Postgres.
vi.mock("../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../db/postgres/schema.js");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { db, sql: client };
});

import { db, sql } from "../db/postgres/postgres.js";
import { apiKey } from "../db/postgres/schema.js";
import { countApiKeysForReference, createApiKeyWithinLimit } from "./apiKeyLimits.js";

const DDL = `
CREATE TABLE "apikey" (
  "id" text PRIMARY KEY,
  "name" text,
  "start" text,
  "prefix" text,
  "key" text NOT NULL,
  "referenceId" text NOT NULL,
  "refillInterval" integer,
  "refillAmount" integer,
  "lastRefillAt" timestamp,
  "enabled" boolean NOT NULL DEFAULT true,
  "rateLimitEnabled" boolean NOT NULL DEFAULT false,
  "rateLimitTimeWindow" integer,
  "rateLimitMax" integer,
  "requestCount" integer NOT NULL DEFAULT 0,
  "remaining" integer,
  "lastRequest" timestamp,
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL,
  "configId" text,
  "permissions" text,
  "metadata" jsonb
);
`;

const NOW = "2026-01-01 00:00:00";
const PAST = "2020-01-01 00:00:00";
const FUTURE = "2099-01-01 00:00:00";

let seq = 0;
function keyRow(referenceId: string, overrides: Partial<typeof apiKey.$inferInsert> = {}) {
  seq += 1;
  return {
    id: `k_${seq}`,
    key: `hash_${seq}`,
    referenceId,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeAll(async () => {
  await (sql as any).exec(DDL);
});

beforeEach(async () => {
  await (sql as any).exec(`TRUNCATE "apikey"`);
});

describe("countApiKeysForReference", () => {
  it("counts only enabled, unexpired keys", async () => {
    await db.insert(apiKey).values([
      keyRow("ref_1"),
      keyRow("ref_1", { enabled: false }),
      keyRow("ref_1", { expiresAt: PAST }),
      keyRow("ref_1", { expiresAt: FUTURE }),
      keyRow("ref_other"),
    ]);

    expect(await countApiKeysForReference("ref_1")).toBe(2);
  });
});

describe("createApiKeyWithinLimit", () => {
  it("runs create under the limit and returns its result", async () => {
    await db.insert(apiKey).values([keyRow("ref_1")]);

    // create must not touch `db` here: PGlite is single-connection, so a
    // nested db call would deadlock the wrapping transaction. In production
    // better-auth inserts on its own pool.
    const outcome = await createApiKeyWithinLimit("ref_1", 2, async () => "created");

    expect(outcome).toEqual({ allowed: true, result: "created" });
  });

  it("blocks at the limit without invoking create", async () => {
    await db.insert(apiKey).values([keyRow("ref_1"), keyRow("ref_1")]);
    const create = vi.fn(async () => "nope");

    const outcome = await createApiKeyWithinLimit("ref_1", 2, create);

    expect(outcome).toEqual({ allowed: false });
    expect(create).not.toHaveBeenCalled();
  });

  it("expired and disabled keys don't consume slots", async () => {
    await db.insert(apiKey).values([keyRow("ref_1", { enabled: false }), keyRow("ref_1", { expiresAt: PAST })]);

    const outcome = await createApiKeyWithinLimit("ref_1", 1, async () => "created");

    expect(outcome).toEqual({ allowed: true, result: "created" });
  });
});
