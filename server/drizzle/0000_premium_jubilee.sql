DO $$ BEGIN
 CREATE TYPE "public"."import_platform_enum" AS ENUM('umami', 'simple_analytics');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "active_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"site_id" integer,
	"user_id" text,
	"start_time" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_regions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"last_health_check" timestamp,
	"is_healthy" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"userId" text NOT NULL,
	"refillInterval" integer,
	"refillAmount" integer,
	"lastRefillAt" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"rateLimitEnabled" boolean DEFAULT false NOT NULL,
	"rateLimitTimeWindow" integer,
	"rateLimitMax" integer,
	"requestCount" integer DEFAULT 0 NOT NULL,
	"remaining" integer,
	"lastRequest" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"permissions" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cancellation_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"reason_details" text,
	"retention_offer_shown" text,
	"retention_offer_accepted" boolean DEFAULT false,
	"outcome" text NOT NULL,
	"plan_name_at_cancellation" text,
	"monthly_event_count_at_cancellation" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funnels" (
	"report_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"user_id" text,
	"data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"goal_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text,
	"goal_type" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_connections" (
	"site_id" integer PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"gsc_property_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_status" (
	"import_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" integer NOT NULL,
	"organization_id" text NOT NULL,
	"platform" "import_platform_enum" NOT NULL,
	"imported_events" integer DEFAULT 0 NOT NULL,
	"skipped_events" integer DEFAULT 0 NOT NULL,
	"invalid_events" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"inviterId" text,
	"organizationId" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp,
	"expiresAt" timestamp NOT NULL,
	"has_restricted_site_access" boolean DEFAULT false NOT NULL,
	"site_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"has_restricted_site_access" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_site_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"site_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "member_site_access_unique" UNIQUE("member_id","site_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"config" jsonb NOT NULL,
	"monitor_ids" jsonb,
	"trigger_events" jsonb DEFAULT '["down","recovery"]'::jsonb NOT NULL,
	"cooldown_minutes" integer DEFAULT 5,
	"last_notified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"createdAt" timestamp NOT NULL,
	"metadata" text,
	"stripeCustomerId" text,
	"monthlyEventCount" integer DEFAULT 0,
	"overMonthlyLimit" boolean DEFAULT false,
	"planOverride" text,
	"custom_plan" jsonb,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text,
	"activeOrganizationId" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sites" (
	"id" text,
	"site_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text,
	"organization_id" text,
	"public" boolean DEFAULT false,
	"saltUserIds" boolean DEFAULT false,
	"blockBots" boolean DEFAULT true NOT NULL,
	"excluded_ips" jsonb DEFAULT '[]'::jsonb,
	"excluded_countries" jsonb DEFAULT '[]'::jsonb,
	"sessionReplay" boolean DEFAULT false,
	"webVitals" boolean DEFAULT false,
	"trackErrors" boolean DEFAULT false,
	"trackOutbound" boolean DEFAULT true,
	"trackUrlParams" boolean DEFAULT true,
	"trackInitialPageView" boolean DEFAULT true,
	"trackSpaNavigation" boolean DEFAULT true,
	"trackIp" boolean DEFAULT false,
	"trackButtonClicks" boolean DEFAULT false,
	"trackCopy" boolean DEFAULT false,
	"trackFormInteractions" boolean DEFAULT false,
	"api_key" text,
	"private_link_key" text,
	"tags" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telemetry" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"version" text NOT NULL,
	"table_counts" jsonb NOT NULL,
	"clickhouse_size_gb" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uptime_alert_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer NOT NULL,
	"monitor_id" integer NOT NULL,
	"triggered_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"alert_data" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uptime_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"monitor_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"alert_config" jsonb NOT NULL,
	"conditions" jsonb NOT NULL,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uptime_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"monitor_id" integer NOT NULL,
	"region" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"acknowledged_by" text,
	"acknowledged_at" timestamp,
	"resolved_by" text,
	"resolved_at" timestamp,
	"last_error" text,
	"last_error_type" text,
	"failure_count" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uptime_monitor_status" (
	"monitor_id" integer PRIMARY KEY NOT NULL,
	"last_checked_at" timestamp,
	"next_check_at" timestamp,
	"current_status" text DEFAULT 'unknown',
	"consecutive_failures" integer DEFAULT 0,
	"consecutive_successes" integer DEFAULT 0,
	"uptime_percentage_24h" real,
	"uptime_percentage_7d" real,
	"uptime_percentage_30d" real,
	"average_response_time_24h" real,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uptime_monitor_status_current_status_check" CHECK (current_status IN ('up', 'down', 'unknown')),
	CONSTRAINT "uptime_monitor_status_uptime_24h_check" CHECK (uptime_percentage_24h >= 0 AND uptime_percentage_24h <= 100),
	CONSTRAINT "uptime_monitor_status_uptime_7d_check" CHECK (uptime_percentage_7d >= 0 AND uptime_percentage_7d <= 100),
	CONSTRAINT "uptime_monitor_status_uptime_30d_check" CHECK (uptime_percentage_30d >= 0 AND uptime_percentage_30d <= 100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uptime_monitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text,
	"monitor_type" text NOT NULL,
	"interval_seconds" integer NOT NULL,
	"enabled" boolean DEFAULT true,
	"http_config" jsonb,
	"tcp_config" jsonb,
	"validation_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"monitoring_type" text DEFAULT 'local',
	"selected_regions" jsonb DEFAULT '["local"]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"displayUsername" text,
	"banned" boolean,
	"banReason" text,
	"banExpires" timestamp,
	"stripeCustomerId" text,
	"overMonthlyLimit" boolean DEFAULT false,
	"monthlyEventCount" integer DEFAULT 0,
	"sendAutoEmailReports" boolean DEFAULT true,
	"scheduled_tip_email_ids" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"anonymous_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_aliases_site_anon_unique" UNIQUE("site_id","anonymous_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"site_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"traits" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_site_id_user_id_pk" PRIMARY KEY("site_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apikey" ADD CONSTRAINT "apikey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnels" ADD CONSTRAINT "funnels_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnels" ADD CONSTRAINT "funnels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gsc_connections" ADD CONSTRAINT "gsc_connections_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_status" ADD CONSTRAINT "import_status_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_status" ADD CONSTRAINT "import_status_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_site_access" ADD CONSTRAINT "member_site_access_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_site_access" ADD CONSTRAINT "member_site_access_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_site_access" ADD CONSTRAINT "member_site_access_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_alert_history" ADD CONSTRAINT "uptime_alert_history_alert_id_uptime_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."uptime_alerts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_alert_history" ADD CONSTRAINT "uptime_alert_history_monitor_id_uptime_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."uptime_monitors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_alerts" ADD CONSTRAINT "uptime_alerts_monitor_id_uptime_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."uptime_monitors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_incidents" ADD CONSTRAINT "uptime_incidents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_incidents" ADD CONSTRAINT "uptime_incidents_monitor_id_uptime_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."uptime_monitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_incidents" ADD CONSTRAINT "uptime_incidents_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_incidents" ADD CONSTRAINT "uptime_incidents_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_monitor_status" ADD CONSTRAINT "uptime_monitor_status_monitor_id_uptime_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."uptime_monitors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_monitors" ADD CONSTRAINT "uptime_monitors_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uptime_monitors" ADD CONSTRAINT "uptime_monitors_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_aliases" ADD CONSTRAINT "user_aliases_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_site_access_member_idx" ON "member_site_access" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_site_access_site_idx" ON "member_site_access" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uptime_monitor_status_updated_at_idx" ON "uptime_monitor_status" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_aliases_user_idx" ON "user_aliases" USING btree ("site_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_aliases_anon_idx" ON "user_aliases" USING btree ("site_id","anonymous_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profiles_site_idx" ON "user_profiles" USING btree ("site_id");
