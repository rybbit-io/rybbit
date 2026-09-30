import { PGlite } from "@electric-sql/pglite";
import type { SQL } from "drizzle-orm";
import Fastify from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  const database = drizzle(client);
  // Match postgres-js's row-array result while keeping real SQL and rollback.
  return {
    db: {
      transaction: (run: (executor: { execute(query: SQL): Promise<Record<string, unknown>[]> }) => Promise<unknown>) =>
        database.transaction(tx => run({ execute: async query => (await tx.execute(query)).rows })),
    },
    sql: client,
  };
});
vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true }));

import { sql } from "../../db/postgres/postgres.js";
import { handleAppSumoWebhook } from "./webhook.js";

const pg = sql as unknown as PGlite;
const app = Fastify();
app.post("/webhook", handleAppSumoWebhook);

beforeAll(async () => {
  process.env.APPSUMO_CLIENT_ID = "test";
  process.env.APPSUMO_CLIENT_SECRET = "test";
  await pg.exec(`
    CREATE SCHEMA appsumo;
    CREATE TABLE appsumo.webhook_events (
      license_key text, event text, payload jsonb, processed_at timestamp, created_at timestamp
    );
    CREATE TABLE appsumo.licenses (
      id serial PRIMARY KEY, license_key text UNIQUE, organization_id text, tier text, status text,
      parent_license_key text, activated_at timestamp, deactivated_at timestamp,
      created_at timestamp, updated_at timestamp
    );
    CREATE FUNCTION fail_old_license_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'simulated database write failure'; END;
    $$ LANGUAGE plpgsql;
  `);
}, 60_000);
beforeEach(async () => {
  await pg.exec(`
    DROP TRIGGER IF EXISTS fail_old_license_update ON appsumo.licenses;
    TRUNCATE appsumo.licenses, appsumo.webhook_events RESTART IDENTITY;
    INSERT INTO appsumo.licenses (license_key, organization_id, tier, status)
      VALUES ('old', 'org_one', '1', 'active'), ('unrelated', 'org_other', '5', 'active');
  `);
});
afterAll(async () => {
  await app.close();
  await pg.close();
});

const upgrade = { event: "upgrade", license_key: "new", prev_license_key: "old", tier: 2 };

describe("AppSumo webhook transactions", () => {
  it("rolls back audit and new-license writes if deactivation fails, then allows a retry", async () => {
    await pg.exec(`CREATE TRIGGER fail_old_license_update BEFORE UPDATE ON appsumo.licenses
      FOR EACH ROW WHEN (OLD.license_key = 'old') EXECUTE FUNCTION fail_old_license_update();`);
    const failed = await app.inject({ method: "POST", url: "/webhook", payload: upgrade });
    expect(failed.statusCode).toBe(500);
    expect((await pg.query("SELECT * FROM appsumo.webhook_events")).rows).toEqual([]);
    expect((await pg.query("SELECT license_key, status FROM appsumo.licenses ORDER BY license_key")).rows).toEqual([
      { license_key: "old", status: "active" },
      { license_key: "unrelated", status: "active" },
    ]);
    await pg.exec("DROP TRIGGER fail_old_license_update ON appsumo.licenses");
    const retry = await app.inject({ method: "POST", url: "/webhook", payload: upgrade });
    expect(retry.statusCode).toBe(200);
    expect(
      (await pg.query("SELECT organization_id, tier, status FROM appsumo.licenses WHERE license_key = 'new'")).rows
    ).toEqual([{ organization_id: "org_one", tier: "2", status: "active" }]);
  });
  it("never assigns an unrelated tenant when a previous license is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhook",
      payload: { ...upgrade, prev_license_key: "missing" },
    });
    expect(response.statusCode).toBe(500);
    expect((await pg.query("SELECT license_key FROM appsumo.licenses ORDER BY license_key")).rows).toEqual([
      { license_key: "old" },
      { license_key: "unrelated" },
    ]);
    expect((await pg.query("SELECT * FROM appsumo.webhook_events")).rows).toEqual([]);
  });
  it("rejects non-object payloads without crashing or writing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhook",
      headers: { "content-type": "application/json" },
      payload: "null",
    });
    expect(response.statusCode).toBe(400);
    expect((await pg.query("SELECT * FROM appsumo.webhook_events")).rows).toEqual([]);
  });
});
