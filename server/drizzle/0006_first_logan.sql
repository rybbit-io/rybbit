CREATE TABLE "feature_flags" (
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
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_flags_site_idx" ON "feature_flags" USING btree ("site_id");
