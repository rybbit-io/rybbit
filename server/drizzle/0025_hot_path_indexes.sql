-- Each index is created only when no relation of that name exists. A plain
-- CREATE INDEX IF NOT EXISTS still takes a SHARE lock on the table before it
-- finds the index, and drizzle holds every lock until the migration commits;
-- checking the catalog first means indexes pre-built CONCURRENTLY under these
-- names cost no table lock at all.
DO $$ BEGIN IF to_regclass('public."apikey_key_idx"') IS NULL THEN CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key"); END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF to_regclass('public."goals_site_idx"') IS NULL THEN CREATE INDEX "goals_site_idx" ON "goals" USING btree ("site_id"); END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF to_regclass('public."member_organizationId_userId_idx"') IS NULL THEN CREATE INDEX "member_organizationId_userId_idx" ON "member" USING btree ("organizationId","userId"); END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF to_regclass('public."member_userId_idx"') IS NULL THEN CREATE INDEX "member_userId_idx" ON "member" USING btree ("userId"); END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF to_regclass('public."sites_organization_idx"') IS NULL THEN CREATE INDEX "sites_organization_idx" ON "sites" USING btree ("organization_id"); END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF to_regclass('public."team_organizationId_idx"') IS NULL THEN CREATE INDEX "team_organizationId_idx" ON "team" USING btree ("organizationId"); END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF to_regclass('public."teamMember_userId_idx"') IS NULL THEN CREATE INDEX "teamMember_userId_idx" ON "teamMember" USING btree ("userId"); END IF; END $$;