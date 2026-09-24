CREATE TABLE IF NOT EXISTS "experiments" (
	"experiment_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"feature_flag_id" integer NOT NULL,
	"primary_goal_id" integer,
	"name" text NOT NULL,
	"description" text,
	"hypothesis" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"winning_variant" text,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experiments_site_flag_unique" UNIQUE("site_id","feature_flag_id"),
	CONSTRAINT "experiments_status_check" CHECK (status IN ('draft', 'running', 'paused', 'completed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flags" (
	"flag_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"runtime" text DEFAULT 'client' NOT NULL,
	"flag_type" text DEFAULT 'boolean' NOT NULL,
	"payload" jsonb,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rollout_percentage" integer DEFAULT 100 NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"condition_sets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"salt" text DEFAULT md5(random()::text || clock_timestamp()::text) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_site_key_unique" UNIQUE("site_id","key"),
	CONSTRAINT "feature_flags_rollout_check" CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
	CONSTRAINT "feature_flags_runtime_check" CHECK (runtime IN ('client', 'server', 'both')),
	CONSTRAINT "feature_flags_type_check" CHECK (flag_type IN ('boolean', 'multivariate', 'remote_config'))
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'experiments_site_id_sites_site_id_fk'
  ) THEN
    ALTER TABLE "experiments" ADD CONSTRAINT "experiments_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'experiments_feature_flag_id_feature_flags_flag_id_fk'
  ) THEN
    ALTER TABLE "experiments" ADD CONSTRAINT "experiments_feature_flag_id_feature_flags_flag_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flags"("flag_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'experiments_primary_goal_id_goals_goal_id_fk'
  ) THEN
    ALTER TABLE "experiments" ADD CONSTRAINT "experiments_primary_goal_id_goals_goal_id_fk" FOREIGN KEY ("primary_goal_id") REFERENCES "public"."goals"("goal_id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feature_flags_site_id_sites_site_id_fk'
  ) THEN
    ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experiments_site_idx" ON "experiments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experiments_feature_flag_idx" ON "experiments" USING btree ("feature_flag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experiments_primary_goal_idx" ON "experiments" USING btree ("primary_goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feature_flags_site_idx" ON "feature_flags" USING btree ("site_id");
