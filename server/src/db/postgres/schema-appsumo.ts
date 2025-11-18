import { pgSchema, serial, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./schema.js";

// Create the 'appsumo' schema for AppSumo tables
export const asSchema = pgSchema("appsumo");

// AppSumo licenses table (only created in cloud environments)
export const asLicenses = asSchema.table("licenses", {
  id: serial("id").primaryKey().notNull(),
  organizationId: text("organization_id").references(() => organization.id),
  licenseKey: text("license_key").notNull().unique(),
  tier: text("tier").notNull(), // Tier level from AppSumo (e.g., "1", "2", "3")
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'pending'
  parentLicenseKey: text("parent_license_key"), // For add-on licenses
  activatedAt: timestamp("activated_at", { mode: "string" }),
  deactivatedAt: timestamp("deactivated_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// Webhook events log for audit trail and idempotency
export const asWebhookEvents = asSchema.table("webhook_events", {
  id: serial("id").primaryKey().notNull(),
  licenseKey: text("license_key").notNull(),
  event: text("event").notNull(), // 'purchase', 'activate', 'upgrade', 'downgrade', 'deactivate', 'migrate'
  payload: text("payload").notNull(), // JSON string of full webhook payload
  processedAt: timestamp("processed_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});
