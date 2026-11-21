DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitation' AND column_name = 'teamId'
  ) THEN
    ALTER TABLE "invitation" ADD COLUMN "teamId" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session' AND column_name = 'activeTeamId'
  ) THEN
    ALTER TABLE "session" ADD COLUMN "activeTeamId" text;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invitation_teamId_team_id_fk'
  ) THEN
    ALTER TABLE "invitation" ADD CONSTRAINT "invitation_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitation' AND column_name = 'team_ids'
  ) THEN
    ALTER TABLE "invitation" DROP COLUMN "team_ids";
  END IF;
END $$;
