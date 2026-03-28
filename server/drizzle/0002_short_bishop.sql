CREATE TABLE IF NOT EXISTS "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organizationId" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teamMember" (
	"id" text PRIMARY KEY NOT NULL,
	"teamId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_site_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"site_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_site_access_unique" UNIQUE("team_id","site_id")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitation' AND column_name = 'team_ids'
  ) THEN
    ALTER TABLE "invitation" ADD COLUMN "team_ids" jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_organizationId_organization_id_fk'
  ) THEN
    ALTER TABLE "team" ADD CONSTRAINT "team_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teamMember_teamId_team_id_fk'
  ) THEN
    ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teamMember_userId_user_id_fk'
  ) THEN
    ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_site_access_team_id_team_id_fk'
  ) THEN
    ALTER TABLE "team_site_access" ADD CONSTRAINT "team_site_access_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_site_access_site_id_sites_site_id_fk'
  ) THEN
    ALTER TABLE "team_site_access" ADD CONSTRAINT "team_site_access_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_site_access_team_idx" ON "team_site_access" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_site_access_site_idx" ON "team_site_access" USING btree ("site_id");
