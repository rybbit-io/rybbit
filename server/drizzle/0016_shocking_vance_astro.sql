CREATE TABLE IF NOT EXISTS "segments" (
	"segment_id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"site_id" integer,
	"user_id" text,
	"name" text NOT NULL,
	"description" text,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'segment' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'segments_organization_id_organization_id_fk') THEN
		ALTER TABLE "segments" ADD CONSTRAINT "segments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'segments_site_id_sites_site_id_fk') THEN
		ALTER TABLE "segments" ADD CONSTRAINT "segments_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'segments_user_id_user_id_fk') THEN
		ALTER TABLE "segments" ADD CONSTRAINT "segments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "segments_organization_idx" ON "segments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "segments_site_idx" ON "segments" USING btree ("site_id");
