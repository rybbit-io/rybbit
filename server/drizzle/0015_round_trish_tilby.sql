CREATE TABLE IF NOT EXISTS "lifecycle_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_key" text NOT NULL,
	"site_id" integer,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lifecycle_email_log_user_email_key_unique" UNIQUE("user_id","email_key")
);
--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "detected_platform" text;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lifecycle_email_log_user_id_user_id_fk') THEN
		ALTER TABLE "lifecycle_email_log" ADD CONSTRAINT "lifecycle_email_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
