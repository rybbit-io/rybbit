# Rybbit Security Review — Final Report

## Executive Summary

This review consolidates 25 verified raw findings into **16 distinct issues** (overlapping reports merged).

| Severity | Count |
|----------|-------|
| High     | 7     |
| Medium   | 4     |
| Low      | 5     |
| Info     | 1 (latent) |

The High-severity findings cluster into two dominant themes:

1. **ClickHouse SQL injection** reachable on public or API-key-scoped analytics endpoints, enabling cross-tenant data exfiltration.
2. **CSRF / credentialed cross-site access** created by all-origins CORS reflection (`callback(null, true)` + `credentials: true`) combined with `SameSite=None` session cookies and no CSRF protection on the custom Fastify routes.

### Top 3 to fix first

1. **Fix the ClickHouse SQL injection vectors** (`getSqlParam` url_param:/utm_ branch and `getJourneys` stepFilters). These bypass schema validation and standard escaping, and are reachable with only public-site or scoped-key access. Validate against the allow-list before interpolation and use `SqlString.escape` for map keys / string literals.
2. **Lock down CORS + cookie CSRF posture.** Replace origin reflection with a trusted-origin allow-list, stop combining `credentials:true` with reflected origins, set `SameSite=Lax` (or add CSRF tokens / strict Origin checks if `None` is genuinely required for embedding), and populate `trustedOrigins` from the production `BASE_URL`.
3. **Authorize the GSC OAuth callback.** Add `getUserHasAdminAccessToSite(req, siteId)` after resolving `siteId` from `state`, and replace the plaintext `state=<siteId>` with a signed/server-stored single-use nonce binding `{userId, siteId}`.

---

## HIGH Severity

### H-1. ClickHouse SQL injection via unvalidated `parameter` on `/sites/:siteId/metric`
**CWE-89 (Injection)** — *Merged from findings #2 and #8.*

- **Sink:** `server/src/api/analytics/utils/getFilterStatement.ts:62-71`
- **Source:** `server/src/api/analytics/getMetric.ts:56` (reads `parameter` from querystring), `:354` (`getSqlParam(parameter)`)
- **Route:** `server/src/index.ts:268` — `fastify.get("/sites/:siteId/metric", publicSite, getMetric)`, no querystring schema

`getSqlParam()` builds a ClickHouse map accessor by raw string-templating the parameter key with no escaping. For `url_param:<name>` it returns `url_parameters['${paramName}']` and for `utm_<x>` it returns `url_parameters['${utm}']`. **Both branches `return` before the validating `filterParamSchema.parse(parameter)` at line 98**, so they never hit the enum allow-list. The result is interpolated directly into SELECT and WHERE positions in `getMetric.ts`. Because the route has no Fastify querystring schema and uses `publicSite`, `parameter` arrives fully attacker-controlled.

PoC payload breaks out of the map-key string literal:
```
parameter=url_param:x'] FROM events WHERE site_id=1 UNION SELECT password,1,1 FROM secret--
```

