CREATE TABLE IF NOT EXISTS "site_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"source_organization_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "site_transfers_site_unique" UNIQUE("site_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site_transfers" ADD CONSTRAINT "site_transfers_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site_transfers" ADD CONSTRAINT "site_transfers_source_organization_id_organization_id_fk" FOREIGN KEY ("source_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site_transfers" ADD CONSTRAINT "site_transfers_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
