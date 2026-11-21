import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../db/postgres/schema.js");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), sql: client };
});

vi.mock("../../services/featureFlags/definitions.js", () => ({
  invalidateFeatureFlagDefinitions: vi.fn(),
}));

import type { PGlite } from "@electric-sql/pglite";
import { db, sql } from "../../db/postgres/postgres.js";
import { updateExperiment } from "./updateExperiment.js";

// The mock above swaps the postgres.js client for PGlite.
const pgClient = sql as unknown as PGlite;

const DDL = `
CREATE TABLE "sites" (
  "site_id" serial PRIMARY KEY
);
CREATE TABLE "goals" (
  "goal_id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "name" text,
  "goal_type" text NOT NULL,
  "config" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE TABLE "feature_flags" (
  "flag_id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "description" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "runtime" text NOT NULL DEFAULT 'client',
  "flag_type" text NOT NULL DEFAULT 'boolean',
  "payload" jsonb,
  "variants" jsonb NOT NULL DEFAULT '[]',
  "rollout_percentage" integer NOT NULL DEFAULT 100,
  "rules" jsonb NOT NULL DEFAULT '[]',
  "condition_sets" jsonb NOT NULL DEFAULT '[]',
  "salt" text NOT NULL DEFAULT 'salt',
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE "experiments" (
  "experiment_id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
  "feature_flag_id" integer NOT NULL REFERENCES "feature_flags"("flag_id") ON DELETE CASCADE,
  "primary_goal_id" integer REFERENCES "goals"("goal_id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "description" text,
  "hypothesis" text,
  "status" text NOT NULL DEFAULT 'draft',
  "winning_variant" text,
  "started_at" timestamp,
  "ended_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
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

function requestStub(body: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return { params: { siteId: "1", experimentId: "1" }, body, ...overrides } as any;
}

async function flagRow() {
  const result = await pgClient.query<{ enabled: boolean; version: number }>(
    `SELECT enabled, version FROM feature_flags WHERE flag_id = 1`
  );
  return result.rows[0];
}

async function experimentStatus() {
  const result = await pgClient.query<{ status: string }>(`SELECT status FROM experiments WHERE experiment_id = 1`);
  return result.rows[0]?.status;
}

/** Runs `sql` right before the handler opens its transaction, as a concurrent request would. */
function beforeTransaction(sql: string) {
  const original = db.transaction.bind(db);
  vi.spyOn(db, "transaction").mockImplementationOnce((async (...args: Parameters<typeof db.transaction>) => {
    await pgClient.exec(sql);
    return original(...args);
  }) as typeof db.transaction);
}

beforeAll(async () => {
  await pgClient.exec(DDL);
});

afterAll(async () => {
  await pgClient.close();
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await pgClient.exec(`
    TRUNCATE experiments, feature_flags, goals, sites RESTART IDENTITY CASCADE;
    INSERT INTO sites DEFAULT VALUES;
    INSERT INTO feature_flags (site_id, key, enabled, flag_type, variants)
      VALUES (1, 'checkout', false, 'multivariate',
        '[{"key":"control","rolloutPercentage":50},{"key":"treatment","rolloutPercentage":50}]');
    INSERT INTO experiments (site_id, feature_flag_id, name, status) VALUES (1, 1, 'Checkout test', 'draft');
  `);
});

describe("updateExperiment", () => {
  it("starts the experiment and switches its flag on", async () => {
    const reply = replyStub();
    await updateExperiment(requestStub({ status: "running" }), reply);

    expect(reply.statusCode).toBe(200);
    expect(await experimentStatus()).toBe("running");
    expect(await flagRow()).toEqual({ enabled: true, version: 2 });
  });

  it("rejects a lifecycle change from a bearer credential without flags:write", async () => {
    const reply = replyStub();
    await updateExperiment(
      requestStub({ status: "running" }, { bearerAuth: true, bearerStatements: { experiments: ["read", "write"] } }),
      reply
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.body).toEqual({ error: "Insufficient scope", required: "flags:write" });
    expect(await experimentStatus()).toBe("draft");
    expect(await flagRow()).toEqual({ enabled: false, version: 1 });
  });

  it("lets a bearer credential with flags:write change the lifecycle", async () => {
    const reply = replyStub();
    await updateExperiment(
      requestStub(
        { status: "running" },
        { bearerAuth: true, bearerStatements: { experiments: ["write"], flags: ["write"] } }
      ),
      reply
    );

    expect(reply.statusCode).toBe(200);
    expect(await flagRow()).toEqual({ enabled: true, version: 2 });
  });

  it("lets an experiments-only credential edit fields that leave the flag alone", async () => {
    const reply = replyStub();
    await updateExperiment(
      requestStub(
        { hypothesis: "Shorter form converts better" },
        { bearerAuth: true, bearerStatements: { experiments: ["write"] } }
      ),
      reply
    );

    expect(reply.statusCode).toBe(200);
  });

  it("does not overwrite a flag edited after the handler read it", async () => {
    beforeTransaction(`UPDATE feature_flags SET version = 2, rollout_percentage = 20 WHERE flag_id = 1`);
    const reply = replyStub();
    await updateExperiment(requestStub({ status: "running" }), reply);

    expect(reply.statusCode).toBe(409);
    expect(await experimentStatus()).toBe("draft");
    expect(await flagRow()).toEqual({ enabled: false, version: 2 });
  });

  it("does not overwrite a status changed after the handler read it", async () => {
    beforeTransaction(`UPDATE experiments SET status = 'completed' WHERE experiment_id = 1`);
    const reply = replyStub();
    await updateExperiment(requestStub({ status: "running" }), reply);

    expect(reply.statusCode).toBe(409);
    expect(await experimentStatus()).toBe("completed");
    expect(await flagRow()).toEqual({ enabled: false, version: 1 });
  });

  it("rolls the flag change back when the experiment is deleted mid-update", async () => {
    beforeTransaction(`DELETE FROM experiments WHERE experiment_id = 1`);
    const reply = replyStub();
    await updateExperiment(requestStub({ status: "running" }), reply);

    expect(reply.statusCode).toBe(409);
    expect(await flagRow()).toEqual({ enabled: false, version: 1 });
  });
});
