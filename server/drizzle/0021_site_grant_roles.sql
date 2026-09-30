ALTER TABLE "invitation" ADD COLUMN "site_role" text;--> statement-breakpoint
ALTER TABLE "member_site_access" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "team_site_access" ADD COLUMN "role" text;