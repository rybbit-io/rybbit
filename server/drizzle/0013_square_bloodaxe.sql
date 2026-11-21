ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "excluded_asns" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "excluded_query_params" jsonb DEFAULT '[]'::jsonb;
