ALTER TYPE "public"."import_platform_enum" ADD VALUE 'plausible';--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "embed_enabled" boolean DEFAULT false;