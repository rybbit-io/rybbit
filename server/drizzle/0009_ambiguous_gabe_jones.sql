ALTER TABLE "sites" ADD COLUMN "excluded_paths" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "excluded_hostnames" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "excluded_user_agents" jsonb DEFAULT '[]'::jsonb;