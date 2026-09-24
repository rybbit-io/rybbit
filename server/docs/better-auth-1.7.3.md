# Better Auth 1.7.3 migration

This upgrade moves the client, server, API key and SSO packages from 1.6.25 to
1.7.3. MCP OAuth now uses `@better-auth/mcp`, `@better-auth/oauth-provider` and
the JWT plugin, with an explicit consent page at `/auth/consent`.
`@better-auth/infra` keeps its separate 0.1.x version. The MCP SDK and stateless
transport remain on their existing versions; dynamic client registration stays
enabled.

## Database and cutover

Migration `0018_better_auth_173.sql` is additive. It creates the OAuth/JWT tables,
copies registered clients, hashes their previously plaintext secrets, and adds
team membership keys and member counts. Counts are backfilled; existing nullable
membership keys use Better Auth's compatibility lookup. New memberships use the
same key calculation as Better Auth.

Auth uses the native PostgreSQL/Kysely adapter, so its array fields are stored
as JSONB. Drizzle's native PostgreSQL arrays are not compatible with that
adapter's serialization. The Drizzle schema and snapshot reflect this.

1. Back up PostgreSQL and record the current application version. Run only the
   opening `DO` block from migration 0018 as a read-only preflight: it checks
   duplicate account identities and parses every nonempty legacy client metadata
   value with PostgreSQL's JSON parser. Fix any reported record before cutover.
2. Stop the old backend workers before migrating. Client registrations and team
   membership changes must not race the data copy and count backfill.
3. Apply migration 0018 with the existing file-based migration runner. The Docker
   backend entrypoint already runs `npm run db:migrate` before starting. For a
   manual deployment, run that command from `server/` against the deployment's
   database before starting the new backend.
4. Deploy the matching client and server. Keep `BASE_URL` set to the public site
   origin and keep the existing `BETTER_AUTH_SECRET`. OAuth requires HTTPS, with
   an exception for HTTP loopback during development. Plain HTTP LAN deployments
   keep session and API key authentication but do not enable OAuth.
5. Check password login, Google/GitHub sign-in where configured, existing
   sessions/API keys, team updates, and an MCP connection through discovery,
   login, consent and a tool call. Sign out of the linked session and confirm
   its MCP bearer is rejected on the next request. The explicit `BASE_URL` must
   produce the registered `/api/auth/callback/google` and
   `/api/auth/callback/github` URLs; check this in both development and production.

No live database migration is part of preparing this change.

The migration stops before schema writes if accounts contain duplicate
`(providerId, accountId)` pairs or legacy OAuth client metadata is invalid JSON.
The metadata error identifies the affected `oauthApplication.id` without logging
its contents. Resolve these records explicitly before retrying. Do not apply an
account `issuer` backfill from the 1.7.0–1.7.2 instructions: upstream reverted
that migration in 1.7.3.

## MCP client behavior

- Existing OAuth clients must reconnect and approve fresh consent. Old access
  tokens, refresh tokens and consent are retained in the legacy tables but are
  not accepted by the new provider. Password sessions and API keys are not
  rewritten by this migration.
- Registered client IDs and redirect URIs are preserved. Imported confidential
  clients use `client_secret_basic`; the old schema did not record their token
  authentication method. Clients that previously posted a secret must switch to
  HTTP Basic or register again with their intended method.
- New native clients with loopback redirects must register
  `application_type: "native"` and `token_endpoint_auth_method: "none"`.
  Other public clients must also explicitly send
  `token_endpoint_auth_method: "none"`. Omitting it now creates a confidential client using
  `client_secret_basic`, even for unauthenticated registration. Such a client
  receives a secret and must authenticate with it or subsequent token requests
  fail with `invalid_client`.
- Discovery advertises the new `/api/auth/oauth2/*` endpoints. Clients caching
  the old endpoints should rediscover the server.
- Resource tokens are verified for signature, issuer, expiry, audience,
  client state and validity of the linked session. These Bearer routes reject
  proof-bound tokens.
  The single resource remains `<BASE_URL>/api/mcp`; per-client resource join
  enforcement is disabled so imported clients can request it.
- Access tokens are JWTs with the upstream default lifetime of one hour. There
  is no per-access-token database revocation check: `/oauth2/revoke` rejects JWT
  access tokens with `unsupported_token_type`. Revoking a refresh token prevents
  future refreshes but leaves already-issued access JWTs valid until expiry.
  Deleting or disabling the OAuth client, or signing out of the linked session,
  makes those JWTs fail verification. Do not describe a refresh-token revocation
  or consent deletion as immediately disconnecting existing access tokens.
- Existing scope semantics remain: a grant with only standard OIDC scopes has
  full API access within the user's permissions. The consent page states this
  explicitly. Custom scopes narrow that access.

## Rollback

The old OAuth tables remain available, and the new columns are additive. A
rollback needs a coordinated stop of the new workers before restoring the old
application version. New client registrations and consent are not copied back;
those clients will need to register or reconnect again. Old tokens retained in
the legacy tables can become usable again under the old binary, including tokens
whose corresponding access was revoked after cutover. Account for those grants
before restoring OAuth traffic. Recompute team member counts before returning
to 1.7 after any period of running 1.6.

## Verification

The team's internal `memberCount` reservation counter can drift after user
deletions that cascade to memberships. Rybbit's team lists read the membership
rows, and `maximumMembersPerTeam` is not configured. Reconcile this counter on
all deletion paths before enabling that limit; it is not an authoritative count
for reporting. This remains a follow-up rather than a cutover requirement.

The disposable PostgreSQL integration test applies every migration through 0018
using the production Kysely adapter. It checks client migration and secret
hashing, duplicate-account and malformed-metadata rejection, discovery, signed
consent, PKCE token exchange, refresh and its revocation, JWT revocation limits,
bearer verification, sign-out revocation, pre-migration
sessions/API keys, team keys and email OTP password recovery. Client tests cover
consent, rejection, error retry and preservation of the signed login query.

Validation used Node 24: the server suite passed with four workers, the client
suite passed, both packages type-checked, and the client production build passed
with `npm run build -- --webpack`. A headless browser check also exercised the
real client plugin's signed-query submission and the mobile consent layout.
Local Turbopack builds cannot resolve the existing `@rybbit/shared` symlink
outside the client root; the production Dockerfile already materializes that
package before building. `npm run lint` is blocked by the existing empty ESLint
configuration scanning generated `.next` files and encountering undefined rules.
The 17 new consent messages are translated in all 11 non-English locales, with
their interpolation placeholders and existing translations preserved.

Upstream references: [1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide),
[MCP plugin](https://better-auth.com/docs/plugins/mcp), and
[changelog](https://better-auth.com/changelog).