- **Impact:** A public-site or API/private-link-key requester can inject arbitrary SQL into the analytics query, enabling cross-tenant exfiltration (UNION dumping of other sites' events) and resource-exhausting queries. No authenticated session required for public sites.
- **Remediation:** Move `filterParamSchema.parse(parameter)` to the **top** of `getSqlParam` so the url_param:/utm_ branches cannot bypass it, OR escape the map key as `url_parameters[${SqlString.escape(paramName)}]` — matching the existing `feature_flag` branch (line 58) which already does `feature_flags[${SqlString.escape(key)}]`. Additionally add a Fastify querystring schema to the `/metric` route for edge validation.

---

### H-2. ClickHouse SQL injection in `/sites/:siteId/journeys` via `stepFilters`
**CWE-89 (Injection)** — *Merged from findings #3 and #14.*

- **File:** `server/src/api/analytics/getJourneys.ts:42-66` (parse + sink at line 64)
- **Route:** `server/src/index.ts:290` (`publicSite`)

`stepFilters` is `JSON.parse`d with **no Zod schema** into a path map. The exact-match branch builds `journey[${stepIndex}] = '${path.replace(/'/g, "''")}'` using only MySQL-style quote-doubling. ClickHouse also honors backslash escapes inside string literals, so `''` doubling is the wrong escaping. A path of `\' OR 1=1 OR journey[1]='` produces:
```
journey[1] = '\'' OR 1=1 OR journey[1]='''
```
The `\'` is an escaped quote, the doubled sequence closes the literal early, and the trailing ` OR 1=1 OR ...` executes as raw SQL. (The wildcard branch runs `patternToRegex` first, which doubles backslashes, so it is not affected.) Separately, a non-string JSON value (e.g. `{"0": 5}`) reaching `path.includes("*")` throws a 500 (trivial DoS).

- **Impact:** SQL injection into the journeys HAVING clause → arbitrary SQL / cross-tenant data access on any public or keyed site.
- **Remediation:** Validate `stepFilters` with a Zod schema (numeric keys → string values, with length caps) before use, and replace the hand-rolled `.replace(...)` with `SqlString.escape(path)` (and on the regex string), matching `getFunnel`/`getFilterStatement` conventions.

---

### H-3. GSC OAuth callback: IDOR + missing CSRF nonce
**CWE-639 (Broken Access Control)** — *Merged from findings #1 and #4 (plaintext-token aspect tracked in M-3 / L-3).*

- **File:** `server/src/api/gsc/callback.ts:36-112`
- **Initiator:** `server/src/api/gsc/connect.ts:20,34` (checks access, sets `state = numericSiteId.toString()`)

`gscCallback` reads the target `siteId` from the OAuth `state` query parameter (`const siteId = Number(state)`, line 36). The **only** authorization check is that a valid session exists (lines 42-45). It never calls `getUserHasAccessToSite` / `getUserHasAdminAccessToSite` for that `siteId` before writing to `gscConnections` (insert/update at lines 88-112). The `state` is an unsigned plaintext `siteId` with no nonce/HMAC, so the callback's trust in it is misplaced.

Any authenticated user can complete the OAuth flow with **their own** Google account and pass `state=<victim siteId>`, causing the server to write the attacker's Google access/refresh tokens into the victim site's `gscConnections` row (overwriting an existing connection via the UPDATE branch).

- **Impact:** (a) Connection hijack / data injection — the victim's dashboard surfaces the attacker's Search Console data; (b) DoS — clobber a legitimate connection; (c) OAuth CSRF / connection-fixation due to the unbound `state`.
- **Remediation:** After resolving `siteId` from `state`, call `getUserHasAdminAccessToSite(req, siteId)` and reject with 403 if false. Replace the plaintext `state` with a signed/HMAC'd or server-stored single-use nonce encoding both `siteId` and the initiating `userId`, verified on callback.

---

### H-4. Permissive CORS: all origins reflected with credentials enabled
**CWE-942** — *Merged from findings #5 and #11.*

- **File:** `server/src/index.ts:211-218`

`@fastify/cors` is registered with an origin callback that unconditionally calls `callback(null, true)` for every origin, combined with `credentials: true` and all state-changing methods. This reflects the requesting Origin into `Access-Control-Allow-Origin` while setting `Access-Control-Allow-Credentials: true`, on every authenticated route (sites, organizations, stripe, admin) — not just the intentionally-public tracking endpoints.

```js
server.register(cors, {
  origin: (_origin, callback) => { callback(null, true); },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
});
```

- **Impact:** Any malicious site a logged-in user visits can issue credentialed cross-origin requests and **read the JSON responses** (Allow-Origin reflects their origin), exfiltrating analytics/org data. This compounds with H-5 below for state-changing CSRF.
- **Remediation:** Do not reflect arbitrary origins when `credentials:true`. Maintain an allow-list (production dashboard URL + localhost in dev) and only echo the Origin if listed. For genuinely public ingestion endpoints (`/api/track`, `/api/identify`, `/session-replay/record`, embed-stats, tracking-config, feature-flags/evaluate) keep `credentials:false` with scoped/wildcard CORS.

---

### H-5. Session cookies `SameSite=None` with no CSRF token on custom routes
**CWE-352 (CSRF)** — *finding #6.*

- **File:** `server/src/lib/auth.ts:253-259`

better-auth's `defaultCookieAttributes.sameSite` is `'none'` in production, so the session cookie is attached to all cross-site requests. Combined with H-4 (open CORS) and the absence of any CSRF-token middleware on the custom Fastify route groups, every authenticated state-changing endpoint is reachable cross-site with the victim's cookie. `trustedOrigins` is hardcoded to `['http://localhost:3002']` and excludes the production `BASE_URL`, so better-auth's own origin protection is misconfigured for production.

- **Impact:** CSRF against all authenticated custom routes (delete sites, change subscription, add/remove org members) without per-request token validation.
- **Remediation:** Set `SameSite=Lax` (or `Strict`) unless cross-site embedding genuinely requires `None`; if `None` is required, add CSRF-token validation or strict Origin/Referer checks on all state-changing custom routes. Populate `trustedOrigins` from the production `BASE_URL`.

> **Note:** H-4 and H-5 are mutually reinforcing and should be fixed together. Neither alone fully closes the cross-site attack surface.

---

### H-6. AppSumo webhook has no signature/secret verification
**CWE-345** — *finding #7.*

- **File:** `server/src/api/as/webhook.ts:52-101`; route `server/src/index.ts:423`

`POST /api/as/webhook` is registered with no auth middleware. The handler only runs `validateWebhookPayload` (presence of `license_key`/`event` + event allow-list). There is **no HMAC/shared-secret verification** against the request body, unlike the Stripe webhook (`constructEvent` with `STRIPE_WEBHOOK_SECRET`). The handler then writes/updates `appsumo.licenses`, including activating/upgrading licenses and transferring an `organization_id` onto an attacker-chosen `license_key`. The upgrade/downgrade handlers fall back to "any license with an organization" when `prev_license_key` is unknown.

- **Impact:** Any unauthenticated party reaching the endpoint can forge purchase/activate/upgrade/downgrade/deactivate events — creating an "active" license bound to a real organization (subscription-tier escalation) or deactivating a victim's license.
- **Remediation:** Verify an AppSumo-provided signature/HMAC over the raw request body using a shared secret (mirroring the Stripe pattern) before processing; reject unsigned/invalid requests with 401.

---

### H-7. Session replay recordings served under the public-site access gate
**CWE-200 (Sensitive Data Exposure)** — *finding #23.*

- **File:** `server/src/index.ts:328-329`

`GET /sites/:siteId/session-replay/list` and `GET /sites/:siteId/session-replay/:sessionId` are registered with the `publicSite` preHandler. `allowPublicSiteAccess` (`server/src/lib/auth-middleware.ts:153-165`) grants access whenever `site.public` is true (or a matching `x-private-key`/API key is supplied) **without any authenticated session**. `getSessionReplayEvents` then returns the full reconstructed rrweb event stream — the complete recorded DOM of a visitor's session, routinely containing page content, URLs, and non-masked form input.

- **Impact:** Any time a site is flagged `public` (intending to share an aggregate dashboard), or for anyone holding a private-link key, all stored session replays become listable and fully downloadable/replayable unauthenticated. An attacker can enumerate sessions and harvest captured PII / page content.
- **Remediation:** Gate these endpoints behind authenticated site access (`authSite` / `requireSiteAccess`) even when the aggregate dashboard is public — matching the existing `authSite` gate already on the DELETE replay route (`index.ts:330`). Replays are categorically more sensitive than aggregate metrics.

---

## MEDIUM Severity

### M-1. Org admin can create/assign the higher `owner` role, bypassing role hierarchy
**CWE-269 (Privilege Escalation)** — *Merged from findings #9 and #10.*

- **Files:** `server/src/api/user/createUserInOrganization.ts:50-112`; `server/src/api/user/addUserToOrganization.ts:34-86`
- **Routes:** registered with `authOnly` (`index.ts:364`)

Both `POST /organizations/:organizationId/users` and `POST /organizations/:organizationId/members` self-authorize on `role === 'admin' OR 'owner'`, then accept an arbitrary `role` of `admin|member|owner` and insert directly into the `member` table. The better-auth org plugin treats `owner` as the highest role and would not let an admin mint an owner — but these custom routes sidestep that hierarchy. A mere admin can create a new credentialed `owner` account (password hashed via `ctx.password.hash`) or promote a confederate to `owner`.

- **Impact:** An org admin self-escalates to owner-equivalent control (remove other owners/admins, delete/transfer the org, billing).
- **Remediation:** Disallow assigning a role higher than the caller's own. An `admin` caller may create/assign only `member`/`admin`, never `owner`. Restrict `owner` creation to existing owners (or system admins). Centralize the check in both endpoints.

---

### M-2. Insecure default secrets in `.env.example` and compose defaults
**CWE-1188** — *finding #12.*

- **File:** `.env.example:7,22,26` (and `docker-compose*.yml` fallbacks)

Ships `BETTER_AUTH_SECRET=insecure-secret`, `CLICKHOUSE_PASSWORD=frog`, `POSTGRES_PASSWORD=frog`. Compose files bake in `${POSTGRES_PASSWORD:-frog}`, `${CLICKHOUSE_PASSWORD:-frog}`, `${REDIS_PASSWORD:-changeme}`. An operator who copies the example or relies on compose defaults runs with a publicly known auth-signing secret (forgeable session tokens → account takeover) and guessable DB credentials. (`setup.sh` does generate a random secret, but the example/compose paths remain a foot-gun.)

- **Remediation:** Do not ship a usable default for `BETTER_AUTH_SECRET` — leave it empty and fail startup if unset. Remove weak password defaults from compose fallbacks; require operators to set them.

---

### M-3. Cloud docker-compose publishes datastores to all interfaces with weak default credentials
**CWE-1188** — *finding #25.*

- **File:** `docker-compose.cloud.yml:49-81`

The cloud variant maps Postgres `5432`, ClickHouse `8123/9000`, and Redis `6379` to the host **without** binding to `127.0.0.1` (the non-cloud compose binds backend/client to localhost). Credentials default to `frog`/`changeme`; a comment on the Redis port states it is "Exposed to internet for remote connections", and ClickHouse `network.xml` binds `listen_host 0.0.0.0`.

- **Impact:** On any host where these ports are not firewalled, the entire analytics dataset and app metadata (users, orgs, billing) are directly reachable; with default creds an attacker gets full read/write without touching the application.
- **Remediation:** Bind datastore host port mappings to `127.0.0.1` (or remove host port mappings and rely on the internal docker network). Require strong generated passwords; do not expose Redis to the internet.

---

### M-4. GSC OAuth tokens stored in plaintext
**CWE-312** — *Merged from findings #13 and #19 (the CSRF/IDOR aspects of these reports are covered by H-3).*

- **File:** `server/src/api/gsc/callback.ts:88-112`

The callback writes Google `access_token` and `refresh_token` directly into the `gscConnections` Postgres table with no encryption at rest. Refresh tokens are long-lived credentials. On token-exchange failure the full Google error body is logged (line 71), which can include grant details.

- **Impact:** A Postgres compromise (or any SQL-read access — see M-3's exposed Postgres port) yields usable long-lived Google refresh tokens for every connected site.
- **Remediation:** Encrypt OAuth tokens at rest (application-level envelope encryption with a KMS-managed key, or pgcrypto). Avoid logging raw token-exchange error bodies.

---

## LOW Severity

### L-1. API key accepted via query string
**CWE-598** — *finding #15.*

- **File:** `server/src/lib/auth-utils.ts:242-243,316-317`

`checkApiKey`/`getUserIdFromRequest` accept the key from `?api_key=` as an alternative to the `Authorization: Bearer` header. Query-string secrets are captured in access logs, reverse-proxy logs (Caddy), browser history, and the Referer header. The same scoped key grants read and admin actions.

- **Remediation:** Accept keys only via the `Authorization` header. If query keys must remain for compatibility, document as testing-only and strip them from all logging/Referer.

---

### L-2. Private-link key has 48-bit entropy and is compared non-constant-time
**CWE-208** — *finding #16.*

- **File:** `server/src/lib/auth-utils.ts:352`; generation at `server/src/api/sites/updateSitePrivateLinkConfig.ts:36`

The `x-private-key` header is compared with `===` (not constant-time), and the key is generated as `crypto.randomBytes(6).toString('hex')` — only 48 bits / 12 hex chars. The low entropy is the material weakness; the non-constant-time compare is a minor timing oracle. This key guards unauthenticated read access to a non-public site's full analytics.

- **Remediation:** Generate with substantially more entropy (e.g. `crypto.randomBytes(24)`) and compare with `crypto.timingSafeEqual` on equal-length buffers.

---

### L-3. Sensitive data logged: full user record on signup, AppSumo payload/license keys
**CWE-532** — *Merged from findings #17, #18, and #20.*

- **Files:** `server/src/lib/auth.ts:264` (`console.log(u)` on every signup — dumps email/name/PII, bypassing the structured logger); `server/src/api/as/webhook.ts:66,84,108-161` (logs full payload + `license_key`/`prev_license_key` at info level). Fastify logger is configured at `debug` level (`index.ts:178-182`).

`license_key` is the bearer secret granting subscription tier (and the webhook is forgeable per H-6), so logging it persists replayable secrets. The user object exposes PII.

- **Remediation:** Remove `console.log(u)` (or log only a non-PII id at debug). Do not log full webhook payloads; redact/hash `license_key`/`prev_license_key`. Set production log level to info/warn.

---

### L-4. No security response headers (HSTS/CSP/X-Frame-Options/etc.)
**CWE-693** — *finding #21.*

- **File:** `server/src/index.ts:211-225`; `Caddyfile`

No `@fastify/helmet` (or Caddy `header` directives) is registered. No HSTS, CSP, X-Content-Type-Options, X-Frame-Options/frame-ancestors, or Referrer-Policy. Given the dashboard renders session-replay content and a public iframe widget, the absence of CSP/frame controls reduces defense-in-depth against XSS and clickjacking.

- **Remediation:** Register `@fastify/helmet` (or add Caddy `header` directives) for HSTS, a restrictive CSP, `nosniff`, frame-ancestors, and Referrer-Policy. Scope frame-ancestors for the intended embed widget.

---

### L-5. `@fastify/rate-limit` declared but never registered
**CWE-770** — *finding #22.*

- **File:** `package.json:39` (dependency); `server/src/index.ts:268,290,306,327,442-443` (unprotected routes)

`@fastify/rate-limit` is a declared dependency but `fastify.register(rateLimit, ...)` is never called. The only throttling is inside better-auth's apiKey plugin (API-key requests only). High-volume public endpoints — `POST /api/track`, `/api/identify`, `/session-replay/record/:siteId`, `/site/:siteId/feature-flags/evaluate` — and the better-auth login routes have no app-level rate limit, each accepting up to the 10MB global body limit. Self-host login is captcha-free.

- **Impact:** Unauthenticated event-flooding / ClickHouse data pollution, feature-flag-evaluation abuse (each triggers geo lookup + Postgres query), and credential-stuffing/brute-force against login with no throttle.
- **Remediation:** Register `@fastify/rate-limit` globally and/or apply per-route `config.rateLimit` to public ingestion and auth endpoints, keyed by IP. Tighten limits in cloud vs self-host.

---

## INFO (Latent — not currently exploitable)

### I-1. Session/geo data interpolated into innerHTML without HTML-escaping in globe tooltips
**CWE-79 (XSS)** — *finding #24.*

- **File:** `client/src/app/[site]/globe/utils/timelineTooltipBuilder.ts:63-108`; sinks at `useOpenLayersTimelineLayer.ts:280,417`, `useOpenLayersCoordinatesLayer.ts:199-210`

`buildTooltipHTML()` interpolates `session.city`, `country`, `browser`, `operating_system`, `device_type`, `referrerText`, `pageviews/events`, and `session_id` into an HTML string with **no escaping**, assigned via `innerHTML`. All values originate from data ingested through the public `/api/track` endpoint.

- **Status:** **Not provably exploitable today** — the directly attacker-controlled free-form fields are normalized upstream before reaching the sink: `referrer` is reduced to a hostname (`extractDomain`) or a fixed channel enum, `user_id` is rendered through `renderToStaticMarkup` (escaped), and city/browser/os/device come from MaxMind geo and UA-parser enum tables. The risk is that escaping is entirely absent, so safety depends on every current and future source field staying server-normalized — fragile against a new field, an import mapper, or a UA-parser edge case.
- **Remediation:** HTML-escape every interpolated value (reuse the `escapeHTML` helper already implemented in `client/src/app/widget/[siteId]/route.ts:267`, or DOMPurify), and prefer building DOM nodes with `textContent` over string concatenation.

---

## Appendix: Deduplication Map

| Report ID(s) | Consolidated as |
|--------------|-----------------|
| #2, #8 | H-1 (metric SQL injection) |
| #3, #14 | H-2 (journeys SQL injection) |
| #1, #4 | H-3 (GSC callback IDOR/CSRF) |
| #5, #11 | H-4 (permissive CORS) |
| #6 | H-5 (SameSite=None CSRF) |
| #7 | H-6 (AppSumo webhook) |
| #23 | H-7 (public session replays) |
| #9, #10 | M-1 (owner-role escalation) |
| #12 | M-2 (default secrets) |
| #25 | M-3 (exposed datastores) |
| #13, #19 | M-4 (plaintext GSC tokens) |
| #15 | L-1 (API key in query) |
| #16 | L-2 (private-link key entropy) |
| #17, #18, #20 | L-3 (sensitive logging) |
| #21 | L-4 (missing security headers) |
| #22 | L-5 (no rate limiting) |
| #24 | I-1 (globe tooltip XSS, latent) |