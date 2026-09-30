-- Contract migration: review server/docs/retired-postgres-schema.md before deployment.
ALTER TABLE "public"."user" DROP COLUMN IF EXISTS "stripeCustomerId";--> statement-breakpoint
ALTER TABLE "public"."user" DROP COLUMN IF EXISTS "overMonthlyLimit";--> statement-breakpoint
ALTER TABLE "public"."user" DROP COLUMN IF EXISTS "monthlyEventCount";--> statement-breakpoint
ALTER TABLE "public"."user" DROP COLUMN IF EXISTS "scheduled_tip_email_ids";--> statement-breakpoint
DROP TABLE IF EXISTS "public"."active_sessions";
