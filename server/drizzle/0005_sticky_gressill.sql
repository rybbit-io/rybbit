ALTER TYPE "public"."import_platform_enum" ADD VALUE IF NOT EXISTS 'plausible';--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "embed_enabled" boolean DEFAULT false;
