CREATE TABLE IF NOT EXISTS "dashboards" (
	"dashboard_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"user_id" text,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{"cards":[]}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dashboards_site_id_sites_site_id_fk'
  ) THEN
    ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'dashboards_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
