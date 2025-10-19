-- Aggregated stats rollups and enhanced page daily metrics

ALTER TABLE "page_agg_daily" DROP CONSTRAINT IF EXISTS "page_agg_daily_unique";
ALTER TABLE "page_agg_daily" ALTER COLUMN "page_path" DROP NOT NULL;
ALTER TABLE "page_agg_daily" ADD COLUMN IF NOT EXISTS "page_url" text;
ALTER TABLE "page_agg_daily" ADD COLUMN IF NOT EXISTS "first_seen_at" timestamp;
ALTER TABLE "page_agg_daily" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;

ALTER TABLE "page_agg_daily"
  ADD CONSTRAINT "page_agg_daily_unique"
  UNIQUE ("project_id", "page_path", "page_url", "event_date");

CREATE INDEX IF NOT EXISTS "page_agg_daily_project_date_idx"
  ON "page_agg_daily" ("project_id", "event_date");

CREATE INDEX IF NOT EXISTS "page_agg_daily_project_path_idx"
  ON "page_agg_daily" ("project_id", "page_path");

CREATE TABLE IF NOT EXISTS "project_overview_daily" (
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "event_date" date NOT NULL,
  "visits" integer DEFAULT 0 NOT NULL,
  "unique_visitors" integer DEFAULT 0 NOT NULL,
  "first_seen_at" timestamp,
  "last_seen_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_overview_daily_unique" UNIQUE ("project_id", "event_date")
);

CREATE INDEX IF NOT EXISTS "project_overview_daily_project_date_idx"
  ON "project_overview_daily" ("project_id", "event_date");

CREATE TABLE IF NOT EXISTS "project_visitors_daily" (
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "event_date" date NOT NULL,
  "visitor_hash" text NOT NULL,
  "first_seen_at" timestamp,
  "last_seen_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_visitors_daily_unique" UNIQUE ("project_id", "event_date", "visitor_hash")
);

CREATE INDEX IF NOT EXISTS "project_visitors_daily_project_date_idx"
  ON "project_visitors_daily" ("project_id", "event_date");

CREATE TABLE IF NOT EXISTS "project_page_visitors_daily" (
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "event_date" date NOT NULL,
  "page_path" text,
  "page_url" text,
  "visitor_hash" text NOT NULL,
  "first_seen_at" timestamp,
  "last_seen_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "project_page_visitors_daily_unique"
    UNIQUE ("project_id", "event_date", "page_path", "page_url", "visitor_hash")
);

CREATE INDEX IF NOT EXISTS "project_page_visitors_daily_project_date_idx"
  ON "project_page_visitors_daily" ("project_id", "event_date");

CREATE INDEX IF NOT EXISTS "project_page_visitors_daily_project_path_idx"
  ON "project_page_visitors_daily" ("project_id", "page_path");
