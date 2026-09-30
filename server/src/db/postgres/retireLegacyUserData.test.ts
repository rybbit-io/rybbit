import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const statements = readFileSync(new URL("../../../drizzle/0021_retire_legacy_user_data.sql", import.meta.url), "utf8")
  .split("--> statement-breakpoint")
  .map(statement => statement.trim())
  .filter(Boolean);

let db: PGlite;

async function applyMigration() {
  await db.transaction(async transaction => {
    for (const statement of statements) {
      await transaction.exec(statement);
    }
  });
}

async function publicColumns() {
  return (
    await db.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)
  ).rows;
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE organization (
      id text PRIMARY KEY,
      "stripeCustomerId" text,
      "overMonthlyLimit" boolean,
      "monthlyEventCount" integer
    );
    INSERT INTO organization VALUES ('org-1', 'cus-retained', true, 321);
  `);
});

afterEach(async () => {
  await db.close();
});

describe("retired user data migration", () => {
  it("can run twice without changing retained user or organization data", async () => {
    await db.exec(`
      CREATE TABLE "user" (
        id text PRIMARY KEY,
        email text NOT NULL,
        "stripeCustomerId" text,
        "overMonthlyLimit" boolean DEFAULT false,
        "monthlyEventCount" integer DEFAULT 0,
        scheduled_tip_email_ids jsonb DEFAULT '[]'
      );
      INSERT INTO "user" VALUES ('user-1', 'ada@example.com', 'cus-retired', true, 123, '["tip-1"]');
      CREATE TABLE active_sessions (session_id text PRIMARY KEY, user_id text);
      INSERT INTO active_sessions VALUES ('session-1', 'user-1');
    `);
    const organizations = (await db.query("SELECT * FROM organization")).rows;

    await applyMigration();
    const columnsAfterFirstRun = await publicColumns();
    expect(columnsAfterFirstRun).toEqual([
      { table_name: "organization", column_name: "id", data_type: "text" },
      { table_name: "organization", column_name: "stripeCustomerId", data_type: "text" },
      { table_name: "organization", column_name: "overMonthlyLimit", data_type: "boolean" },
      { table_name: "organization", column_name: "monthlyEventCount", data_type: "integer" },
      { table_name: "user", column_name: "id", data_type: "text" },
      { table_name: "user", column_name: "email", data_type: "text" },
    ]);

    await applyMigration();
    expect(await publicColumns()).toEqual(columnsAfterFirstRun);
    expect((await db.query('SELECT * FROM "user"')).rows).toEqual([{ id: "user-1", email: "ada@example.com" }]);
    expect((await db.query("SELECT * FROM organization")).rows).toEqual(organizations);
  });

  it("can resume when some columns and the sessions table are already absent", async () => {
    await db.exec(`
      CREATE TABLE "user" (id text PRIMARY KEY, email text NOT NULL, "stripeCustomerId" text);
      INSERT INTO "user" VALUES ('user-1', 'ada@example.com', 'cus-retired');
    `);

    await applyMigration();
    const columnsAfterFirstRun = await publicColumns();
    await applyMigration();

    expect(await publicColumns()).toEqual(columnsAfterFirstRun);
    expect((await db.query('SELECT * FROM "user"')).rows).toEqual([{ id: "user-1", email: "ada@example.com" }]);
  });

  it("can run twice when both target tables are already absent", async () => {
    const columns = await publicColumns();
    const organizations = (await db.query("SELECT * FROM organization")).rows;

    await applyMigration();
    await applyMigration();

    expect(await publicColumns()).toEqual(columns);
    expect((await db.query("SELECT * FROM organization")).rows).toEqual(organizations);
  });
});
