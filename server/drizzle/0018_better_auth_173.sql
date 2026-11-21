-- Idempotent: every step is guarded so a partial or repeated run converges on
-- the same schema without erroring or duplicating rows.
-- Refuse ambiguous identities rather than silently merging different users.
DO $$
DECLARE legacy_client record;
BEGIN
  IF EXISTS (SELECT 1 FROM account GROUP BY "providerId", "accountId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Better Auth 1.7: resolve duplicate account (providerId, accountId) pairs before migrating';
  END IF;
  -- Validate with PostgreSQL's JSON parser before any schema writes. A prefix
  -- regex would miss malformed objects and incorrectly reject JSON scalars.
  FOR legacy_client IN
    SELECT id, metadata FROM "oauthApplication" WHERE NULLIF(metadata, '') IS NOT NULL
  LOOP
    BEGIN
      PERFORM legacy_client.metadata::jsonb;
    EXCEPTION WHEN data_exception THEN
      RAISE EXCEPTION 'Better Auth 1.7: resolve invalid JSON metadata for oauthApplication id % before migrating', legacy_client.id;
    END;
  END LOOP;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"publicKey" text NOT NULL,
	"privateKey" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"expiresAt" timestamp,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthAccessTokenV2" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"clientId" text NOT NULL,
	"sessionId" text,
	"userId" text,
	"referenceId" text,
	"authorizationCodeId" text,
	"resources" jsonb,
	"requestedUserInfoClaims" jsonb,
	"refreshId" text,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"revoked" timestamp,
	"confirmation" jsonb,
	"scopes" jsonb NOT NULL,
	CONSTRAINT "oauthAccessTokenV2_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthClient" (
	"id" text PRIMARY KEY NOT NULL,
	"clientId" text NOT NULL,
	"clientSecret" text,
	"clientDiscoveryId" text,
	"disabled" boolean DEFAULT false,
	"skipConsent" boolean,
	"enableEndSession" boolean,
	"subjectType" text,
	"scopes" jsonb,
	"clientCredentialsScopes" jsonb DEFAULT '[]'::jsonb,
	"userId" text,
	"createdAt" timestamp,
	"updatedAt" timestamp,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" jsonb,
	"tos" text,
	"policy" text,
	"softwareId" text,
	"softwareVersion" text,
	"softwareStatement" text,
	"redirectUris" jsonb NOT NULL,
	"postLogoutRedirectUris" jsonb,
	"backchannelLogoutUri" text,
	"backchannelLogoutSessionRequired" boolean,
	"tokenEndpointAuthMethod" text,
	"applicationType" text,
	"jwks" text,
	"jwksUri" text,
	"grantTypes" jsonb,
	"responseTypes" jsonb,
	"requirePKCE" boolean,
	"dpopBoundAccessTokens" boolean DEFAULT false,
	"referenceId" text,
	"metadata" jsonb,
	CONSTRAINT "oauthClient_clientId_unique" UNIQUE("clientId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthClientAssertion" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthClientResource" (
	"id" text PRIMARY KEY NOT NULL,
	"clientId" text NOT NULL,
	"resourceId" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthConsentV2" (
	"id" text PRIMARY KEY NOT NULL,
	"clientId" text NOT NULL,
	"userId" text,
	"referenceId" text,
	"resources" jsonb,
	"requestedUserInfoClaims" jsonb,
	"scopes" jsonb NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthRefreshToken" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"clientId" text NOT NULL,
	"sessionId" text,
	"userId" text NOT NULL,
	"referenceId" text,
	"authorizationCodeId" text,
	"resources" jsonb,
	"requestedUserInfoClaims" jsonb,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"revoked" timestamp,
	"rotatedAt" timestamp,
	"rotationReplayResponse" text,
	"rotationReplayExpiresAt" timestamp,
	"authTime" timestamp,
	"confirmation" jsonb,
	"scopes" jsonb NOT NULL,
	CONSTRAINT "oauthRefreshToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauthResource" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"name" text NOT NULL,
	"accessTokenTtl" integer,
	"refreshTokenTtl" integer,
	"signingAlgorithm" text,
	"signingKeyId" text,
	"allowedScopes" jsonb,
	"customClaims" jsonb,
	"dpopBoundAccessTokensRequired" boolean DEFAULT false,
	"disabled" boolean DEFAULT false,
	"createdAt" timestamp,
	"updatedAt" timestamp,
	"policyVersion" integer DEFAULT 1,
	"metadata" jsonb,
	CONSTRAINT "oauthResource_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "memberCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "teamMember" ADD COLUMN IF NOT EXISTS "membershipKey" text;--> statement-breakpoint
-- Postgres has no ADD CONSTRAINT IF NOT EXISTS; guard each one by name.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthAccessTokenV2"'::regclass AND conname = 'oauthAccessTokenV2_clientId_oauthClient_clientId_fk') THEN
    ALTER TABLE "oauthAccessTokenV2" ADD CONSTRAINT "oauthAccessTokenV2_clientId_oauthClient_clientId_fk" FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthAccessTokenV2"'::regclass AND conname = 'oauthAccessTokenV2_sessionId_session_id_fk') THEN
    ALTER TABLE "oauthAccessTokenV2" ADD CONSTRAINT "oauthAccessTokenV2_sessionId_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthAccessTokenV2"'::regclass AND conname = 'oauthAccessTokenV2_userId_user_id_fk') THEN
    ALTER TABLE "oauthAccessTokenV2" ADD CONSTRAINT "oauthAccessTokenV2_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthAccessTokenV2"'::regclass AND conname = 'oauthAccessTokenV2_refreshId_oauthRefreshToken_id_fk') THEN
    ALTER TABLE "oauthAccessTokenV2" ADD CONSTRAINT "oauthAccessTokenV2_refreshId_oauthRefreshToken_id_fk" FOREIGN KEY ("refreshId") REFERENCES "public"."oauthRefreshToken"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthClient"'::regclass AND conname = 'oauthClient_userId_user_id_fk') THEN
    ALTER TABLE "oauthClient" ADD CONSTRAINT "oauthClient_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthClientResource"'::regclass AND conname = 'oauthClientResource_clientId_oauthClient_clientId_fk') THEN
    ALTER TABLE "oauthClientResource" ADD CONSTRAINT "oauthClientResource_clientId_oauthClient_clientId_fk" FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthClientResource"'::regclass AND conname = 'oauthClientResource_resourceId_oauthResource_identifier_fk') THEN
    ALTER TABLE "oauthClientResource" ADD CONSTRAINT "oauthClientResource_resourceId_oauthResource_identifier_fk" FOREIGN KEY ("resourceId") REFERENCES "public"."oauthResource"("identifier") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthConsentV2"'::regclass AND conname = 'oauthConsentV2_clientId_oauthClient_clientId_fk') THEN
    ALTER TABLE "oauthConsentV2" ADD CONSTRAINT "oauthConsentV2_clientId_oauthClient_clientId_fk" FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthConsentV2"'::regclass AND conname = 'oauthConsentV2_userId_user_id_fk') THEN
    ALTER TABLE "oauthConsentV2" ADD CONSTRAINT "oauthConsentV2_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthRefreshToken"'::regclass AND conname = 'oauthRefreshToken_clientId_oauthClient_clientId_fk') THEN
    ALTER TABLE "oauthRefreshToken" ADD CONSTRAINT "oauthRefreshToken_clientId_oauthClient_clientId_fk" FOREIGN KEY ("clientId") REFERENCES "public"."oauthClient"("clientId") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthRefreshToken"'::regclass AND conname = 'oauthRefreshToken_sessionId_session_id_fk') THEN
    ALTER TABLE "oauthRefreshToken" ADD CONSTRAINT "oauthRefreshToken_sessionId_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."oauthRefreshToken"'::regclass AND conname = 'oauthRefreshToken_userId_user_id_fk') THEN
    ALTER TABLE "oauthRefreshToken" ADD CONSTRAINT "oauthRefreshToken_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."teamMember"'::regclass AND conname = 'teamMember_membershipKey_unique') THEN
    ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_membershipKey_unique" UNIQUE("membershipKey");
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthAccessTokenV2_clientId_idx" ON "oauthAccessTokenV2" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthAccessTokenV2_sessionId_idx" ON "oauthAccessTokenV2" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthAccessTokenV2_userId_idx" ON "oauthAccessTokenV2" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthAccessTokenV2_authorizationCodeId_idx" ON "oauthAccessTokenV2" USING btree ("authorizationCodeId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthAccessTokenV2_refreshId_idx" ON "oauthAccessTokenV2" USING btree ("refreshId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthClient_userId_idx" ON "oauthClient" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauthClientResource_clientId_resourceId_uidx" ON "oauthClientResource" USING btree ("clientId","resourceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthClientResource_clientId_idx" ON "oauthClientResource" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthClientResource_resourceId_idx" ON "oauthClientResource" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthConsentV2_clientId_idx" ON "oauthConsentV2" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthConsentV2_userId_idx" ON "oauthConsentV2" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_clientId_idx" ON "oauthRefreshToken" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_sessionId_idx" ON "oauthRefreshToken" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_userId_idx" ON "oauthRefreshToken" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_authorizationCodeId_idx" ON "oauthRefreshToken" USING btree ("authorizationCodeId");
--> statement-breakpoint
-- Clients keep their IDs and redirect URIs. The old plugin stored secrets in
-- plaintext; 1.7 stores SHA-256 in unpadded base64url. Existing grants/tokens
-- are intentionally not imported: clients must request fresh consent.
-- ON CONFLICT DO NOTHING (id PK or clientId unique) keeps re-runs from
-- duplicating or overwriting clients that were already imported.
INSERT INTO "oauthClient" (
  id, "clientId", "clientSecret", name, icon, metadata, "redirectUris",
  disabled, "userId", "createdAt", "updatedAt", "tokenEndpointAuthMethod",
  "applicationType", "grantTypes", "responseTypes", "requirePKCE", scopes
)
SELECT id, "clientId",
  CASE WHEN type = 'public' OR NULLIF("clientSecret", '') IS NULL THEN NULL
    ELSE rtrim(translate(encode(sha256(convert_to("clientSecret", 'UTF8')), 'base64'), '+/', '-_'), '=') END,
  name, icon, NULLIF(metadata, '')::jsonb, to_jsonb(string_to_array("redirectUrls", ',')),
  disabled, "userId", "createdAt", "updatedAt",
  CASE WHEN type = 'public' THEN 'none' ELSE 'client_secret_basic' END,
  CASE WHEN type = 'public' THEN 'native' ELSE 'web' END,
  '["authorization_code", "refresh_token"]'::jsonb, '["code"]'::jsonb, true,
  to_jsonb(ARRAY['openid', 'profile', 'email', 'offline_access', 'analytics:read', 'sessions:read', 'events:read', 'users:read', 'users:write', 'goals:read', 'goals:write', 'funnels:read', 'funnels:write', 'dashboards:read', 'dashboards:write', 'annotations:read', 'annotations:write', 'segments:read', 'segments:write', 'flags:read', 'flags:write', 'experiments:read', 'experiments:write', 'sites:read', 'sites:write', 'gsc:read', 'gsc:write', 'org:read', 'org:write', 'replay:read', 'replay:write', 'sql:read', 'ingest:write'])
FROM "oauthApplication"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Existing nullable membership keys are supported by Better Auth's pair
-- lookup fallback. Counts must reflect existing members at cutover.
UPDATE team SET "memberCount" = (SELECT count(*) FROM "teamMember" WHERE "teamId" = team.id);
