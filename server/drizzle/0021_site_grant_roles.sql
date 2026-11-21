ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "site_role" text;--> statement-breakpoint
ALTER TABLE "member_site_access" ADD COLUMN IF NOT EXISTS "role" text;--> statement-breakpoint
ALTER TABLE "team_site_access" ADD COLUMN IF NOT EXISTS "role" text;
