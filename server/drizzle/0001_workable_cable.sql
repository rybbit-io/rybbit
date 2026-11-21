DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apikey' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "apikey" RENAME COLUMN "userId" TO "referenceId";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'apikey_userId_user_id_fk'
  ) THEN
    ALTER TABLE "apikey" DROP CONSTRAINT "apikey_userId_user_id_fk";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apikey' AND column_name = 'configId'
  ) THEN
    ALTER TABLE "apikey" ADD COLUMN "configId" text;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'apikey_referenceId_user_id_fk'
  ) THEN
    ALTER TABLE "apikey" ADD CONSTRAINT "apikey_referenceId_user_id_fk" FOREIGN KEY ("referenceId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
