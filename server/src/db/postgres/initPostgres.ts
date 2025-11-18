import { asc, eq, sql } from "drizzle-orm";
import { IS_CLOUD } from "../../lib/const.js";
import { db } from "./postgres.js";
import { user } from "./schema.js";

export const initPostgres = async () => {
  try {
    // Find the oldest user by createdAt timestamp
    const oldestUser = await db.select().from(user).orderBy(asc(user.createdAt)).limit(1);

    if (oldestUser.length > 0) {
      // Update the oldest user's role to admin
      await db.update(user).set({ role: "admin" }).where(eq(user.id, oldestUser[0].id));
    }

    // Initialize AppSumo tables in cloud environments only
    if (IS_CLOUD) {
      await initializeAppSumoTables();
    }
  } catch (error) {
    console.error("Error initializing postgres:", error);
  }
};

/**
 * Creates AppSumo-specific tables if they don't exist
 * This runs only in cloud environments (IS_CLOUD === true)
 */
async function initializeAppSumoTables() {
  console.info("Initializing AppSumo tables...");
  try {
    // Create 'appsumo' schema for AppSumo tables
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS appsumo`);

    // Create appsumo.licenses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appsumo.licenses (
        id SERIAL PRIMARY KEY NOT NULL,
        organization_id TEXT REFERENCES organization(id),
        license_key TEXT NOT NULL UNIQUE,
        tier TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        parent_license_key TEXT,
        activated_at TIMESTAMP,
        deactivated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create appsumo.webhook_events table for audit trail
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS appsumo.webhook_events (
        id SERIAL PRIMARY KEY NOT NULL,
        license_key TEXT NOT NULL,
        event TEXT NOT NULL,
        payload TEXT NOT NULL,
        processed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.info("AppSumo schema and tables initialized successfully");
  } catch (error) {
    console.error("Error initializing AppSumo tables:", error);
  }
}
