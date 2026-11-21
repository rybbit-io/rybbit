ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "type" text;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "sites" ADD CONSTRAINT "sites_type_check" CHECK ("type" IS NULL OR "type" IN ('web', 'mobile'));
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
