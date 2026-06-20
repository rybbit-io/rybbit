ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "excluded_paths" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "excluded_hostnames" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "excluded_user_agents" jsonb DEFAULT '[]'::jsonb;
