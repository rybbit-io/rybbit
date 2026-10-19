CREATE INDEX IF NOT EXISTS "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_site_idx" ON "goals" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_organizationId_userId_idx" ON "member" USING btree ("organizationId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_userId_idx" ON "member" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sites_organization_idx" ON "sites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_organizationId_idx" ON "team" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teamMember_userId_idx" ON "teamMember" USING btree ("userId");