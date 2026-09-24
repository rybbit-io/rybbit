# Rybbit feature/endpoint audit — implementation vs documentation

_Generated 2026-07-06 by an 18-area end-to-end audit (docs -> route -> auth preHandler -> handler -> ClickHouse/Drizzle -> client consumption). Every finding in "Confirmed findings" survived an independent adversarial verification pass that re-traced the code from scratch and was instructed to refute it. Findings whose verifier was killed by a rate limit are listed separately under "Unverified candidates"._

**Confirmed: 171 findings — 22 high, 61 medium, 88 low.** Unverified candidates: 10. Refuted during verification: 2.

## Cross-cutting root causes

Three defects account for a large share of the high-severity findings; fixing each once resolves symptoms across many endpoints:

1. **Fresh installs create a ClickHouse `events` table missing ~10 columns** (`identified_user_id`, `ip`, `timezone`, `tag`, `lcp`, `cls`, `inp`, `fcp`, `ttfb`, `import_id`). Commit `b5ad50a4` deleted the `ensureEventsColumns()` migration without folding those columns into the `CREATE TABLE` in `server/src/db/clickhouse/clickhouse.ts:44-76`. On a new install: all sessions/users/user-traits endpoints 500, GET /events 500s, all three performance endpoints 500, import deletion 500s, and ingestion silently discards ip/timezone/tag/identify/web-vitals data. Existing installs are unaffected (columns already exist), which is why this is invisible in dev/cloud.
2. **Missing or invalid time parameters are silently swallowed** (`server/src/api/analytics/utils/utils.ts:36-44`, `query-validation.ts:96`): endpoints return **all-time** data with HTTP 200 instead of a 400 — and the docs' own example requests (which omit `time_zone`) trigger this on overview, events, funnels, journeys, sessions and more. A variant makes `GET /overview/time-series` 500 (`toTimeZone(timestamp, NULL)`).
3. **Multi-value negative filters are tautologies** (`server/src/api/analytics/utils/getFilterStatement.ts:346-358` and the lite/session-level variants): `not_equals`/`not_contains` with more than one value OR-joins the negations — `(country != 'US' OR country != 'CA')` is always true — so the filter silently matches everything. The dashboard UI's multi-select "Is not"/"Not contains" hits this on every analytics endpoint.


---

## bots (8)


### [MEDIUM] Incomplete or malformed time parameters are silently swallowed on bots/overview and bots/by-dimension, returning all-time data with HTTP 200

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx states 'All endpoints require date-based, exact datetime, or relative time parameters' and 'You must provide either: All three date parameters (start_date, end_date, time_zone), OR ...'; the error table promises 400 Bad Request for invalid parameters. A request with start_date/end_date but no time_zone (or a bad date format) should be rejected.
- **Actual:** The time constraint is silently dropped and the query runs over the entire table, so the caller gets a 200 response whose numbers cover all history instead of the requested range.
- **Code:** `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:40-44`, `server/src/api/analytics/utils/query-validation.ts:92-100`, `server/src/api/analytics/bots/getBotOverview.ts:28`, `server/src/api/analytics/bots/getBotDimension.ts:50`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/bots/overview.mdx`, `docs/content/docs/api/bots/by-dimension.mdx`


### [MEDIUM] bots/by-dimension returns 500 'Failed to fetch bot dimension' for a missing or invalid required `dimension` parameter instead of a 400

- **Kind:** docs-mismatch
- **Expected:** by-dimension.mdx marks `dimension` as required with a closed enum of 15 values; getting-started.mdx documents 400 Bad Request for invalid parameters with an error message 'describing what went wrong'.
- **Actual:** Omitting `dimension` or passing any value outside BOT_DIMENSIONS (e.g. `dimension=language`, `dimension=querystring` — both valid FilterParameters and valid values of the exported BotDimensionKey type) throws inside getQuery; the catch-all returns HTTP 500 with the generic body {"error":"Failed to fetch bot dimension"}, discarding the specific 'Unsupported bot dimension: X' message.
- **Code:** `server/src/api/analytics/bots/getBotDimension.ts:44-47`, `server/src/api/analytics/bots/getBotDimension.ts:113-116`, `server/src/index.ts:341`
- **Docs:** `docs/content/docs/api/bots/by-dimension.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] bots/time-series returns 500 for documented-invalid inputs (bucket outside the enum, or date range without time_zone) instead of 400

- **Kind:** docs-mismatch
- **Expected:** time-series.mdx defines `bucket` as a closed enum; getting-started.mdx says time_zone is 'Required with date and exact datetime ranges' and documents 400 for invalid parameters.
- **Actual:** Both invalid inputs surface as HTTP 500 {"error":"Failed to fetch bot time series"}: (a) bucket=daily with a bounded range throws a ZodError from timeBucketSchema.parse; (b) start_date+end_date without time_zone throws a ZodError from filterParamsTimeStatementFillSchema; (c) an invalid bucket with no time params emits literal `undefined(` into the SQL and ClickHouse rejects the query.
- **Code:** `server/src/api/analytics/bots/getBotTimeSeries.ts:29-38`, `server/src/api/analytics/bots/getBotTimeSeries.ts:62-65`, `server/src/api/analytics/bots/utils.ts:195-196`, `server/src/api/analytics/utils/query-validation.ts:218-228`, `server/src/api/analytics/utils/query-validation.ts:322-330`, `server/src/api/analytics/utils/query-validation.ts:176-187`
- **Docs:** `docs/content/docs/api/bots/time-series.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] Invalid `layer` values are silently ignored, returning unrestricted data the caller will misread as layer-filtered

- **Kind:** unexpected-behavior
- **Expected:** All three bot docs define `layer` as a closed enum ('ua_pattern' | 'header_heuristics' | 'client_signals' | 'bot_asn' | 'rate_anomaly') that 'Restrict[s] results to a single detection layer'; the API error contract documents 400 for invalid parameters.
- **Actual:** getBotLayerStatement returns "" for any unrecognized layer value (typo, wrong case like `layer=UA_PATTERN`, or e.g. `layer=asn`), so the endpoint returns 200 with completely unfiltered totals that the caller believes are restricted to one layer.
- **Code:** `server/src/api/analytics/bots/utils.ts:55-62`, `server/src/api/analytics/bots/getBotOverview.ts:30`, `server/src/api/analytics/bots/getBotTimeSeries.ts:28`, `server/src/api/analytics/bots/getBotDimension.ts:52`
- **Docs:** `docs/content/docs/api/bots/overview.mdx`, `docs/content/docs/api/bots/time-series.mdx`, `docs/content/docs/api/bots/by-dimension.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] The `user_id` filter on bot endpoints matches only the device fingerprint, not the documented 'both device fingerprint and custom identified user ID'

- **Kind:** docs-mismatch
- **Expected:** All three bot docs list `user_id` among the supported filter parameters and point to the Common Parameters contract, where user_id is documented as 'Matches both device fingerprint and custom identified user ID'.
- **Actual:** getBotFilterStatement compiles a user_id filter to a plain `user_id = '...'` condition on the bot_events (and, in overview, events) tables. A caller filtering by a custom identified user ID gets zero rows even though the same filter works on every non-bot analytics endpoint.
- **Code:** `server/src/api/analytics/bots/utils.ts:100-121`, `server/src/api/analytics/bots/utils.ts:189`, `server/src/api/analytics/utils/getFilterStatement.ts:270-294`, `server/src/db/clickhouse/clickhouse.ts:90-126`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/bots/overview.mdx`, `docs/content/docs/api/bots/time-series.mdx`, `docs/content/docs/api/bots/by-dimension.mdx`


### [LOW] bots/by-dimension pagination is non-deterministic for tied counts: no tie-breaker in ORDER BY, so rows can repeat or disappear across pages

- **Kind:** unexpected-behavior
- **Expected:** by-dimension.mdx documents `limit`/`page` pagination over dimension values with a totalCount, implying that iterating pages 1..N yields each distinct value exactly once.
- **Actual:** The data query is `ORDER BY count DESC LIMIT {limit} OFFSET {offset}` with no secondary sort key. ClickHouse gives no stable order for rows with equal `count`, and each page is a separate query execution, so bot dimension values sharing a count (extremely common — long tails of count=1 pathnames/referrers) can appear on two pages or on none.
- **Code:** `server/src/api/analytics/bots/getBotDimension.ts:78-83`, `server/src/api/analytics/bots/getBotDimension.ts:88-103`
- **Docs:** `docs/content/docs/api/bots/by-dimension.mdx`


### [LOW] bot_events has an undocumented 3-month TTL, so bot endpoints silently under-report for older ranges and overview's bot_percentage mixes truncated bot data with full events history

- **Kind:** unexpected-behavior
- **Expected:** bot-detection.mdx promises 'Rybbit still stores a compact bot event record so you can inspect what was filtered', and the API docs accept arbitrary start_date/end_date ranges, with bot_percentage defined as 'Bot requests as a percentage of all requests'. Nothing documents a retention limit on bot data.
- **Actual:** bot_events rows expire after 3 months (`TTL timestamp + INTERVAL 3 MONTH`) while the events table has no TTL. For a range reaching further back (e.g. start_date one year ago), bot_requests/time-series/by-dimension only cover the last ~3 months, and getBotOverview computes total_events = expired-bot-window + full-year events (lines 48-77), so bot_percentage is systematically understated with no indication to the caller.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:125`, `server/src/api/analytics/bots/getBotOverview.ts:48-77`
- **Docs:** `docs/content/docs/(docs)/bot-detection.mdx`, `docs/content/docs/api/bots/overview.mdx`


### [LOW] For mobile-type sites the ua_pattern and header_heuristics layers never run, contradicting the doc's 'Rybbit runs all detection layers before making a final decision'

- **Kind:** docs-mismatch
- **Expected:** bot-detection.mdx ('How Decisions Are Made' and 'Detection Layers') states: 'Rybbit does not stop at the first matching layer. It runs every layer, records all matches, and then makes one final decision', with no stated exceptions.
- **Actual:** When the site type is 'mobile', layers 1 (ua_pattern) and 2 (header_heuristics) are skipped entirely, so bot traffic against mobile sites can never be flagged or recorded under those layers — the corresponding overview counters (ua_pattern, header_heuristics) are permanently 0 for such sites regardless of traffic.
- **Code:** `server/src/services/tracker/botBlocking/index.ts:209-235`, `server/src/services/tracker/trackEvent.ts:296`
- **Docs:** `docs/content/docs/(docs)/bot-detection.mdx`


---

## errors (10)


### [HIGH] Errors page ignores 'past-minutes' time ranges: names/events queries silently run over ALL TIME

- **Kind:** broken
- **Expected:** When the user selects a 'Last 30 minutes' / 'Last hour' / 'Last 6 hours' / 'Last 24 hours' preset in the dashboard date selector, the error names list and the expanded error-events list should be scoped to that window (by sending past_minutes_start/past_minutes_end), like every other dashboard view.
- **Actual:** useGetErrorNamesPaginated/useGetErrorNames and useGetErrorEventsInfinite build time params with getStartAndEndDate(time), which returns {startDate: null, endDate: null} for mode 'past-minutes' (client/src/api/utils.ts:40-42). The hooks then send startDate:'' / endDate:'' and never send past_minutes_*. toQueryParams' default branch (types.ts:74-80) emits start_date:'' and end_date:''. On the server, getTimeStatement only builds a date constraint when `start_date && end_date && time_zone` are all truthy (utils.ts:36); empty strings are falsy, so it returns '' (utils.ts:89-90) and the ClickHouse query has NO time filter — the list shows all-time error counts/events regardless of the selected past-minutes window. Exact-time 'range' selections are also degraded to whole days (getStartAndEndDate drops startTime/endTime).
- **Code:** `client/src/api/analytics/hooks/errors/useGetErrorNames.ts:25`, `client/src/api/analytics/hooks/errors/useGetErrorNames.ts:30-37`, `client/src/api/analytics/hooks/errors/useGetErrorEvents.ts:10`, `client/src/api/analytics/hooks/errors/useGetErrorEvents.ts:15-23`, `client/src/api/utils.ts:40-42`, `client/src/api/analytics/endpoints/types.ts:74-80`, `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:89-90`, `client/src/components/DateSelector/DateSelector.tsx:289-330`
- **Evidence:** Trace: DateSelector presets set time.mode='past-minutes' with pastMinutesStart 30/60/360/1440 (DateSelector.tsx:289-330). useGetErrorNamesPaginated calls getStartAndEndDate(time) (useGetErrorNames.ts:25) -> nulls -> fetchErrorNames({startDate:'', endDate:'', ...}) with no pastMinutes fields, so toQueryParams takes the date-range branch and sends start_date=''&end_date='' (types.ts:74-80). Server getErrorNames -> getTimeStatement(request.query) (getErrorNames.ts:35) -> `start_date && end_date && time_zone` is false for '' (utils/utils.ts:36); pastMinutesRange undefined; the Zod refine 'either date/dateTimeRange/pastMinutesRange' fails but is swallowed by .catch (query-validation.ts:96-100) -> returns '' -> CTE WHERE has only site_id/type/message conditions (getErrorNames.ts:68-76). Same path for getErrorEvents (useGetErrorEvents.ts:15-23, getErrorEvents.ts:52). By contrast, the sparkline on the very same row uses useGetErrorBucketed -> buildApiParams(time) which DOES send past_minutes_start/end (client/src/api/utils.ts:63-71, useGetErrorBucketed.ts:15), so the chart is scoped to the window while the counts/events beside it are all-time — visibly inconsistent numbers on the Errors page.


### [MEDIUM] errors/time-series WITH FILL is not bucket-aligned in past_minutes mode, producing misaligned zero rows (and mixed-timezone time strings)

- **Kind:** broken
- **Expected:** Every `time` value in the response is the 'Start of the time bucket' (time-series.mdx ErrorBucket table), and gap-filled buckets align with the real data buckets — as done in getOverviewBucketed, which wraps fill boundaries in TimeBucketToFn (getOverviewBucketed.ts:68-70: `FROM ${TimeBucketToFn[validatedBucket]}(toDateTime(...))`).
- **Actual:** For past_minutes requests, getErrorBucketed's local getTimeStatementFill emits `WITH FILL FROM now() - INTERVAL X MINUTE TO now() - INTERVAL Y MINUTE STEP ...` (getErrorBucketed.ts:37-40) without applying the bucket function. The SELECT's time column IS bucket-aligned: `toStartOfHour(toTimeZone(timestamp, tz))` (line 77). ClickHouse generates fill rows at FROM, FROM+STEP, ... (arbitrary second-precision timestamps like 15:23:47) which never coincide with the aligned data rows (15:00:00), so the result interleaves synthetic error_count=0 rows at non-bucket timestamps with the real buckets. Additionally the fill boundary expressions evaluate in the ClickHouse server's default timezone while data rows are rendered in the requested time_zone, so the serialized `time` strings mix timezones; the client parses all of them as the user's timezone (ErrorSparklineChart.tsx:30-33).
- **Code:** `server/src/api/analytics/getErrorBucketed.ts:37-40`, `server/src/api/analytics/getErrorBucketed.ts:77`, `server/src/api/analytics/getOverviewBucketed.ts:60-70`, `client/src/app/[site]/errors/components/ErrorSparklineChart.tsx:30-33`
- **Docs:** `docs/content/docs/api/errors/time-series.mdx`


### [MEDIUM] Invalid `filters`, `bucket`, or time-series time parameters return 500 (Fastify default error body), not the documented 400 {error} response

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx 'Error Responses' documents 400 Bad Request for invalid parameters with body `{ "error": "..." }`. time-series.mdx documents `bucket` as required with enum values, so a missing/invalid bucket is an invalid-parameter case (400).
- **Actual:** There is no fastify setErrorHandler anywhere in server/src, and all parameter validation for these routes throws OUTSIDE the handlers' try blocks: getErrorNames builds the query (getErrorNamesQuery -> getFilterStatement -> validateFilters, which throws Error('Invalid JSON format') or ZodError) at line 112, before the try at line 114; getErrorEvents does the same at line 144; getErrorBucketed calls getFilterStatement and getTimeStatementFill at lines 70-72 before its try. getTimeStatementFill validates via timeBucketSchema.parse(bucket) (query-validation.ts:323) and filterParamsTimeStatementFillSchema.parse (no .catch, refine requires a complete time-param set), both of which throw. So `filters=notjson`, `filters=[{"parameter":"bogus"...}]`, an invalid regex filter or a >500-char regex pattern (getFilterStatement.ts:143-155), `bucket=banana`, a missing bucket, or missing/invalid time params on time-series all surface as HTTP 500 with Fastify's default `{statusCode:500, error:"Internal Server Error", message:...}` body instead of the documented 400 `{error}` shape.
- **Code:** `server/src/api/analytics/getErrorNames.ts:112`, `server/src/api/analytics/getErrorEvents.ts:144`, `server/src/api/analytics/getErrorBucketed.ts:70-72`, `server/src/api/analytics/utils/query-validation.ts:323-324`, `server/src/api/analytics/utils/query-validation.ts:337-348`, `server/src/api/analytics/utils/getFilterStatement.ts:116`, `server/src/api/analytics/utils/getFilterStatement.ts:143-155`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/errors/time-series.mdx`


### [MEDIUM] names/events: invalid or missing time parameters are silently ignored and all-time data is returned with 200

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx: 'All endpoints require date-based, exact datetime, or relative time parameters' and 'You must provide either' one of the three complete parameter sets; invalid parameters should produce 400 Bad Request.
- **Actual:** For /errors/names and /errors/events, getTimeStatement validates the time params with timeStatementParamsSchema, which ends in `.catch({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined})` (query-validation.ts:95-100). Any validation failure — malformed date like start_date=01/15/2024, an invalid time_zone, omitting time_zone while sending start_date/end_date, or omitting time params entirely — is swallowed, getTimeStatement returns '' (utils.ts:89-90), and the ClickHouse query runs with no time constraint. The API returns 200 with results computed over the site's entire history, so a caller with a typo silently gets numbers for the wrong period rather than an error. (The time-series endpoint behaves differently: the same situations throw and become 500s, per the separate finding.)
- **Code:** `server/src/api/analytics/utils/query-validation.ts:95-100`, `server/src/api/analytics/utils/utils.ts:40-49`, `server/src/api/analytics/utils/utils.ts:89-90`, `server/src/api/analytics/getErrorNames.ts:35`, `server/src/api/analytics/getErrorEvents.ts:52`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Feature guide promises 'First/Last Seen' and 'Affected Users' which the error-tracking implementation does not provide

- **Kind:** docs-mismatch
- **Expected:** feature-guides/errors.mdx ('For each error, you'll see:') promises 'Affected Users - Number of unique users who encountered this error' and 'First/Last Seen - When the error first appeared and most recently occurred'.
- **Actual:** No error endpoint computes first-seen/last-seen: getErrorNames' CTE selects only message, any(event_name), count(*), and count(DISTINCT session_id) (getErrorNames.ts:62-66) and returns value/errorName/count/sessionCount/percentage (lines 88-103) — there is no min(timestamp)/max(timestamp) anywhere in getErrorNames.ts, getErrorEvents.ts, or getErrorBucketed.ts, and the Errors UI shows only 'occurrences' and 'sessions' stats (ErrorListItem.tsx:58-77). 'Affected Users' is also not implemented as documented: the metric is `count(DISTINCT session_id) as unique_sessions` — unique sessions, not unique users (one user with three sessions that hit the error counts as 3), and both the API field name (sessionCount) and the UI label ('sessions') expose sessions.
- **Code:** `server/src/api/analytics/getErrorNames.ts:60-78`, `server/src/api/analytics/getErrorNames.ts:88-103`, `client/src/app/[site]/errors/components/ErrorListItem.tsx:58-77`
- **Docs:** `docs/content/docs/(docs)/feature-guides/errors.mdx`


### [LOW] Documented ISO 8601 datetimes are actually ClickHouse 'YYYY-MM-DD HH:MM:SS' strings, and time-series times are in the requested timezone, not UTC

- **Kind:** docs-mismatch
- **Expected:** events.mdx types `timestamp` as 'ISO 8601 datetime' with example "2024-01-31T14:22:00.000Z"; time-series.mdx types `time` as 'ISO 8601 datetime' with example "2024-01-30T00:00:00.000Z" (UTC).
- **Actual:** Both endpoints stream ClickHouse JSONEachRow output straight through, so DateTime columns are serialized in ClickHouse's default text format 'YYYY-MM-DD HH:MM:SS' — no 'T', no milliseconds, no zone designator. Worse for time-series: the value is `toStartOfX(toTimeZone(timestamp, {timeZone:String}))` (getErrorBucketed.ts:77), i.e. a wall-clock time in the caller-supplied time_zone, while the docs' example shows UTC 'Z' times. An API consumer parsing the documented format gets invalid dates or times shifted by the timezone offset.
- **Code:** `server/src/api/analytics/getErrorEvents.ts:90`, `server/src/api/analytics/getErrorBucketed.ts:77`, `client/src/app/[site]/errors/components/ErrorDetails.tsx:56`, `client/src/app/[site]/errors/components/ErrorSparklineChart.tsx:30-33`
- **Docs:** `docs/content/docs/api/errors/events.mdx`, `docs/content/docs/api/errors/time-series.mdx`


### [LOW] errors/events: the documented `page` parameter switches the response to an undocumented nested paginated shape

- **Kind:** docs-mismatch
- **Expected:** events.mdx documents `page` ('Page number (1-indexed)') as a query parameter and documents the response as `data: ErrorEvent[]` ('Array of error event objects'); nothing in the response section mentions a different shape when page is used.
- **Actual:** Whenever `page` is present (getErrorEvents.ts:142 `page !== undefined` — even page=1), the handler returns `{ data: { data: ErrorEvent[], totalCount } }` (line 169) instead of `{ data: ErrorEvent[] }` (line 171). A consumer following the docs and adding page=2 to walk results will find response.data is no longer an array (`data.map` breaks) and will not know about totalCount. Unlike names.mdx, which at least flags 'Enables paginated response format', events.mdx documents no paginated variant at all.
- **Code:** `server/src/api/analytics/getErrorEvents.ts:142`, `server/src/api/analytics/getErrorEvents.ts:157-171`
- **Docs:** `docs/content/docs/api/errors/events.mdx`


### [LOW] names `percentage` is not 'Percentage of total error sessions' — denominator double-counts sessions that hit multiple distinct errors

- **Kind:** docs-mismatch
- **Expected:** names.mdx documents `percentage` as 'Percentage of total error sessions', i.e. sessionCount / (count of distinct sessions that had any error) * 100.
- **Actual:** The SQL computes `ROUND(unique_sessions * 100.0 / SUM(unique_sessions) OVER (), 2)` (getErrorNames.ts:95-98). The denominator is the SUM of per-message distinct-session counts, so a session that encountered N distinct error messages is counted N times in the denominator. Whenever sessions hit more than one distinct error, every error's percentage is deflated relative to the documented definition (e.g. 10 sessions each hitting errors A and B yields 50%/50% instead of the documented 100%/100%).
- **Code:** `server/src/api/analytics/getErrorNames.ts:93-98`
- **Docs:** `docs/content/docs/api/errors/names.mdx`


### [LOW] Unauthenticated requests to a private site's error endpoints return 403, while docs document 401 for missing/invalid API key

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx Error Responses: '401 - Unauthorized (missing or invalid API key)' and '403 - Forbidden (no access to site)'. A request with no credentials or a bad API key should therefore get 401.
- **Actual:** The three error routes use the `publicSite` preHandler (index.ts:176, 282-284) -> allowPublicSiteAccess (auth-middleware.ts:153-177). When there is no session, no valid API key, no private key, and the site is not public, the middleware's only failure response is `reply.status(403).send({ error: 'Forbidden' })` (auth-middleware.ts:176). There is no 401 path at all for these endpoints — a missing or invalid Bearer token is indistinguishable from lacking site access. (Also worth knowing: if the site is flagged public, getUserHasAccessToSitePublic returns true with zero credentials, so 'All API requests must include authentication' does not hold for public sites.)
- **Code:** `server/src/index.ts:176`, `server/src/index.ts:282-284`, `server/src/lib/auth-middleware.ts:153-177`, `server/src/lib/auth-utils.ts:357-383`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Error message/stack truncation during ingestion is a no-op: the refine mutates a discarded object and the raw properties string is stored

- **Kind:** unexpected-behavior
- **Expected:** trackEvent.ts's error-event schema comments '// Apply truncation limits' and truncates parsed.message to 500 chars and parsed.stack to 2000 chars, so stored error props should be capped at those lengths before reaching the errors endpoints.
- **Actual:** The truncation happens inside a Zod `.refine()` predicate on a locally-parsed copy (`const parsed = JSON.parse(val)`); refine only returns a boolean and the mutated `parsed` is thrown away. The validated payload keeps the ORIGINAL `properties` string, and the insert path re-parses that raw string (pageviewQueue.ts:16-22 getParsedProperties, used at line 100 `props: getParsedProperties(pv.properties)`). Messages up to ~4000+ chars (bounded only by the overall .max(4096) on the properties string) are stored and served untruncated by /errors/names and /errors/events; the 500/2000-char limits never take effect.
- **Code:** `server/src/services/tracker/trackEvent.ts:138-143`, `server/src/services/tracker/pageviewQueue.ts:16-22`, `server/src/services/tracker/pageviewQueue.ts:100`


---

## events (8)


### [HIGH] Fresh installs never create identified_user_id/tag/timezone columns on the events table, so GET /events 500s on every request and the documented tag filter 500s on all events endpoints

- **Kind:** broken
- **Expected:** list.mdx documents identified_user_id as a response field of GET /api/sites/:site/events; tagging.mdx promises 'The tag filter works on all dashboard pages including ... events'; getting-started.mdx documents a timezone filter parameter. All of these require the identified_user_id, tag, and timezone columns to exist on the ClickHouse events table.
- **Actual:** initializeClickhouse (the only ClickHouse DDL in the repo, run at startup from server/src/index.ts:476) creates the events table with only the columns at clickhouse.ts:44-72 — no identified_user_id, tag, timezone, lcp, cls, inp, fcp, ttfb, ip, or import_id — and the only ALTER on events (clickhouse.ts:79-85) adds feature_flags. On a fresh database, getEvents selects identified_user_id (getEvents.ts:52) so every GET /events request fails with a ClickHouse UNKNOWN_IDENTIFIER error and returns 500 'Failed to fetch events'; any request to the six events endpoints with a filters entry using parameter 'tag' or 'timezone' (both accepted by query-validation.ts:257-292) generates SQL against a nonexistent column and 500s; ingestion (pageviewQueue.ts:78,110) writes identified_user_id/tag values into columns that don't exist.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:44`, `server/src/db/clickhouse/clickhouse.ts:79`, `server/src/api/analytics/events/getEvents.ts:52`, `server/src/services/tracker/pageviewQueue.ts:78`, `server/src/services/tracker/pageviewQueue.ts:110`, `server/src/api/analytics/utils/query-validation.ts:287`
- **Docs:** `docs/content/docs/(docs)/tagging.mdx`, `docs/content/docs/api/events/list.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** git history: commit bd89efdc ('Add tagging') added 'ADD COLUMN IF NOT EXISTS tag LowCardinality(String)' to an ALTER TABLE events block in clickhouse.ts that also added lcp, cls, inp, fcp, ttfb, ip, timezone, identified_user_id, import_id. Commit 14952b4a ('Bot blocking v2', 2026-05-20) deleted that entire ALTER block (git show 14952b4a shows the removed lines) and added nothing equivalent; the fix-up commit 5d4820a6 ('utility function to check and add missing columns in the events table') is NOT an ancestor of HEAD (git merge-base --is-ancestor fails). `git grep 'ADD COLUMN IF NOT EXISTS lcp' HEAD -- server` and a working-tree grep for 'ALTER TABLE events' both confirm no surviving DDL creates these columns. Existing deployments that ran the old ALTER still have the columns, which is why this only detonates on new self-hosted installs of current master.


### [HIGH] Date-range params are silently discarded whenever time_zone is missing or any time param is invalid — the docs' own example requests for events list/names/properties/outbound return unbounded all-time data

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx: 'You must provide either all three date parameters (start_date, end_date, time_zone) ...' and 400 Bad Request for invalid parameters. Every request-code example in list.mdx:184, names.mdx:68, properties.mdx:82, and outbound.mdx:73 sends only start_date=2024-01-01&end_date=2024-01-31 (no time_zone) and the docs present the response as data for that January range.
- **Actual:** getTimeStatement (utils.ts:36) only builds a date range when start_date AND end_date AND time_zone are all present; otherwise the constructed params object fails timeStatementParamsSchema's refine ('Either date, dateTimeRange, or pastMinutesRange must be provided', query-validation.ts:92) and the schema's .catch() (query-validation.ts:96-100) swallows the failure, so getTimeStatement returns '' (utils.ts:90) and the query runs with no timestamp bound at all. The exact cURL requests printed in the four events docs therefore return ALL-TIME data with HTTP 200, not January data and not a 400. The same silent fallback fires for any malformed start_date/end_date, an invalid IANA time_zone, or start_datetime >= end_datetime.
- **Code:** `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:90`, `server/src/api/analytics/utils/query-validation.ts:92`, `server/src/api/analytics/utils/query-validation.ts:96`
- **Docs:** `docs/content/docs/api/events/list.mdx`, `docs/content/docs/api/events/names.mdx`, `docs/content/docs/api/events/properties.mdx`, `docs/content/docs/api/events/outbound.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** Trace for the documented request GET /sites/1/events/names?start_date=2024-01-01&end_date=2024-01-31: getEventNames.ts:25 calls getTimeStatement(req.query); utils.ts:27 destructures time_zone=undefined; utils.ts:36 `const date = start_date && end_date && time_zone ? {...} : undefined` yields undefined; dateTimeRange and pastMinutesRange are also undefined; validateTimeStatementParams (query-validation.ts:312) parses {date:undefined,dateTimeRange:undefined,pastMinutesRange:undefined}, the .refine at line 92 rejects, and the .catch at lines 96-100 replaces the result with all-undefined instead of throwing; utils.ts:90 returns ''; the SQL at getEventNames.ts:29-44 then has no timestamp predicate and aggregates the site's entire history. Identical path for getEvents (Mode B), getEventProperties, getOutboundLinks, getEventBucketed, getSiteEventCount. Note count.mdx/time-series.mdx examples do include time_zone and are unaffected.


### [MEDIUM] GET /events ignores start_datetime/end_datetime and past_minutes_start/end despite docs saying it accepts all common parameters; dashboard Event Log in historical mode shows all-time events for past-minutes or exact-range selections

- **Kind:** docs-mismatch
- **Expected:** list.mdx:34 says the endpoint 'Accepts all Common Parameters', which per getting-started.mdx include the exact-datetime pair (start_datetime, end_datetime, time_zone) and the relative pair (past_minutes_start, past_minutes_end). A request with only those params should be restricted to that window.
- **Actual:** getEvents.ts:123-126 gates the time statement on `req.query.start_date || req.query.end_date` — if the caller supplies only start_datetime/end_datetime or past_minutes_*, timeStatement is '' and the query returns the newest events of ALL TIME with HTTP 200. Every other events endpoint calls getTimeStatement unconditionally and honors these params, so only the list endpoint drops them. The dashboard hits this: buildApiParams (client/src/api/utils.ts:63-85) emits pastMinutesStart or startDateTime with empty startDate/endDate for 'past-minutes' and exact 'range' time modes, toQueryParams (client types.ts:54-77) then sends past_minutes_start/past_minutes_end or start_datetime/end_datetime without start_date, so the Event Log's historical cursor query (useGetEvents.ts:57-59 → fetchEventsCursor) silently ignores the selected window while the charts on the same page (count/time-series endpoints) honor it.
- **Code:** `server/src/api/analytics/events/getEvents.ts:123`, `client/src/api/analytics/endpoints/types.ts:54`, `client/src/api/utils.ts:63`, `client/src/api/analytics/hooks/events/useGetEvents.ts:57`
- **Docs:** `docs/content/docs/api/events/list.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Cursor pagination and realtime polling silently skip events that share a boundary second (events.timestamp has 1-second precision, cursors use strict inequality with no tiebreaker)

- **Kind:** broken
- **Expected:** list.mdx documents before_timestamp as 'cursor-based pagination (scrolling back)' with cursor.oldestTimestamp as the next-page cursor, and since_timestamp as returning the events after a watermark; live-feed.mdx:19 promises 'the API returns only events newer than that' with no mention of loss. Paging or polling through history should yield every event exactly once.
- **Actual:** events.timestamp is DateTime (clickhouse.ts:46) and inserts are formatted to whole seconds (pageviewQueue.ts:75), so concurrent events routinely share a timestamp. Page N is `ORDER BY timestamp DESC LIMIT {limit}` with no secondary sort key (getEvents.ts:148-149), cursor.oldestTimestamp is the last row's timestamp (getEvents.ts:163-167), and page N+1 applies `timestamp < toDateTime64({beforeTimestamp},3)` (getEvents.ts:135). If a page boundary falls inside a group of same-second events, the remaining events of that second are excluded by the strict '<' and are never returned — silent gaps in the Event Log infinite scroll and in the warehouse-export/backfill flow the API guides describe. The same strict '>' in polling mode (getEvents.ts:102) drops an event written in the same second as the current watermark after the poll that established it.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:46`, `server/src/services/tracker/pageviewQueue.ts:75`, `server/src/api/analytics/events/getEvents.ts:102`, `server/src/api/analytics/events/getEvents.ts:135`, `server/src/api/analytics/events/getEvents.ts:148`, `server/src/api/analytics/events/getEvents.ts:163`
- **Docs:** `docs/content/docs/api/events/list.mdx`, `docs/content/docs/api/live-feed.mdx`


### [MEDIUM] Invalid query parameters return 500 instead of the documented 400: malformed filters throw outside every handler's try/catch, and bad page_size/time_zone values surface as ClickHouse errors

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx Error Responses: '400 - Bad Request (invalid parameters)' and error body shape {"error": "..."} for all endpoints.
- **Actual:** In all six events handlers the getFilterStatement call sits BEFORE the try block (getEvents.ts:89-91 vs try at :93; getEventNames.ts:27 vs :46; getEventProperties.ts:32 vs :53; getOutboundLinks.ts:25 vs :43; getEventBucketed.ts:44 vs :79; getSiteEventCount.ts:44 vs :69). validateFilters throws plain Error/ZodError for non-JSON filters, unknown filter parameters, empty/invalid/overlong regexes, or non-numeric greater_than values (query-validation.ts:337-348, getFilterStatement.ts:144-155,321). There is no fastify setErrorHandler anywhere in server/src (grep), so Fastify's default handler replies 500 with {statusCode:500,error:'Internal Server Error',message:...} — wrong status and wrong shape. Separately, GET /events?page_size=abc runs parseInt→NaN (getEvents.ts:88) which is bound to the Int32 LIMIT param and fails in ClickHouse → 500 'Failed to fetch events'; an invalid time_zone on /events/count or /events/time-series is passed uncheck to toTimeZone() (getSiteEventCount.ts:37,48; getEventBucketed.ts:35,63) → ClickHouse exception → 500.
- **Code:** `server/src/api/analytics/events/getEvents.ts:88`, `server/src/api/analytics/events/getEventNames.ts:27`, `server/src/api/analytics/events/getEventProperties.ts:32`, `server/src/api/analytics/events/getOutboundLinks.ts:25`, `server/src/api/analytics/events/getEventBucketed.ts:44`, `server/src/api/analytics/events/getSiteEventCount.ts:44`, `server/src/api/analytics/utils/query-validation.ts:337`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Timestamps are returned in ClickHouse 'YYYY-MM-DD HH:MM:SS' format, not the ISO 8601 format the docs promise; the live-feed guide's own JS sample misparses them

- **Kind:** docs-mismatch
- **Expected:** list.mdx:74-77 types Event.timestamp as 'ISO 8601 datetime' with example '2024-01-31T14:22:00.000Z'; outbound.mdx:62 types lastClicked as ISO 8601 with example '2024-01-31T14:22:00.000Z'; list.mdx:44-51 says since_timestamp/before_timestamp inputs are ISO 8601.
- **Actual:** events.timestamp is a ClickHouse DateTime (clickhouse.ts:46, second precision, UTC) selected raw (getEvents.ts:47) and serialized by JSONEachRow as 'YYYY-MM-DD HH:MM:SS' — no 'T', no 'Z', no milliseconds; getOutboundLinks.ts:31 explicitly builds lastClicked via toString(MAX(timestamp)), the same format. Rybbit's own dashboard confirms this by parsing lastClicked with Luxon DateTime.fromSQL(..., {zone:'utc'}) (OutboundLinksList.tsx:97-99). API consumers following the docs get wrong times: live-feed.mdx:79 does new Date(e.timestamp), which interprets '2026-07-05 12:00:00' as LOCAL time in V8 (shifted by the consumer's UTC offset) and Invalid Date in Safari/strict parsers.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:46`, `server/src/api/analytics/events/getEvents.ts:47`, `server/src/api/analytics/events/getOutboundLinks.ts:31`, `client/src/app/[site]/events/components/OutboundLinksList.tsx:97`
- **Docs:** `docs/content/docs/api/events/list.mdx`, `docs/content/docs/api/events/outbound.mdx`, `docs/content/docs/api/live-feed.mdx`


### [LOW] processResults coerces numeric-looking string fields to JSON numbers — browser_version is effectively always a number (e.g. 137 instead of "137"), and event names/property values/page titles like "404" change type

- **Kind:** docs-mismatch
- **Expected:** list.mdx types browser_version, operating_system_version, event_name, page_title, querystring etc. as string (example browser_version: "120.0"); properties.mdx types propertyValue as string; names.mdx types eventName as string.
- **Actual:** processResults (utils.ts:93-115) walks every response row and converts ANY value where !isNaN(Number(value)) to a Number, exempting only session_id/user_id/identified_user_id/effective_user_id. browser_version is ingested as the UA major version string (pageviewQueue.ts:86, e.g. "137"), so in every GET /events row it comes back as the JSON number 137, not a string — and "120.0" would become 120, losing the documented formatting. The same coercion turns event_name "2024" into 2024 in /events and /events/names (eventName), page_title "404" into 404, and numeric custom-event property values into numbers in /events/properties (propertyValue), making field types unstable row-to-row for API consumers (e.g. value.startsWith() throws).
- **Code:** `server/src/api/analytics/utils/utils.ts:93`, `server/src/services/tracker/pageviewQueue.ts:86`, `server/src/api/analytics/events/getEvents.ts:46`, `server/src/api/analytics/events/getEventProperties.ts:37`
- **Docs:** `docs/content/docs/api/events/list.mdx`, `docs/content/docs/api/events/properties.mdx`, `docs/content/docs/api/events/names.mdx`


### [LOW] All six events endpoints are readable with no credentials at all when the site is marked public, while the API docs state every request must be authenticated

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx: 'All API requests must include authentication' via Bearer key or api_key query param, with 401 for missing/invalid keys; the per-endpoint docs all show Authorization headers as required.
- **Actual:** The events routes are registered with the publicSite preHandler (index.ts:176, applied at index.ts:290-292 and 330-332), which calls allowPublicSiteAccess (auth-middleware.ts:153-177) → getUserHasAccessToSitePublic (auth-utils.ts:357-383). If the site's config has public=true (auth-utils.ts:366-369), the request succeeds with no session, no API key, and no private-link key — anyone can query /events, /events/names, /events/properties, /events/outbound, /events/count and /events/time-series anonymously. This mirrors the public-dashboard product feature but is nowhere stated in the API docs, which promise 401 for unauthenticated requests.
- **Code:** `server/src/index.ts:176`, `server/src/index.ts:290`, `server/src/lib/auth-middleware.ts:153`, `server/src/lib/auth-utils.ts:357`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


---

## flags-experiments (9)


### [HIGH] Experiment lifecycle statuses (Draft/Running/Paused) have no effect on traffic splitting or data collection — the flag is live from creation and Pause stops nothing

- **Kind:** docs-mismatch
- **Expected:** Docs promise: 'New experiments are created as drafts so you can add the implementation code before any traffic is split' (line 38); 'Draft — Created but not yet collecting results' (line 151); 'Running — Actively splitting traffic and recording exposures and conversions' (line 152); 'Paused — Temporarily stopped. Visitors keep their existing assignments' (line 153). Users expect Start/Pause to gate traffic splitting and result collection.
- **Actual:** Experiment status is purely a label on the experiments row. The wizard creates the assignment flag with enabled:true while the experiment is 'draft', so visitors are assigned variants and every event records the assignment immediately. Start/Pause/Complete send only {status} to PUT /experiments/:id, which writes the experiments table and never touches the flag. Flag evaluation is gated solely by flag.enabled, and GET /experiments/:id/results never checks status/startedAt/endedAt, so a draft or paused experiment keeps splitting traffic, recording exposures and conversions, and showing them in results.
- **Code:** `client/src/app/[site]/experiments/components/CreateExperimentWizard.tsx:551`, `client/src/app/[site]/experiments/components/CreateExperimentWizard.tsx:603`, `client/src/app/[site]/experiments/components/ExperimentRow.tsx:64`, `server/src/api/experiments/updateExperiment.ts:52`, `server/src/services/featureFlags/evaluator.ts:175`, `server/src/api/experiments/getExperimentResults.ts:54`
- **Docs:** `docs/content/docs/(docs)/experiments.mdx`
- **Evidence:** CreateExperimentWizard.tsx:548-556 creates the flag with `enabled: true` and :603 creates the experiment with `status: "draft"`. ExperimentRow.tsx:64-71 setStatus() calls updateExperiment with payload {status} only. server/src/api/experiments/updateExperiment.ts:52-72 builds updateData from the body and writes only the `experiments` table (plus timestampsForStatus which sets startedAt/endedAt strings) — no write to featureFlags. server/src/services/featureFlags/evaluator.ts:175-185 is the only gate on evaluation (`if (!flag.enabled)`); experiment status is never consulted anywhere in evaluator.ts or the evaluate handlers (server/src/api/featureFlags/index.ts:285-344). getExperimentResults.ts:33-57 loads the experiment but uses only request.query time/filters to scope the ClickHouse queries — record.experiment.status/startedAt/endedAt are never referenced, so paused/draft periods are fully included in results.


### [MEDIUM] Server-side evaluate endpoint resolves Country/Region/City and Device type from the calling backend's IP and User-Agent, not the visitor's — with no documented way to pass visitor context

- **Kind:** docs-mismatch
- **Expected:** feature-flags.mdx documents POST /api/sites/:siteId/feature-flags/evaluate for backend evaluation (lines 193-247) and documents targeting fields 'Country — Visitor country resolved from IP', 'Region', 'City' (lines 115-124) and 'Device type — Device category derived from user agent and screen size' (line 125). The Request TypeTable (lines 203-247) lists anonymousId/identifiedUserId/hostname/pathname/query/querystring/referrer/language/screenWidth/screenHeight — a user expects geo/device rules to evaluate against the visitor described by that request.
- **Actual:** The handler derives ipAddress from resolveClientIp(request) (the HTTP connection making the API call — i.e., the customer's backend server or its egress proxy) and the user agent from the request's own User-Agent header (the backend HTTP client, e.g. node-fetch/curl). evaluateFeatureFlagsSchema has no ip_address or user_agent field, so a backend evaluating on behalf of a visitor cannot supply the visitor's IP or UA through the documented contract. Every server-runtime evaluation therefore geo-targets the datacenter where the customer's backend runs, and device_type resolves from the backend client's UA plus body screen dimensions — country/region/city rules match (or fail) identically for all visitors.
- **Code:** `server/src/api/featureFlags/index.ts:301`, `server/src/api/featureFlags/index.ts:312`, `server/src/api/featureFlags/index.ts:313`, `server/src/api/featureFlags/index.ts:325`, `server/src/api/featureFlags/schemas.ts:151`
- **Docs:** `docs/content/docs/(docs)/feature-flags.mdx`


### [MEDIUM] Documented 'Winner' state cannot be recorded: no dashboard UI ever sets winningVariant

- **Kind:** docs-mismatch
- **Expected:** experiments.mdx line 139: 'Winner — The variant recorded as the winner once the experiment is decided', presented as one of the three at-a-glance experiment states, implying the user can record a winning variant when completing an experiment (lifecycle section lines 145-156 says to use Start/Pause/Complete).
- **Actual:** The server accepts winningVariant on POST/PUT /experiments (schemas.ts:12), and the client renders it (winner badge in ExperimentRow.tsx:87-92, 'Winner: {variant}' verdict and winner tone in ExperimentResultsPanel.tsx:180-208), but no client code path ever writes it: the Complete button sends only {status:"completed"} (ExperimentRow.tsx:126-135 → setStatus at :64-71), and the edit wizard's update payload contains name/description/hypothesis/featureFlagId/primaryGoalId only (CreateExperimentWizard.tsx:692-699). grep for winningVariant across client/src shows only read sites. The Winner state is unreachable from the product; it can only be set by calling the (undocumented) REST API directly.
- **Code:** `client/src/app/[site]/experiments/components/ExperimentRow.tsx:87`, `client/src/app/[site]/experiments/components/ExperimentRow.tsx:126`, `client/src/app/[site]/experiments/components/CreateExperimentWizard.tsx:692`, `client/src/app/[site]/experiments/components/ExperimentResultsPanel.tsx:180`, `server/src/api/experiments/schemas.ts:12`
- **Docs:** `docs/content/docs/(docs)/experiments.mdx`


### [MEDIUM] Documented device_type filter values ("desktop", "mobile", "tablet") never match — stored and evaluated values are capitalized, and comparisons are case-sensitive

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx (line ~265) documents the device_type filter values as '"desktop", "mobile", "tablet"' (lowercase). GET /sites/:siteId/experiments/:experimentId/results accepts these shared filter parameters, so an API consumer filtering experiment results by device per the docs expects matching rows.
- **Actual:** getDeviceType returns capitalized values ('Desktop', 'Mobile', 'Tablet', 'TV', 'Console', 'Embedded') (utils.ts:101-124), which is what pageviewQueue.ts:92 stores in events.device_type. getFilterStatement builds a case-sensitive ClickHouse equality (`device_type = 'desktop'`, getFilterStatement.ts:346-356), so the documented lowercase values return zero rows — the experiment results silently show empty/unfiltered-out data with no error. The same capitalized vocabulary applies to feature-flag device_type targeting rules: the evaluator compares the rule value case-sensitively via `actual === value` (evaluator.ts:91-93) against the deviceType produced at featureFlags/index.ts:313, and the flag rule editor is a free-text input (TargetingRulesEditor.tsx:132-138) with no value hints, so a rule typed as 'desktop' (the only documented vocabulary) never matches.
- **Code:** `server/src/utils.ts:101`, `server/src/services/tracker/pageviewQueue.ts:92`, `server/src/api/analytics/utils/getFilterStatement.ts:346`, `server/src/services/featureFlags/evaluator.ts:93`, `server/src/api/featureFlags/index.ts:313`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] GET /sites/:siteId/feature-flags per-flag 'exposures' stat counts exposure events of other flags

- **Kind:** broken
- **Expected:** The stats[].exposures field returned for each flag should count feature_flag_exposure events recorded for that flag (docs describe exposure as recorded when that specific flag is read via rybbit.flag()).
- **Actual:** The stats query arrayJoins over ALL keys of each event's feature_flags map and then does countIf(type='custom_event' AND event_name='feature_flag_exposure') per joined key — it never checks which flag the exposure event was actually for (the props.key field). Since every tracked event, including an exposure event for flag A, carries the full assignments map of all evaluated flags (tracking.ts:176-179), an exposure event for flag A is counted as an 'exposure' for flags B and C too. Flags that are never read via rybbit.flag() show non-zero exposures whenever any other flag is read in the same session.
- **Code:** `server/src/api/featureFlags/index.ts:62`, `server/src/api/featureFlags/index.ts:68`, `server/src/analytics-script/tracking.ts:176`, `server/src/analytics-script/tracking.ts:248`


### [LOW] Experiment results can show a phantom "false" variant row when a multivariate flag has unassigned traffic, targeting mismatch, or is disabled

- **Kind:** unexpected-behavior
- **Expected:** experiments.mdx results table (lines 127-133) says the Variant column shows 'The variant key, with the Control marked as the baseline'; docs line 161 acknowledges rollouts under 100% leave 'unassigned traffic' but nothing suggests that unassigned traffic appears as a competing variant with its own conversion rate, lift and confidence.
- **Actual:** When a multivariate flag evaluates to false (bucket outside total variant rollout → reason 'fallthrough', targeting mismatch, or flag disabled), the assignment value false is serialized to the string "false". rybbit.flag() still fires an exposure event with props.value="false" (tracking.ts:238-256 records for any existing assignment), and the assignments map on all events also carries "false". The exposure query only excludes empty-string values (`JSONExtractString(...,'value') != ''`, getExperimentResults.ts:94) and the assignment fallback only excludes `feature_flags[key] != ''` (line 130), so rows with variant="false" flow through. buildExperimentResults appends any row variant not in the flag's defined keys (utils.ts:125-129), so the UI renders a variant literally named "false" with sessions, conversion rate, lift vs control and a confidence line, and it inflates totalExposureSessions.
- **Code:** `server/src/analytics-script/tracking.ts:238`, `server/src/api/experiments/getExperimentResults.ts:94`, `server/src/api/experiments/getExperimentResults.ts:130`, `server/src/api/experiments/utils.ts:125`
- **Docs:** `docs/content/docs/(docs)/experiments.mdx`


### [LOW] Conversion rate is conversions ÷ exposed sessions, not ÷ the returned 'exposures' count as the docs state

- **Kind:** docs-mismatch
- **Expected:** experiments.mdx line 23: 'Exposures are the denominator for each variant's conversion rate'; line 131: 'Conversion rate — Conversions divided by exposures for that variant.' The results payload contains a distinct exposures field, so an API consumer cross-checking would expect conversionRate = conversions / exposures.
- **Actual:** The exposure query returns sessions = uniqExact(session_id) and exposures = sum of raw exposure event counts (getExperimentResults.ts:100-104: `uniqExact(e.session_id) AS sessions, sum(e.exposures) AS exposures`), and buildExperimentResults computes `conversionRate = sessions > 0 ? conversions / sessions : 0` (utils.ts:140). Since a session can record multiple exposure events (one per page load per value/version — the dedupe set in tracking.ts:22,245-247 is per page load), exposures ≥ sessions, and the documented formula conversions/exposures diverges from the returned conversionRate whenever any session was exposed more than once.
- **Code:** `server/src/api/experiments/utils.ts:140`, `server/src/api/experiments/getExperimentResults.ts:100`
- **Docs:** `docs/content/docs/(docs)/experiments.mdx`


### [LOW] Invalid filters parameter (malformed JSON or bad regex) on GET /experiments/:experimentId/results returns 500 instead of the documented 400

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx Error Responses section: '400 - Bad Request (invalid parameters)' and '500 - Internal Server Error'. Passing a syntactically invalid `filters` value is an invalid parameter and should yield 400 with a descriptive error.
- **Actual:** validateFilters throws a plain `new Error("Invalid JSON format")` for non-JSON filters (query-validation.ts:340-344), and getFilterStatement throws plain Errors for empty/invalid/too-long regex patterns (getFilterStatement.ts:143-155). getExperimentResults' catch block only maps ZodError to 400 (getExperimentResults.ts:167-172); every other Error falls through to `500 {"error":"Failed to get experiment results"}`, hiding the actual validation message. So `GET /sites/1/experiments/1/results?filters=not-json&start_date=...` returns 500, not 400.
- **Code:** `server/src/api/analytics/utils/query-validation.ts:343`, `server/src/api/analytics/utils/getFilterStatement.ts:150`, `server/src/api/experiments/getExperimentResults.ts:167`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Partial flag updates bypass type-shape validation: PUT can strip all variants from a multivariate flag (making it evaluate false for everyone) or attach variants to a boolean flag

- **Kind:** unexpected-behavior
- **Expected:** The create-time invariants enforced by validateFeatureFlagShape ('Multivariate flags require at least two variants', 'Boolean flags cannot have variants', rollout total <= 100) should also hold after an update — otherwise a stored flag can enter a state that createFeatureFlag would reject.
- **Actual:** featureFlagUpdateSchema runs validateFeatureFlagShape on the partial body only (schemas.ts:145-149), and every type-specific check is keyed on `data.flagType` (schemas.ts:174-220), which is undefined when the request doesn't include flagType. So PUT /sites/:siteId/feature-flags/:flagId with body {"variants": []} (or a single variant, or variants summing over 100) against a multivariate flag passes validation and is persisted (index.ts:181-214); the flag then evaluates via selectVariant([]) → reason 'fallthrough', value false for all visitors (evaluator.ts:212-245). Likewise {"variants": [...]} against a boolean flag is accepted even though creation would reject it. The dashboard always sends the full object, so only direct API callers hit this, but the API returns 200 and silently produces a flag state the create path forbids.
- **Code:** `server/src/api/featureFlags/schemas.ts:145`, `server/src/api/featureFlags/schemas.ts:174`, `server/src/api/featureFlags/index.ts:181`, `server/src/services/featureFlags/evaluator.ts:236`


---

## funnels (11)


### [HIGH] Step-sessions endpoint 500s whenever a UTM filter is applied (documented common parameter, and reachable from the funnels dashboard UI)

- **Kind:** broken
- **Expected:** step-sessions.mdx says the endpoint 'Accepts all Common Parameters', and getting-started.mdx documents utm_source/utm_medium/utm_campaign/utm_term/utm_content as available filter parameters. Filtering funnel step sessions by e.g. utm_source=newsletter should return the filtered session list.
- **Actual:** getFunnelStepSessions builds ONE filter statement with fieldMappings that rewrite url_parameters['utm_source'] -> utm_source (lines 68-76, applied in getFilterStatement.ts:360-367), then interpolates that same string in TWO places: the SessionActions CTE that selects FROM the raw `events` table (line 146) and the final SELECT over AggregatedSessions (line 254). The events table has no utm_source column — UTMs exist only inside the url_parameters Map (clickhouse.ts:52; the insert in services/tracker/pageviewQueue.ts:102 writes url_parameters, no utm_* columns). So the CTE contains `AND utm_source = '...'` against events, ClickHouse throws Unknown identifier, and the handler returns 500 'Failed to fetch funnel step sessions' (lines 271-274).
- **Code:** `server/src/api/analytics/funnels/getFunnelStepSessions.ts:68-76`, `server/src/api/analytics/funnels/getFunnelStepSessions.ts:146`, `server/src/api/analytics/utils/getFilterStatement.ts:360-367`, `server/src/db/clickhouse/clickhouse.ts:43-84`, `client/src/lib/filterGroups.ts:18-22`, `client/src/api/analytics/hooks/funnels/useGetFunnelStepSessions.ts:28-30`
- **Docs:** `docs/content/docs/api/funnels/step-sessions.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** Trace: query filter [{"parameter":"utm_source","type":"equals","value":["newsletter"]}] -> validateFilters ok -> getSqlParam('utm_source') returns url_parameters['utm_source'] (getFilterStatement.ts:66-75) -> condition "AND url_parameters['utm_source'] = 'newsletter'" -> fieldMappings regex-replace turns it into "AND utm_source = 'newsletter'" (getFilterStatement.ts:361-366). That string is embedded at getFunnelStepSessions.ts:146 inside `SessionActions AS (SELECT ... FROM events WHERE site_id = {siteId} ${timeStatement} ${filterStatement})`. events has no utm_source column, so the whole WITH-query fails before any result. The analyze endpoint builds its filter WITHOUT fieldMappings (getFunnel.ts:55) so the same filter works there — meaning in the shipped dashboard (FUNNEL_PAGE_FILTERS = BASE_FILTERS includes all five utm_* params, filterGroups.ts:18-22,43; useGetFunnelStepSessions passes them via buildApiParams) the funnel chart renders but expanding any step's Reached/Dropped Off session list fails with a 500 whenever a UTM filter is active.


### [HIGH] Documented date-range parameters are silently ignored when time_zone is missing — the analyze doc's own examples return all-time data instead of the requested range, and no 400 is ever returned for missing time params

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx: 'All endpoints require date-based, exact datetime, or relative time parameters' and 'You must provide either all three date parameters (start_date, end_date, time_zone), ...'; invalid parameters are documented to return 400. analyze.mdx's request examples in every language use ?start_date=2024-01-01&end_date=2024-01-31 (no time_zone) and present the response as January data.
- **Actual:** getTimeStatement (utils.ts:36) only forms a date range when start_date AND end_date AND time_zone are all present; otherwise the Zod schema's refine failure is swallowed by .catch({date: undefined, ...}) (query-validation.ts:96-100) and getTimeStatement returns "" (utils.ts:89-90). The funnel query then runs with no timestamp constraint at all. So a request copied verbatim from analyze.mdx (start_date/end_date, no time_zone) returns HTTP 200 with conversion data computed over the site's ENTIRE history, silently ignoring the requested period. The same applies to step-sessions (getFunnelStepSessions.ts:65). No combination of missing/invalid time parameters ever produces the documented 400.
- **Code:** `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:89-90`, `server/src/api/analytics/utils/query-validation.ts:92-100`
- **Docs:** `docs/content/docs/api/funnels/analyze.mdx`, `docs/content/docs/api/funnels/step-sessions.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** Trace for the documented request POST /api/sites/1/funnels/analyze?start_date=2024-01-01&end_date=2024-01-31: getFunnel.ts:54 getTimeStatement(request.query) -> utils.ts:36 `const date = start_date && end_date && time_zone ? {...} : undefined` -> undefined because time_zone is absent -> validateTimeStatementParams({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined}) -> refine at query-validation.ts:92-94 fails -> .catch at 96-100 returns all-undefined -> utils.ts:90 returns "" -> SessionActions CTE (getFunnel.ts:129-134) has only `site_id = {siteId}` in its WHERE. Response is 200 with rates over all time. The step-sessions doc examples include no time parameters at all, producing the same unbounded scan.


### [MEDIUM] Step-sessions endpoint 500s for documented pathname and timezone filters because the filter is re-applied to an aggregate CTE that lacks those columns

- **Kind:** broken
- **Expected:** getting-started.mdx lists pathname ('URL pathname') and timezone ('User timezone') as available filter parameters, and step-sessions.mdx says the endpoint accepts all Common Parameters. A pathname or timezone filter should narrow the returned sessions (as it does on the analyze endpoint).
- **Actual:** The same filterStatement string is appended a second time to the final projection: `SELECT * FROM AggregatedSessions WHERE 1 = 1 ${filterStatement}` (line 254). AggregatedSessions (lines 203-241) only exposes the aggregated columns (session_id, user_id, country, ..., entry_page, exit_page, utm_*, ip, lat, lon, tag) — it has no pathname, timezone, url_parameters or feature_flags column. A filter like [{"parameter":"pathname","type":"contains","value":["/blog"]}] becomes `AND pathname LIKE '%/blog%'` in that outer WHERE, ClickHouse throws Unknown identifier 'pathname', and the endpoint returns 500. Same for timezone, url_param:*, and feature_flag:* filters.
- **Code:** `server/src/api/analytics/funnels/getFunnelStepSessions.ts:203-241`, `server/src/api/analytics/funnels/getFunnelStepSessions.ts:252-254`
- **Docs:** `docs/content/docs/api/funnels/step-sessions.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Funnel dashboard pagination silently skips one session at every page boundary (client fetches limit+1 but server computes OFFSET from that same limit)

- **Kind:** broken
- **Expected:** docs/(docs)/funnels.mdx: 'Click any step to expand it and view the sessions associated with that step... Sessions are paginated.' Paging through the Reached/Dropped Off lists should show every qualifying session exactly once.
- **Actual:** Funnel.tsx requests limit = LIMIT + 1 = 26 as a look-ahead to detect a next page (lines 66, 79) and displays only the first 25 (slice at lines 85, 90). The server computes offset = ((page || 1) - 1) * (limit || 25) (getFunnelStepSessions.ts:264) using the requested limit of 26. Page 1 returns rows 0-25 and shows 0-24; page 2 uses OFFSET 26 and shows rows 26-50. Row 25 (the 26th session) is never displayed — one session is silently dropped at every page boundary, on both the Reached and Dropped Off tabs.
- **Code:** `client/src/app/[site]/funnels/components/Funnel.tsx:30`, `client/src/app/[site]/funnels/components/Funnel.tsx:59-90`, `server/src/api/analytics/funnels/getFunnelStepSessions.ts:255`, `server/src/api/analytics/funnels/getFunnelStepSessions.ts:264`
- **Docs:** `docs/content/docs/(docs)/funnels.mdx`


### [MEDIUM] Most request examples in the Get Funnels and Create Funnel docs (and one in step-sessions) use malformed URLs ('funnels23', 'sessions23') that 404 against the actual route table

- **Kind:** docs-mismatch
- **Expected:** Copy-pasting any documented request example should hit the documented endpoints GET/POST /api/sites/:site/funnels and POST /api/sites/:site/funnels/:stepNumber/sessions.
- **Actual:** All nine language tabs in list.mdx (lines 78, 85, 101, 113, 130, 153, 174, 193, 213) and all nine in create.mdx (lines 75, 92, 120, 151, 171, 205, 231, 256, 287) call https://app.rybbit.io/api/sites/1/funnels23, and the Python tab of step-sessions.mdx (line 131) calls /api/sites/1/funnels/2/sessions23. No such routes exist — the server registers only /sites/:siteId/funnels, /sites/:siteId/funnels/analyze, /sites/:siteId/funnels/:stepNumber/sessions, and /sites/:siteId/funnels/:funnelId under the /api prefix (index.ts:301-306, 470) — so every one of those examples returns 404.
- **Code:** `server/src/index.ts:301-306`, `server/src/index.ts:470`
- **Docs:** `docs/content/docs/api/funnels/list.mdx`, `docs/content/docs/api/funnels/create.mdx`, `docs/content/docs/api/funnels/step-sessions.mdx`


### [MEDIUM] Funnel endpoints are publicly accessible on 'public' sites — anonymous callers can read saved funnel definitions and pull per-session details including visitor IP addresses, despite docs stating all API requests require authentication

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx: 'All API requests must include authentication using one of the following methods' (Bearer token or api_key). Every funnels doc page shows Authorization headers on every example, implying funnel data and definitions are only available to authenticated, authorized users.
- **Actual:** GET /sites/:siteId/funnels, POST .../funnels/analyze, and POST .../funnels/:stepNumber/sessions are registered with the publicSite preHandler (index.ts:301-304) -> allowPublicSiteAccess -> getUserHasAccessToSitePublic, which grants access with NO credentials whenever the site's config.public flag is set (auth-utils.ts:366-369). On a public site an anonymous caller can therefore enumerate the team's saved funnel definitions (names, step URLs, event names, property filters), run arbitrary analyze queries, and fetch per-session records from step-sessions — whose SELECT includes argMax(e.ip,...) AS ip (getFunnelStepSessions.ts:238) plus lat/lon and identified_user_id, returned verbatim via SELECT * at line 252.
- **Code:** `server/src/index.ts:301-304`, `server/src/lib/auth-middleware.ts:153-177`, `server/src/lib/auth-utils.ts:357-383`, `server/src/api/analytics/funnels/getFunnelStepSessions.ts:238`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/funnels/list.mdx`, `docs/content/docs/api/funnels/step-sessions.mdx`


### [LOW] Timestamps documented as ISO 8601 are returned as bare 'YYYY-MM-DD HH:mm:ss' strings (funnel list createdAt/updatedAt, step-sessions session_start/session_end)

- **Kind:** docs-mismatch
- **Expected:** list.mdx documents createdAt/updatedAt as 'ISO 8601 datetime' with example "2024-01-10T12:00:00.000Z"; step-sessions.mdx's response example shows session_start/session_end as "2024-01-31T14:00:00.000Z".
- **Actual:** funnels.createdAt/updatedAt are Drizzle pg timestamp columns with mode: "string" (schema.ts:119-120), so node-postgres returns the raw Postgres text of a timestamp-without-time-zone, e.g. "2024-01-10 12:00:00.123456" — no 'T', no 'Z', no offset — and getFunnels passes it through unchanged (getFunnels.ts:32-33). session_start/session_end come from ClickHouse MIN/MAX(timestamp) DateTime serialized by JSONEachRow as "2024-01-31 14:00:00"; processResults leaves them as strings (Number() is NaN, utils.ts:108). Consumers parsing with a strict ISO 8601 parser (e.g. Luxon DateTime.fromISO) get an invalid date, and the UTC-ness of the value is not marked.
- **Code:** `server/src/db/postgres/schema.ts:114-121`, `server/src/api/analytics/funnels/getFunnels.ts:32-33`, `server/src/api/analytics/funnels/getFunnelStepSessions.ts:229-230`
- **Docs:** `docs/content/docs/api/funnels/list.mdx`, `docs/content/docs/api/funnels/step-sessions.mdx`


### [LOW] Analyze returns null (not a 0-100 number) for conversion_rate/dropoff_rate when a step has zero sessions, because ClickHouse NaN/Inf serialize to null

- **Kind:** unexpected-behavior
- **Expected:** analyze.mdx documents conversion_rate and dropoff_rate as type number, Range: 0-100, for every step result.
- **Actual:** conversion_rate is computed as round(s1.visitors * 100.0 / first_step.visitors, 2) and dropoff_rate as round((1 - (s1.visitors / prev_step.visitors)) * 100.0, 2) (getFunnel.ts:185-188) with no zero-divisor guard. If step 1 matches zero sessions (empty range, no matching traffic), 0/0 produces NaN for every step's conversion_rate; if any intermediate step has 0 visitors, the next step's dropoff_rate is NaN. ClickHouse JSONEachRow serializes NaN/Inf as null by default (output_format_json_quote_denormals=0), and processResults explicitly preserves null (utils.ts:103), so the API returns {"conversion_rate": null, "dropoff_rate": null} — a type the documented contract does not allow. (The bundled dashboard masks it: lodash round(null) coerces to 0 in Funnel.tsx:157.)
- **Code:** `server/src/api/analytics/funnels/getFunnel.ts:185-189`, `server/src/api/analytics/utils/utils.ts:103-111`
- **Docs:** `docs/content/docs/api/funnels/analyze.mdx`


### [LOW] Step-sessions responses omit has_replay and autocapture counters that the client's GetSessionsResponse type declares, so funnel session cards never show replay badges and undercount events; channel/referrer also use a different attribution than the Sessions page

- **Kind:** unexpected-behavior
- **Expected:** The funnel drill-down reuses SessionsList/SessionCard and types the response as GetSessionsResponse (getFunnelStepSessions.ts:6, 268; client funnels.ts:115), so each session should carry the same fields the Sessions page gets: has_replay, button_clicks, copies, form_submits, input_changes, and attribution-consistent referrer/channel.
- **Actual:** getFunnelStepSessions' AggregatedSessions never selects has_replay, button_clicks, copies, form_submits, or input_changes (compare getSessions.ts:141-144 and the ReplaySessions join at 159-168), and uses plain argMin(referrer)/argMin(channel) (getFunnelStepSessions.ts:219-220) instead of SESSION_REFERRER_AGG/SESSION_CHANNEL_AGG (getSessions.ts:124-125). In SessionCard, session.has_replay === 1 is never true (line 133) so the replay badge is永 absent for funnel sessions even when a replay exists, the event count at line 162 silently excludes all autocapture events, and the displayed channel/referrer for the same session can differ between the Funnels drill-down and the Sessions page.
- **Code:** `server/src/api/analytics/funnels/getFunnelStepSessions.ts:203-268`, `server/src/api/analytics/sessions/getSessions.ts:124-168`, `client/src/components/Sessions/SessionCard.tsx:133`, `client/src/components/Sessions/SessionCard.tsx:162`


### [LOW] Malformed pagination and step inputs return 500 instead of the documented 400 (non-numeric or negative page/limit; page step values of wrong type)

- **Kind:** broken
- **Expected:** step-sessions.mdx documents page (1-indexed, default 1) and limit (default 25) as numbers; getting-started.mdx documents 400 Bad Request for invalid parameters.
- **Actual:** page and limit are taken from the querystring with no validation. page=-1 yields offset ((-1)-1)*25 = -50 and ClickHouse rejects a negative OFFSET; page=abc yields NaN offset which the ClickHouse client cannot bind to {offset:Int32}; both surface as 500 'Failed to fetch funnel step sessions' rather than 400. Similarly, analyze performs no per-step body validation beyond array length: a page step missing 'value' (or with a non-string value) makes patternToRegex call .replace on undefined inside the try block (getFunnel.ts:58-63, utils.ts:126), throwing a TypeError that is converted to a 500 'Failed to execute funnel analysis'.
- **Code:** `server/src/api/analytics/funnels/getFunnelStepSessions.ts:262-265`, `server/src/api/analytics/funnels/getFunnel.ts:58-67`
- **Docs:** `docs/content/docs/api/funnels/step-sessions.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] Create/delete funnel leak cross-tenant funnel ID existence via distinguishable 404 vs 403 responses

- **Kind:** unexpected-behavior
- **Expected:** A caller authorized for site A should learn nothing about funnels belonging to other sites/organizations; probing a funnelId that isn't theirs should be indistinguishable from a nonexistent one.
- **Actual:** Both handlers look the funnel up globally by reportId BEFORE checking that it belongs to the caller's site: deleteFunnel returns 404 'Funnel not found' when the ID doesn't exist anywhere but 403 'Funnel does not belong to the specified site' when it exists under another tenant's site (deleteFunnel.ts:30-44); createFunnel's update path does the same (createFunnel.ts:60-70). A user with access to any one site can therefore enumerate which funnel report IDs exist platform-wide by iterating DELETE /sites/<own-site>/funnels/<id> and distinguishing 404 from 403 (the auth preHandler authSite only validates access to :siteId, index.ts:306).
- **Code:** `server/src/api/analytics/funnels/deleteFunnel.ts:30-44`, `server/src/api/analytics/funnels/createFunnel.ts:58-70`
- **Docs:** `docs/content/docs/api/funnels/delete.mdx`, `docs/content/docs/api/funnels/create.mdx`


---

## goals (8)


### [MEDIUM] Goal sessions pagination silently skips one session at every page boundary

- **Kind:** broken
- **Expected:** docs/content/docs/(docs)/goals.mdx (line 89: "Sessions are sorted by most recent first and paginated") promises that paging through a goal's converted sessions shows all of them; sessions.mdx documents page/limit as standard pagination where page N contains rows (N-1)*limit .. N*limit-1.
- **Actual:** The client requests limit = LIMIT+1 = 26 rows per page to probe hasNextPage, but the server computes offset = (page-1)*limit = (page-1)*26. Page 1 fetches rows 0-25 and displays only rows 0-24 (slice(0, 25)); page 2 fetches starting at offset 26 and displays rows 26-50. The session at index 25 (and at 51, 77, ... — one per page boundary) is never displayed on any page.
- **Code:** `client/src/app/[site]/goals/components/GoalCard.tsx:43`, `client/src/app/[site]/goals/components/GoalCard.tsx:172`, `client/src/app/[site]/goals/components/GoalCard.tsx:186`, `client/src/app/[site]/goals/components/GoalCard.tsx:187`, `server/src/api/analytics/goals/getGoalSessions.ts:170`
- **Docs:** `docs/content/docs/(docs)/goals.mdx`, `docs/content/docs/api/goals/sessions.mdx`


### [MEDIUM] Goal sessions never return identified_user_id/traits, so converted sessions always render as anonymous

- **Kind:** broken
- **Expected:** docs/content/docs/(docs)/goals.mdx line 87 promises each converted session shows "User ID (if identified)". The handler itself types its rows as GetSessionsResponse[number] (getGoalSessions.ts:174), whose definition (getSessions.ts:8-12) includes identified_user_id: string and traits: Record<string, unknown> | null.
- **Actual:** The AggregatedSessions SELECT in getGoalSessions.ts (lines 112-148) never selects identified_user_id (grep confirms the string does not appear anywhere in the file) and never calls enrichWithTraits, unlike the regular sessions endpoint (getSessions.ts:112 selects argMax(identified_user_id, timestamp); :197 enriches traits). Every row therefore arrives at the client with identified_user_id and traits undefined.
- **Code:** `server/src/api/analytics/goals/getGoalSessions.ts:112`, `server/src/api/analytics/goals/getGoalSessions.ts:174`, `server/src/api/analytics/sessions/getSessions.ts:8`, `server/src/api/analytics/sessions/getSessions.ts:112`, `server/src/api/analytics/sessions/getSessions.ts:197`, `client/src/components/Sessions/SessionCard.tsx:51`, `client/src/components/Sessions/SessionCard.tsx:90`, `client/src/components/Sessions/SessionCard.tsx:180`
- **Docs:** `docs/content/docs/(docs)/goals.mdx`


### [MEDIUM] Documented `filters` common parameter is completely ignored by GET /goals/:goalId/sessions

- **Kind:** docs-mismatch
- **Expected:** sessions.mdx line 39: "Accepts all [Common Parameters](...) plus the following" — the Common Parameters page defines the `filters` JSON parameter (country, device_type, browser, etc.). goals.mdx line 74 also says "Goals respect the global date range and filters (country, device, browser, etc.) applied on the page." So passing filters=[{parameter:"country",type:"equals",value:["US"]}] should restrict the returned converting sessions to US sessions.
- **Actual:** getGoalSessions declares Querystring: FilterParams<...> (line 16) but never reads req.query.filters and never calls getFilterStatement (it is not even imported). The query (lines 102-162) builds GoalSessions/AggregatedSessions CTEs using only the goal condition and timeStatement (line 45), so any `filters` value is silently discarded and unfiltered sessions are returned. Compare getGoals.ts:127-128 and getGoalTimeSeries.ts:75, which do apply getFilterStatement for the same documented parameter.
- **Code:** `server/src/api/analytics/goals/getGoalSessions.ts:16`, `server/src/api/analytics/goals/getGoalSessions.ts:45`, `server/src/api/analytics/goals/getGoalSessions.ts:102`, `client/src/api/analytics/hooks/goals/useGetGoalSessions.ts:23`
- **Docs:** `docs/content/docs/api/goals/sessions.mdx`, `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/(docs)/goals.mdx`


### [MEDIUM] Date-range time parameters are silently dropped without time_zone — the documented Get Goals example queries all-time data instead of the requested range

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx line 89: "All endpoints require date-based, exact datetime, or relative time parameters" and line 138: you must provide start_date+end_date+time_zone together. list.mdx's own request examples (lines 152, 159, 193, and every other language tab) call GET /api/sites/1/goals?start_date=2024-01-01&end_date=2024-01-31 with no time_zone, and the doc presents the response as January metrics. A user following either doc expects a 400 for an incomplete/missing time spec, or at minimum the January range to be applied.
- **Actual:** getTimeStatement (utils.ts:36) builds the date clause only when start_date AND end_date AND time_zone are all present: `const date = start_date && end_date && time_zone ? {...} : undefined`. With time_zone missing (as in the documented examples) — or with no time params at all — it falls through every branch and returns "" (utils.ts:89-90). getGoals.ts:126, getGoalTimeSeries.ts:74 and getGoalSessions.ts:45 then run their ClickHouse queries with no timestamp constraint, so total_conversions/total_sessions/conversion_rate (and time-series buckets, and goal sessions) are computed over the site's entire history. No error or warning is returned.
- **Code:** `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:89`, `server/src/api/analytics/goals/getGoals.ts:126`, `server/src/api/analytics/goals/getGoalTimeSeries.ts:74`, `server/src/api/analytics/goals/getGoalSessions.ts:45`
- **Docs:** `docs/content/docs/api/goals/list.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] Datetime response fields are not ISO 8601 as documented (time, session_start/session_end, createdAt)

- **Kind:** docs-mismatch
- **Expected:** time-series.mdx line 71 documents `time` as "ISO 8601 datetime" with example "2024-01-01T00:00:00.000Z"; sessions.mdx lines 114/119 document session_start/session_end as ISO 8601 with "2024-01-31T14:00:00.000Z" examples; list.mdx line 102 documents createdAt as ISO 8601 ("2024-01-10T12:00:00.000Z").
- **Actual:** All three come back in non-ISO formats. Time-series: `toDateTime(toStartOfHour(toTimeZone(timestamp, {timeZone:String})))` (getGoalTimeSeries.ts:85) is serialized by ClickHouse JSONEachRow as "2024-01-01 00:00:00" (space separator, no offset), and the value is wall-clock time in the requested time_zone, not UTC — there is no way to tell from the payload. Goal sessions: MAX/MIN(e.timestamp) (getGoalSessions.ts:136-137) serialize the same way. Goals list: createdAt is a Drizzle timestamp with mode "string" (schema.ts:339), returned as the raw Postgres text form (e.g. "2024-01-10 12:00:00.123456"), spread straight into the response at getGoals.ts:262-266.
- **Code:** `server/src/api/analytics/goals/getGoalTimeSeries.ts:85`, `server/src/api/analytics/goals/getGoalSessions.ts:136`, `server/src/api/analytics/goals/getGoalSessions.ts:137`, `server/src/db/postgres/schema.ts:339`, `server/src/api/analytics/utils/utils.ts:93`
- **Docs:** `docs/content/docs/api/goals/time-series.mdx`, `docs/content/docs/api/goals/sessions.mdx`, `docs/content/docs/api/goals/list.mdx`


### [LOW] Invalid common parameters (malformed dates, bad time_zone, invalid filters JSON) return 500 instead of the documented 400

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx line 493: "400 - Bad Request (invalid parameters)"; 500 is reserved for "Internal Server Error". So e.g. start_date=01/01/2024, time_zone=NotAZone, or filters=not-json should yield 400.
- **Actual:** In all three goals GET handlers, parameter sanitization runs inside the catch-all try block: getTimeStatement → validateTimeStatementParams (utils.ts:40-44) throws ZodError on a malformed date or invalid time zone, and getFilterStatement → validateFilters (query-validation.ts:337-348) throws Error("Invalid JSON format") or ZodError on bad filters. getGoals.ts:278-281 catches everything and replies 500 {error: "Failed to fetch goals data"}; getGoalTimeSeries.ts:146-149 replies 500 "Failed to fetch goal time series"; getGoalSessions.ts:176-179 replies 500 "Failed to fetch goal sessions". None of these handlers has a ZodError branch (unlike createGoal.ts:126-131, which correctly maps ZodError to 400).
- **Code:** `server/src/api/analytics/goals/getGoals.ts:278`, `server/src/api/analytics/goals/getGoalTimeSeries.ts:146`, `server/src/api/analytics/goals/getGoalSessions.ts:176`, `server/src/api/analytics/utils/query-validation.ts:337`, `server/src/api/analytics/utils/utils.ts:40`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Docs say a goal's type is permanent, but the update endpoint freely changes goalType

- **Kind:** docs-mismatch
- **Expected:** docs/content/docs/(docs)/goals.mdx lines 24-25 (Callout "Goal type is permanent"): "You cannot change a goal's type after creation. If you need a different type, create a new goal."
- **Actual:** PUT /api/sites/:siteId/goals/:goalId accepts goalType as a required body field and writes it unconditionally: updateGoal.ts:128-134 runs db.update(goals).set({ name, goalType, config }) with no comparison against existingGoal.goalType (fetched at lines 95-97 but only used for the siteId ownership check at line 104). A PUT with {goalType:"event", config:{eventName:"x"}} on a path goal succeeds and flips the type. Only the dashboard enforces the promise: GoalFormModal.tsx:315 renders a static type display instead of the selector when isEditMode.
- **Code:** `server/src/api/analytics/goals/updateGoal.ts:128`, `server/src/api/analytics/goals/updateGoal.ts:132`, `client/src/app/[site]/goals/components/GoalFormModal.tsx:315`
- **Docs:** `docs/content/docs/(docs)/goals.mdx`, `docs/content/docs/api/goals/update.mdx`


### [LOW] PUT goal with omitted optional `name` silently erases the existing name

- **Kind:** unexpected-behavior
- **Expected:** update.mdx documents `name` as "Updated goal name", required: false. An API consumer sending only {goalType, config} to fix a path pattern would reasonably expect the optional field they did not send to be left alone (or the docs to state that omission clears it).
- **Actual:** updateGoal.ts:131 executes `name: name || null` inside db.update(...).set(...), so an omitted (or empty-string) name overwrites the stored name with NULL. The goal then renders as "Goal #{id}" in the dashboard (GoalCard.tsx:227 fallback). There is no partial-update path; every PUT is a full overwrite of name/goalType/config.
- **Code:** `server/src/api/analytics/goals/updateGoal.ts:131`
- **Docs:** `docs/content/docs/api/goals/update.mdx`


---

## gsc (7)


### [HIGH] GSC dashboard section silently breaks (400) for 'Last 30 min/1h/6h/24h', 'All Time', and exact-datetime ranges

- **Kind:** broken
- **Expected:** The Search Console dashboard section should show data (or an honest error) for every time selection the DateSelector offers; docs promise you 'see search performance data alongside your analytics', and the API getting-started doc says all analytics endpoints accept date, exact-datetime, or relative (past_minutes) time parameters.
- **Actual:** For past-minutes presets (Last 30 minutes/1 hour/6 hours/24 hours), All Time, and any range with start/end times (e.g. chart zoom), the client sends no usable start_date/end_date, the server returns 400 'Missing start_date or end_date', and the UI renders the misleading empty-state 'No Data — Google Search Console data has a 2-3 day delay. Try selecting a wider date range.'
- **Code:** `client/src/api/gsc/hooks/useGetGSCData.ts:12`, `client/src/api/gsc/hooks/useGetGSCData.ts:19`, `client/src/api/utils.ts:40`, `client/src/api/utils.ts:63`, `client/src/api/utils.ts:74`, `client/src/api/analytics/endpoints/types.ts:54`, `client/src/api/gsc/endpoints/data.ts:31`, `server/src/api/gsc/getData.ts:24`, `client/src/app/[site]/main/components/sections/SearchConsole.tsx:100`, `client/src/components/DateSelector/DateSelector.tsx:289`, `client/src/components/DateSelector/DateSelector.tsx:386`
- **Docs:** `docs/content/docs/(docs)/site-settings.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** useGetGSCData (client/src/api/gsc/hooks/useGetGSCData.ts:12-22) computes timeParams = toQueryParams(buildApiParams(time)) then reads timeParams.start_date/end_date. For time.mode === 'past-minutes', buildApiParams (client/src/api/utils.ts:63-72) sets pastMinutesStart, so toQueryParams (client/src/api/analytics/endpoints/types.ts:64-72) returns an object with past_minutes_start and NO start_date key -> fetchGSCData sends start_date: undefined, which axios drops. For 'all-time', getStartAndEndDate (client/src/api/utils.ts:40-42) returns nulls -> buildApiParams coerces to '' (utils.ts:89-90) -> axios serializes start_date= (empty string). For 'range' with startTime/endTime, buildApiParams (utils.ts:74-85) emits only start_datetime/end_datetime, again no start_date. In all three cases server getData.ts:24-26 hits `if (!start_date || !end_date)` and returns 400. authedFetch throws (client/src/api/utils.ts catch re-throws response.data.error), React Query ends with data=undefined/isLoading=false, and SearchConsole.tsx:73,100-113 falls through to the 'No Data ... 2-3 day delay' branch. These modes are first-class presets: DateSelector.tsx:286-331 (past-minutes 30/60/360/1440) and 383-392 (All Time). The GSC endpoint only implements the date form of the shared time contract documented in docs/content/docs/api/getting-started.mdx (lines 87-141).


### [MEDIUM] Abandoning property selection leaves a half-connected 'PENDING_SELECTION' state that status reports as connected and that breaks all data fetches

- **Kind:** broken
- **Expected:** A connection should only be reported as 'connected' once a real GSC property is selected; an abandoned OAuth flow should not leave the UI claiming a working connection.
- **Actual:** callback.ts inserts a gsc_connections row with gscPropertyUrl: 'PENDING_SELECTION' (callback.ts:118-126) before the user picks a property. If the user clicks Cancel on the select-property page (page.tsx:107 just routes to /{site}/main) or closes the tab, the row persists. status.ts:22-32 has no special-casing, so GET /gsc/status returns {connected: true, gscPropertyUrl: 'PENDING_SELECTION'}. The dashboard then treats it as connected and every GET /gsc/data call queries the Google API with siteUrl 'PENDING_SELECTION' (getData.ts:46-47: encodeURIComponent(connection.gscPropertyUrl)), which Google rejects; the error status is proxied and the UI again shows the '2-3 day delay' empty state. GSCManager.tsx:72-86 renders a green dot with 'Connected to: PENDING_SELECTION' as a hyperlink whose href is the literal relative URL 'PENDING_SELECTION'.
- **Code:** `server/src/api/gsc/callback.ts:118`, `server/src/api/gsc/callback.ts:123`, `server/src/api/gsc/status.ts:29`, `server/src/api/gsc/getData.ts:47`, `client/src/components/SiteSettings/GSCManager.tsx:72`, `client/src/components/SiteSettings/GSCManager.tsx:78`, `client/src/app/[site]/gsc/select-property/page.tsx:107`
- **Docs:** `docs/content/docs/(docs)/site-settings.mdx`


### [MEDIUM] OAuth failure redirects target a nonexistent /error page, and the 'no GSC properties' path uses an undefined CLIENT_URL env var

- **Kind:** broken
- **Expected:** When token exchange fails, the callback throws, or the Google account has zero Search Console properties, the user should land on a page that explains the failure.
- **Actual:** All three failure redirects are broken. callback.ts:87 and :134 redirect to `${process.env.BASE_URL}/error?message=...`, but the client app has no /error route (client/src/app contains only not-found.tsx; client/src/proxy.ts has no /error handling), so the user gets the generic Next.js 404 and the message param is never shown. callback.ts:96 uses `${process.env.CLIENT_URL}/error?...`, and CLIENT_URL is defined nowhere (grep over server/src, .env.example, server/.env, docker-compose.yml and docker-compose.cloud.yml finds no definition; docker-compose.cloud.yml:125-144 sets GOOGLE_* and BASE_URL but not CLIENT_URL), so the Location header is literally 'undefined/error?message=No GSC properties found', which the browser resolves relative to /api/gsc/callback into /api/gsc/undefined/error... -> Fastify 404 JSON.
- **Code:** `server/src/api/gsc/callback.ts:87`, `server/src/api/gsc/callback.ts:96`, `server/src/api/gsc/callback.ts:134`, `client/src/app/[site]/gsc/select-property/page.tsx:55`


### [MEDIUM] Token refresh expiry check is commented out — every /gsc/data request performs a full OAuth refresh round-trip and DB write

- **Kind:** unexpected-behavior
- **Expected:** refreshGSCToken's own JSDoc says 'Refresh the GSC OAuth token if it's expired', and the code computes a 5-minute expiry buffer (utils.ts:88-90), so a still-valid access token should be returned without contacting Google.
- **Actual:** The early-return that used the expiry check is commented out (utils.ts:92-95), so the computed `fiveMinutesFromNow` is dead and EVERY call refreshes: getData.ts:40 calls refreshGSCToken on every /gsc/data request, which POSTs to https://oauth2.googleapis.com/token (utils.ts:98-109) and UPDATEs gsc_connections (utils.ts:132) even when the stored token has 59 minutes of validity left.
- **Code:** `server/src/api/gsc/utils.ts:92`, `server/src/api/gsc/utils.ts:88`, `server/src/api/gsc/utils.ts:98`, `server/src/api/gsc/utils.ts:132`, `server/src/api/gsc/getData.ts:40`


### [LOW] Enabling Public Analytics also exposes Google Search Console data and the GSC property URL to anonymous visitors (undocumented)

- **Kind:** unexpected-behavior
- **Expected:** Docs describe GSC as a settings-level integration ('Connect your Google Search Console account to see search performance data alongside your analytics') and nothing documents that turning on Public Analytics also publishes data pulled live from the owner's Google account; a user would reasonably expect Google-account-derived data (search queries, per-page clicks, CTR, positions for any date range) to stay restricted to team members or at least be a documented consequence.
- **Actual:** GET /sites/:siteId/gsc/status and GET /sites/:siteId/gsc/data are registered with publicSite (index.ts:417,420) -> allowPublicSiteAccess (auth-middleware.ts:153-177) -> getUserHasAccessToSitePublic returns true whenever config.public is set (auth-utils.ts:366-369) or a valid x-private-key embed key is supplied (auth-utils.ts:371-375). Any anonymous visitor to a public site can therefore call /gsc/data with arbitrary start_date/end_date/dimension (proxied straight to the owner's Google account, up to 1000 rows) and read the connected property URL from /gsc/status.
- **Code:** `server/src/index.ts:417`, `server/src/index.ts:420`, `server/src/lib/auth-middleware.ts:153`, `server/src/lib/auth-utils.ts:367`, `server/src/api/gsc/getData.ts:6`
- **Docs:** `docs/content/docs/(docs)/site-settings.mdx`


### [LOW] Client sends time_zone to /gsc/data but the server ignores it; GSC interprets dates in the property's timezone (PT), so the GSC panel's period can be offset from adjacent analytics panels

- **Kind:** unexpected-behavior
- **Expected:** The client deliberately passes the user's IANA timezone (fetchGSCData sends time_zone, data.ts:34; the hook threads timezone from the store, useGetGSCData.ts:21), matching the documented common-parameter contract where time_zone is 'Required with date ranges' — so the returned period should align with the analytics panels rendered next to it.
- **Actual:** The server destructures only start_date, end_date, dimension (getData.ts:17; Querystring type at types.ts:19-23 doesn't even declare time_zone) and forwards the bare dates to the GSC searchAnalytics API (getData.ts:54-56), which fixes date boundaries in the property's local time (America/Los_Angeles). The time_zone parameter is silently dropped, so for users in e.g. Asia/Tokyo the GSC card covers a window shifted up to ~17 hours from the analytics cards beside it.
- **Code:** `client/src/api/gsc/endpoints/data.ts:34`, `client/src/api/gsc/hooks/useGetGSCData.ts:21`, `server/src/api/gsc/getData.ts:17`, `server/src/api/gsc/types.ts:19`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] GSCManager listens for a ?gsc=success redirect parameter that no code path ever produces — the post-connect success toast/refetch is dead code

- **Kind:** unexpected-behavior
- **Expected:** The settings component is written to detect OAuth completion via a gsc=success query param (GSCManager.tsx:21 useQueryState('gsc'); 28-33 toast + refetch), implying the connect flow should return the user to the settings page with that param.
- **Actual:** Nothing ever emits gsc=success: the OAuth callback redirects to /{siteId}/gsc/select-property?properties=... (callback.ts:131) and the select-property page redirects to /{site}/main after selection (page.tsx:46). A repo-wide grep for 'gsc=success' (server/src and client/src) returns zero producers. The user who started from Site Settings -> Integrations is dropped on the main dashboard, the settings dialog's success toast never fires, and its cached gsc-status query is only refreshed by the select-property page's own toast path.
- **Code:** `client/src/components/SiteSettings/GSCManager.tsx:21`, `client/src/components/SiteSettings/GSCManager.tsx:28`, `server/src/api/gsc/callback.ts:131`, `client/src/app/[site]/gsc/select-property/page.tsx:46`


---

## imports (12)


### [HIGH] Fresh installs have no import_id column on the ClickHouse events table, so DELETE import always 500s and imported events are never tagged

- **Kind:** broken
- **Expected:** delete.mdx: 'Deletes an import and all events it added' returning 200; data-import.mdx: deletion 'will permanently remove the import record and all associated events'.
- **Actual:** On any deployment whose events table was created from current master, the table has no import_id column. Imported rows lose their import_id on insert (ClickHouse's default input_format_skip_unknown_fields=1 silently drops unknown JSONEachRow fields), and the delete handler's `DELETE FROM events WHERE import_id = {importId:UUID}` fails with a missing-column error, so the endpoint returns 500 'Failed to delete imported events' and the import record is never removed.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:44-85`, `server/src/api/sites/deleteSiteImport.ts:73-82`, `server/src/services/import/mappers/umami.ts:154`, `server/src/services/import/mappers/plausible.ts:95`, `server/src/services/import/mappers/simpleAnalytics.ts:81`, `server/src/services/tracker/pageviewQueue.ts:112`
- **Docs:** `docs/content/docs/api/imports/delete.mdx`, `docs/content/docs/(docs)/data-import.mdx`
- **Evidence:** The events CREATE TABLE at server/src/db/clickhouse/clickhouse.ts:44-77 ends at `props JSON` with no import_id; the only ALTER on events (lines 79-85) adds feature_flags. `grep -rn import_id server/src/db` finds no ClickHouse DDL. Git history: commit 54c0dd43 originally added `ADD COLUMN IF NOT EXISTS import_id` to the events ALTER block, and commit 14952b4a ('Bot blocking v2') deleted that whole ALTER block (diff shows `- ADD COLUMN IF NOT EXISTS import_id Nullable(UUID)`) without moving import_id into the CREATE TABLE. All three mappers set `import_id: importId` on every inserted row (umami.ts:154, plausible.ts:95, simpleAnalytics.ts:81) and batchImportEvents.ts:106-110 inserts them into `events` as JSONEachRow, where the field is silently discarded on fresh schemas. deleteSiteImport.ts:73-79 then runs `DELETE FROM events WHERE import_id = {importId:UUID}`, which errors on the missing column and is caught at lines 80-82 returning 500. Only deployments upgraded from a pre-14952b4a version (whose ALTER already ran) still have the column.


### [MEDIUM] A stuck import is never auto-completed after 2 hours and can never be deleted, despite docs promising both

- **Kind:** docs-mismatch
- **Expected:** data-import.mdx (Troubleshooting, 'Import Appears Stuck'): 'If still stuck after 2 hours, the import will be automatically marked as complete.' Deletion is then possible since only active imports cannot be deleted.
- **Actual:** Nothing ever sets completedAt except a client-sent isLastBatch. If the browser tab closes or the uploader errors mid-import, the import_status row keeps completedAt=null forever: the API lists it as running forever, the UI polls every 5 seconds indefinitely and hides the delete button, and DELETE returns 400 'Cannot delete active import' permanently.
- **Code:** `server/src/services/import/importQuotaManager.ts:69-93`, `server/src/services/import/importStatusManager.ts:41-48`, `server/src/api/sites/deleteSiteImport.ts:46-48`, `client/src/components/SiteSettings/ImportManager.tsx:417`, `client/src/api/admin/hooks/useImport.ts:16-19`
- **Docs:** `docs/content/docs/(docs)/data-import.mdx`, `docs/content/docs/api/imports/delete.mdx`, `docs/content/docs/api/imports/list.mdx`


### [MEDIUM] One malformed CSV row 400s the entire upload batch and the dashboard importer then silently abandons the whole import, instead of counting the row as invalid

- **Kind:** docs-mismatch
- **Expected:** data-import.mdx (Import Metrics / Invalid Events): rows with 'Malformed CSV data' or 'Missing required fields' are counted as invalidEvents and displayed in Import History; events.mdx says invalid events are 'reflected in the import's skippedEvents / invalidEvents counts'.
- **Actual:** The request-level Zod schema requires every event in the batch to contain every platform key as a string (deriveKeyOnlySchema makes all keys required, utils.ts:9-17). A single row with a missing field (e.g. a truncated CSV line, which PapaParse emits with undefined values that JSON.stringify drops) fails the union at batchImportEvents.ts:22-26 and the whole batch is rejected with 400 'Validation error' — no invalidEvents counting. The dashboard's CsvParser catches the 400 (csvParser.ts:112-116), cancels and aborts the entire import, and the complete handler (lines 118-119) then skips the finalizing isLastBatch call because cancelled is set — so the import is left permanently 'In Progress' (see stuck-import finding) with the error only in the browser console; ImportManager.tsx never surfaces parser/upload errors.
- **Code:** `server/src/api/sites/batchImportEvents.ts:15-30`, `server/src/api/sites/batchImportEvents.ts:44-46`, `server/src/services/import/mappers/utils.ts:3-18`, `client/src/lib/import/csvParser.ts:112-116`, `client/src/lib/import/csvParser.ts:118-127`
- **Docs:** `docs/content/docs/(docs)/data-import.mdx`, `docs/content/docs/api/imports/events.mdx`


### [MEDIUM] Dashboard CSV import finalizes the import while chunk uploads are still in flight (PapaParse does not await the async chunk callback)

- **Kind:** broken
- **Expected:** isLastBatch finalizes the import after all event batches are uploaded ('Set isLastBatch to true on the final batch'); the UI's Import History shows accurate final counts and 'Completed' only when the import is done.
- **Actual:** For Umami/Simple Analytics imports, Papa.parse is configured with worker:true and an async `chunk` callback (csvParser.ts:82). PapaParse 5.5.3 invokes worker.userChunk synchronously without awaiting its promise and calls completeWorker as soon as the finished message arrives (papaparse.js:1875-1881), so csvParser's `complete` fires while the 5 MB chunk POSTs are still pending, and `uploadChunk([], true)` races them. The tiny finalize request typically completes before the large in-flight inserts, so the server sets completedAt and releases the org concurrency lock while events are still being inserted. The server never rejects uploads to a completed import (batchImportEvents.ts:51-58 checks only existence and site ownership, not completedAt), so the late batches still land, but the client stops its 5-second polling the moment completedAt is non-null (useImport.ts:16-19), leaving Import History showing 'Completed' with frozen, undercounted imported/skipped/invalid totals; any chunk that fails after finalize is silently lost while status says Completed.
- **Code:** `client/src/lib/import/csvParser.ts:77-133`, `client/node_modules/papaparse/papaparse.js:1873-1881`, `server/src/api/sites/batchImportEvents.ts:51-58`, `server/src/api/sites/batchImportEvents.ts:113-118`, `client/src/api/admin/hooks/useImport.ts:16-19`
- **Docs:** `docs/content/docs/api/imports/events.mdx`, `docs/content/docs/(docs)/data-import.mdx`


### [MEDIUM] Standard (non-pro) cloud plans get a 24-month import window, not the documented 36 months

- **Kind:** docs-mismatch
- **Expected:** data-import.mdx plan table (lines 24-29) and 'Historical Data Windows' (line 44): Standard plans can import data from the past 36 months (3 years); Pro 60; AppSumo 24.
- **Actual:** getHistoricalWindowMonths returns 60 only when the stripe planName starts with 'pro' and falls through to `return 24` for every other stripe plan, so Standard plans (planNames like 'standard100k', see server/src/lib/const.ts:121) get 24 months. Events between 24 and 36 months old are skipped, and createSiteImport reports the correspondingly narrower earliestAllowedDate to the client, which then drops those rows client-side too.
- **Code:** `server/src/services/import/importQuotaTracker.ts:13-30`, `server/src/services/import/importQuotaTracker.ts:63-64`, `server/src/api/sites/createSiteImport.ts:74-79`
- **Docs:** `docs/content/docs/(docs)/data-import.mdx`


### [MEDIUM] Concurrent-import limit and monthly import quota are per-process in-memory state, so the documented 429 guarantee breaks under cluster mode and restarts

- **Kind:** docs-mismatch
- **Expected:** create.mdx line 20: 'Only one concurrent import is allowed per organization. Starting a second import while one is still running returns HTTP 429.' data-import.mdx: 'Maximum 1 active import per organization' for cloud, and imported events count against the monthly event limit.
- **Actual:** ImportQuotaManager keeps activeImports and the per-org ImportQuotaTracker in plain module-level Maps (importQuotaManager.ts:11-12). When the server runs with CLUSTER_WORKERS > 0, cluster.ts forks N workers (lines 61-63) that each import index.js and get an independent ImportQuotaManager; the OS round-robins connections across workers, so two POST /imports requests landing on different workers both pass startImport and no 429 is returned. Quota is likewise double-counted: each worker builds its own monthlyUsage snapshot from ClickHouse (ImportQuotaTracker.create), so batches split across workers can each consume the full remaining monthly quota. A process restart also clears the lock while an import is mid-upload.
- **Code:** `server/src/services/import/importQuotaManager.ts:10-17`, `server/src/services/import/importQuotaManager.ts:49-63`, `server/src/cluster.ts:61-63`, `server/src/api/sites/createSiteImport.ts:68-70`
- **Docs:** `docs/content/docs/api/imports/create.mdx`, `docs/content/docs/(docs)/data-import.mdx`


### [LOW] Deleting an old completed import releases the organization's active-import lock, allowing a second concurrent import while one is running

- **Kind:** broken
- **Expected:** Only one active import per organization on cloud; a second create while one is running returns 429.
- **Actual:** deleteSiteImport unconditionally calls importQuotaManager.completeImport(importRecord.organizationId) after deleting any import. Since only completed imports can be deleted (line 46-48 blocks active ones), the lock being cleared always belongs to some OTHER import: if the org currently has import B running (activeImports entry set at creation), deleting old completed import A wipes B's lock, and a subsequent POST /imports succeeds instead of returning 429, giving two concurrent imports.
- **Code:** `server/src/api/sites/deleteSiteImport.ts:90`, `server/src/services/import/importQuotaManager.ts:65-67`
- **Docs:** `docs/content/docs/api/imports/create.mdx`, `docs/content/docs/(docs)/data-import.mdx`


### [LOW] Simple Analytics import converts UTC timestamps into the server's local timezone before storing them

- **Kind:** broken
- **Expected:** Imported event timestamps preserve the original UTC instant from the Simple Analytics export (added_iso is a Z-suffixed UTC datetime enforced by z.string().datetime() at simpleAnalytics.ts:14).
- **Actual:** The mapper renders the timestamp with `DateTime.fromISO(data.added_iso).toFormat("yyyy-MM-dd HH:mm:ss")` without a zone option, so Luxon converts the UTC instant into the Node process's local timezone before formatting. ClickHouse and the quota tracker both treat that string as UTC (importQuotaTracker.ts:173 parses it with zone 'utc'; the events DateTime column stores it as-is), so on any server not running in UTC every Simple Analytics event is shifted by the host's UTC offset — wrong hourly buckets and potentially wrong days/months for quota and analytics.
- **Code:** `server/src/services/import/mappers/simpleAnalytics.ts:55`, `server/src/services/import/importQuotaTracker.ts:173`


### [LOW] List Imports returns startedAt/completedAt in SQL format, not the documented ISO 8601, and the dashboard then displays startedAt shifted into the viewer's timezone

- **Kind:** docs-mismatch
- **Expected:** list.mdx documents startedAt/completedAt as 'ISO 8601 datetime' with examples like "2024-01-10T12:00:00.000Z", i.e. unambiguous UTC instants.
- **Actual:** importStatus.startedAt/completedAt are Drizzle `timestamp(..., { mode: "string" })` columns, returned verbatim as Postgres text like "2024-01-10 12:00:00.123456" — no 'T', no timezone designator. API consumers parsing them as ISO get failures or local-time misinterpretation. The bundled dashboard confirms the wire format by parsing with DateTime.fromSQL (ImportManager.tsx:365), but omits a zone option, so the UTC wall time stored by the server (Postgres now() / DateTime.utc().toISO() at importStatusManager.ts:45) is interpreted as viewer-local: a user at UTC-8 sees an import started at 12:00 UTC listed as '12:00' local, 8 hours off.
- **Code:** `server/src/db/postgres/schema.ts:812-813`, `server/src/api/sites/getSiteImports.ts:58-70`, `client/src/components/SiteSettings/ImportManager.tsx:365`
- **Docs:** `docs/content/docs/api/imports/list.mdx`


### [LOW] GET imports returns only the 10 most recent imports although docs say it returns all imports

- **Kind:** docs-mismatch
- **Expected:** list.mdx: 'Returns all data imports for a site with their progress counts' and 'This endpoint takes no query parameters' — i.e. the full history, with no pagination mechanism.
- **Actual:** getImportsForSite has a default `limit = 10` and getSiteImports calls it without overriding, so the endpoint silently truncates to the 10 most recently started imports. There is no pagination parameter to fetch the rest; older imports become invisible to both the API and the dashboard's Import History (which the data-import guide says 'displays all your past and current imports').
- **Code:** `server/src/services/import/importStatusManager.ts:50-56`, `server/src/api/sites/getSiteImports.ts:56`
- **Docs:** `docs/content/docs/api/imports/list.mdx`


### [LOW] Dashboard import drops out-of-window and malformed rows client-side, so the documented skipped/invalid counts in Import History never reflect them

- **Kind:** unexpected-behavior
- **Expected:** data-import.mdx: 'Events outside your plan's historical window will be automatically skipped during import' and 'Skipped events are counted and displayed in the import history'; rows missing required fields count as Invalid Events.
- **Actual:** The dashboard parsers filter rows against allowedDateRange before uploading (csvParser.ts:93/104 via isDateInRange; plausibleParser.ts:423-424 skips whole dates) and drop rows without created_at/added_iso (csvParser.ts:182-186/205-209 return null), so the server never sees them and skippedEvents/invalidEvents stay at 0 for those rows. A cloud user importing a 5-year Umami export on a 24-month plan sees an import that reports 0 skipped events while silently discarding years of data; the server-side skip counting (batchImportEvents.ts:100-103) only applies to rows that actually reach the API.
- **Code:** `client/src/lib/import/csvParser.ts:93`, `client/src/lib/import/csvParser.ts:104`, `client/src/lib/import/csvParser.ts:135-154`, `client/src/lib/import/csvParser.ts:182-186`, `client/src/lib/import/plausibleParser.ts:423-424`
- **Docs:** `docs/content/docs/(docs)/data-import.mdx`, `docs/content/docs/api/imports/events.mdx`


### [LOW] Data Import guide omits Plausible, which is a fully supported import platform

- **Kind:** docs-mismatch
- **Expected:** data-import.mdx lines 13-17 state Rybbit supports importing only from 'Umami' and 'Simple Analytics', and the how-to instructs uploading a CSV for all platforms.
- **Actual:** The implementation (importPlatforms enum, create endpoint, batch mapper, and the dashboard UI with its ZIP-based Plausible flow) fully supports 'plausible' as a third platform — the API reference (imports/create.mdx) even documents it. The user guide contradicts the product: it omits Plausible entirely and gives no instructions for its ZIP export flow (the UI requires a ZIP, not CSV, for Plausible per ImportManager.tsx:76-78).
- **Code:** `server/src/db/postgres/schema.ts:798`, `server/src/api/sites/createSiteImport.ts:17-19`, `client/src/components/SiteSettings/ImportManager.tsx:254-258`
- **Docs:** `docs/content/docs/(docs)/data-import.mdx`


---

## journeys-retention (10)


### [HIGH] Journeys silently ignores missing/invalid time parameters and returns all-time data — the docs' own example requests trigger this

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx (lines 87-141) says all analytics endpoints REQUIRE time parameters and that a date-range query must include all three of start_date, end_date, time_zone; the error table (lines 490-498) promises 400 for invalid parameters. A caller sending start_date/end_date expects data scoped to that range or an error.
- **Actual:** If time params are incomplete (e.g. time_zone omitted) or invalid, the endpoint returns HTTP 200 with journeys computed over ALL TIME. Every cURL/JS/Python/PHP/Ruby/Go/Rust/Java/.NET example in journeys.mdx (e.g. line 93: ?steps=4&limit=20&start_date=2024-01-01&end_date=2024-01-31) omits time_zone, so copying the documented example silently returns all-time data instead of January data.
- **Code:** `server/src/api/analytics/getJourneys.ts:48`, `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:90`, `server/src/api/analytics/utils/query-validation.ts:92-100`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/insights/journeys.mdx`
- **Evidence:** getJourneys.ts:48 calls getTimeStatement(request.query). In utils.ts:36, `const date = start_date && end_date && time_zone ? {...} : undefined` — without time_zone, date is undefined. With no dateTimeRange/pastMinutesRange either, timeStatementParamsSchema's refine ('Either date, dateTimeRange, or pastMinutesRange must be provided', query-validation.ts:92-94) fails, but the schema ends with `.catch({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined})` (query-validation.ts:96-100), which swallows the validation failure. getTimeStatement then falls through to `return ""` (utils.ts:90), and the ClickHouse query at getJourneys.ts:94/121 interpolates an empty time statement — no timestamp bounds at all. The same happens for syntactically invalid dates (start_date=2024-13-45) or an invalid time_zone: fillDateParamsSchema fails, .catch() absorbs it, 200 + all-time data instead of the documented 400.


### [MEDIUM] Documented pathname/page_title/querystring filters are applied per-event inside the journey-building CTE, so a pathname equals-filter always returns zero journeys

- **Kind:** broken
- **Expected:** journeys.mdx line 34 says the endpoint 'Accepts all Common Parameters', and getting-started.mdx lists pathname, page_title and querystring as filter parameters. A user filtering journeys by pathname (e.g. sessions that visited /pricing) expects the journeys of the matching sessions.
- **Actual:** The filter is injected into the event-level WHERE clause of the CTE that builds each session's path (getJourneys.ts:95), so non-matching pageviews are removed from the path itself. With filters=[{"parameter":"pathname","type":"equals","value":["/pricing"]}], every session's path_sequence collapses to at most ["/pricing"] after arrayCompact, which fails `HAVING length(path_sequence) >= 2` (getJourneys.ts:100) — the endpoint returns {journeys: []} for every site and time range. Contains/regex pathname filters likewise return mangled paths built only from matching pages rather than filtered sessions.
- **Code:** `server/src/api/analytics/getJourneys.ts:49`, `server/src/api/analytics/getJourneys.ts:92-100`, `server/src/api/analytics/utils/getFilterStatement.ts:19`, `client/src/lib/filterGroups.ts:52-76`
- **Docs:** `docs/content/docs/api/insights/journeys.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Retention reports null (documented as 'period hasn't occurred yet') for fully-elapsed periods where 0% of the cohort returned

- **Kind:** docs-mismatch
- **Expected:** retention.mdx (percentages field, lines 93-98: 'null indicates no data for that period yet'; line 260: 'A null value indicates that period hasn't occurred yet for that cohort') promises null exclusively means the period has not elapsed; an elapsed period with no returners should be 0.
- **Actual:** Any period in which zero cohort members returned is emitted as null, indistinguishable from a not-yet-elapsed period. Example: cohort of 100 users, nobody returns in week 1, some return in week 2 → percentages = [100, null, x]; a consumer (and the dashboard, which renders '-' with a blank cell) reads week 1 as 'not occurred yet' when its true value is 0%. Trailing elapsed periods with zero returners are also null.
- **Code:** `server/src/api/analytics/getRetention.ts:64-75`, `server/src/api/analytics/getRetention.ts:131-134`, `server/src/api/analytics/getRetention.ts:144-149`
- **Docs:** `docs/content/docs/api/insights/retention.mdx`


### [LOW] Retention cohorts are 'first visit within the query window', not first visit ever — early cohorts are inflated with returning users

- **Kind:** unexpected-behavior
- **Expected:** retention.mdx line 18: 'Users are grouped into cohorts based on their first visit'; feature-guides/retention.mdx line 12: 'all users who first visited on January 15th form one cohort'. A cohort should contain new users whose first-ever visit falls in that period.
- **Actual:** The UserFirstPeriod CTE computes min(timestamp) restricted to `timestamp >= addDays(today(), -{timeRange})` (getRetention.ts:52). A user whose true first visit predates the window is assigned to the cohort of their earliest event inside the window as if they were new. With range=90, a long-time weekly-active user lands in the oldest in-window cohort, inflating its size and its retention percentages relative to the documented 'first visit' semantics.
- **Code:** `server/src/api/analytics/getRetention.ts:44-53`
- **Docs:** `docs/content/docs/api/insights/retention.mdx`, `docs/content/docs/(docs)/feature-guides/retention.mdx`


### [LOW] Invalid filters parameter on journeys returns 500 instead of the documented 400

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx error table (lines 490-498): '400 - Bad Request (invalid parameters)'; 500 is reserved for internal server errors. Malformed filters JSON, an unknown filter parameter, an invalid regex, or an over-long regex are all invalid client input.
- **Actual:** GET /api/sites/1/journeys?filters=notjson returns 500 {"error":"Failed to get journeys"}. Same for filters=[{"parameter":"bogus",...}] (Zod enum failure), an invalid or >500-char regex pattern, and a non-numeric greater_than value — all throw inside getFilterStatement and are swallowed by the generic catch.
- **Code:** `server/src/api/analytics/getJourneys.ts:49`, `server/src/api/analytics/getJourneys.ts:142-145`, `server/src/api/analytics/utils/query-validation.ts:337-348`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Retention silently coerces invalid mode and out-of-range range values instead of rejecting them

- **Kind:** unexpected-behavior
- **Expected:** retention.mdx documents mode as '"day" | "week"' and range as 'Number of days to analyze (7-365)'; getting-started.mdx promises 400 for invalid parameters. mode=month or range=1000 should be rejected.
- **Actual:** mode=month (or any non-'day' string, including typos like mode=Day) silently runs weekly analysis and the response reports mode:'week'; range=1000 is clamped to 365, range=3 clamped to 7, and range=abc becomes the default 90 — always HTTP 200, never 400, with the coerced values echoed in the response instead of the requested ones.
- **Code:** `server/src/api/analytics/getRetention.ts:33`, `server/src/api/analytics/getRetention.ts:36`
- **Docs:** `docs/content/docs/api/insights/retention.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] Journeys and retention are readable with no authentication on public sites, and missing auth on private sites yields 403, not the documented 401

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx line 39: 'All API requests must include authentication'; error table line 494: '401 - Unauthorized (missing or invalid API key)' for missing/invalid keys, with 403 reserved for 'no access to site'.
- **Actual:** Both routes are registered with the publicSite preHandler chain. If the site's `public` flag is set, getUserHasAccessToSitePublic returns true with no session, API key, or private key (auth-utils.ts:366-369), so completely unauthenticated requests succeed. For non-public sites, a request with no credentials at all falls through to `reply.status(403).send({ error: "Forbidden" })` (auth-middleware.ts:176) — there is no 401 path in allowPublicSiteAccess.
- **Code:** `server/src/index.ts:285`, `server/src/index.ts:302`, `server/src/lib/auth-middleware.ts:153-177`, `server/src/lib/auth-utils.ts:357-383`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Sankey node tooltip pairs an aggregated visit count with the percentage of one arbitrary journey, producing internally inconsistent numbers

- **Kind:** unexpected-behavior
- **Expected:** A node tooltip showing 'N visits (P%)' should show a percentage consistent with N — i.e. the share of sessions represented by the N visits flowing through that node.
- **Actual:** node.count sums the values of ALL links into (or out of, for step 0) the node across every journey passing through it, but node.percentage is copied from the single first journey in the (count-desc-sorted) list whose path has that page at that step. With journeys [['/','/a'] count 100 pct 10] and [['/','/b'] count 50 pct 5], the '/' node at step 0 shows '150 visits (10.0%)' — the count implies 15% under the same denominator.
- **Code:** `client/src/app/[site]/journeys/components/SankeyDiagram.tsx:95-106`, `client/src/app/[site]/journeys/components/SankeyDiagram.tsx:344-350`


### [LOW] Feature guide says journey nodes represent 'a page or event', but journeys are built exclusively from pageviews

- **Kind:** docs-mismatch
- **Expected:** feature-guides/journeys.mdx lines 12-14 ('Nodes: Each circle represents a page or event') implies custom events appear as steps in the journey visualization; line 39 also advertises 'Goal-based analysis - How did converting users get there?'.
- **Actual:** The journeys query hard-filters to `AND type = 'pageview'` (getJourneys.ts:96), so custom events never appear as journey steps; every node is a pathname. There is also no goal/event-based journey mode: the only event-related lever is the session-level event_name common filter, and the dashboard's journeys page does not expose event_name at all (client/src/lib/filterGroups.ts:52-76).
- **Code:** `server/src/api/analytics/getJourneys.ts:96`
- **Docs:** `docs/content/docs/(docs)/feature-guides/journeys.mdx`


### [LOW] Retention ignores the common time/filter parameters that getting-started declares are shared by and required for all analytics endpoints

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx line 85: 'The following parameters are shared across all analytics endpoints'; line 89: 'All endpoints require date-based, exact datetime, or relative time parameters'; the filters section likewise presents filters as universal. A caller passing start_date/end_date/time_zone or filters to /retention expects them honored or rejected.
- **Actual:** getRetention reads only mode and range from the querystring (Querystring type at getRetention.ts:25 is `{ mode?: string; range?: string }`); start_date, end_date, time_zone, start_datetime, past_minutes_* and filters are silently discarded — no 400, no effect on results. The window is always `addDays(today(), -range)` in the ClickHouse server's timezone, so even a supplied time_zone cannot shift cohort day/week boundaries. (retention.mdx's own parameter table documents only mode/range, so the contradiction is between it and the getting-started 'all endpoints' contract.)
- **Code:** `server/src/api/analytics/getRetention.ts:22-36`, `server/src/api/analytics/getRetention.ts:42-100`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/insights/retention.mdx`


---

## orgs-teams (12)


### [HIGH] GET /organizations/:organizationId/sites returns every site's secret privateLinkKey and apiKey columns to any org member

- **Kind:** unexpected-behavior
- **Expected:** The Get Organization Sites doc lists site fields (siteId, name, domain, public, sessionsLast24Hours, isOwner, teams) and says only 'other site-config fields may also be present'. Secrets are gated elsewhere: GET/POST /sites/:siteId/private-link-config is registered with the adminSite preHandler (index.ts:359-360), i.e. the private-link key is meant to be visible to site admins/owners only.
- **Actual:** getSitesFromOrg builds each response row with `...site` (getSitesFromOrg.ts:115-122), spreading the entire Drizzle `sites` row — including `apiKey` (schema.ts:94) and `privateLinkKey` (schema.ts:95) — into the JSON sent at line 129. The route uses only the orgMember preHandler (index.ts:383), so every member-role user (including members restricted to specific sites) receives the privateLinkKey of each site they can list.
- **Code:** `server/src/api/sites/getSitesFromOrg.ts:115`, `server/src/api/sites/getSitesFromOrg.ts:129`, `server/src/db/postgres/schema.ts:94`, `server/src/db/postgres/schema.ts:95`, `server/src/index.ts:383`, `server/src/index.ts:359`, `server/src/lib/auth-utils.ts:372`
- **Docs:** `docs/content/docs/api/organizations/sites.mdx`
- **Evidence:** Route: index.ts:383 `fastify.get("/organizations/:organizationId/sites", orgMember, getSitesFromOrg)` — requireOrgMember (auth-middleware.ts:182-208) only checks org membership, any role. Handler: getSitesFromOrg.ts:35 selects `db.select().from(sites)` (all columns), line 115-122 maps `sitesData.map(site => ({ ...site, ... }))`, line 127-129 `res.status(200).send({ organization: orgInfo[0] || null, sites: enhancedSitesData, ... })`. Nothing strips apiKey/privateLinkKey. Contrast getSite.ts:29-56 which whitelists fields and omits both secrets, and index.ts:359 which puts private-link-config behind adminSite. A leaked privateLinkKey is directly usable for auth: getUserHasAccessToSitePublic (auth-utils.ts:372-375) grants dashboard access to any request presenting `x-private-key` equal to config.privateLinkKey, so a member-role user can mint a link that gives outsiders access to the site dashboard — a capability the code otherwise reserves for site admins.


### [MEDIUM] GET /org-event-count: documented time_zone parameter does not bucket days in that timezone (always UTC), and the WITH FILL grid is misaligned for non-UTC zones, producing duplicate/zero rows

- **Kind:** broken
- **Expected:** event-count.mdx line 47 documents time_zone as the 'IANA timezone used to bucket events into days', and the response example (lines 236, 249) shows event_date as a plain date 'YYYY-MM-DD'. A caller passing time_zone=America/New_York expects one row per New York calendar day.
- **Actual:** Days are always bucketed by UTC: the query groups by `toStartOfDay(timestamp) as event_date` (getOrgEventCount.ts:92, GROUP BY at :107) with no timezone conversion, so time_zone only shifts the range boundary filter (lines 56-67). Additionally, event_date is returned as a DateTime string 'YYYY-MM-DD 00:00:00', not 'YYYY-MM-DD' (processResults leaves it a string since Number('2024-01-01 00:00:00') is NaN). For non-UTC time_zone the WITH FILL FROM/TO values (lines 70-82) are local-midnight instants (e.g. 2024-01-01 05:00:00 UTC for New York) while the real group keys are UTC midnights (00:00:00), so the STEP INTERVAL 1 DAY fill grid never coincides with real rows and ClickHouse emits an extra zero-count fill row per day interleaved with the real rows — up to 2 rows per calendar day.
- **Code:** `server/src/api/analytics/getOrgEventCount.ts:56`, `server/src/api/analytics/getOrgEventCount.ts:70`, `server/src/api/analytics/getOrgEventCount.ts:92`, `server/src/api/analytics/getOrgEventCount.ts:107`, `server/src/api/analytics/getOrgEventCount.ts:109`
- **Docs:** `docs/content/docs/api/organizations/event-count.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Cloud member-limit enforcement is bypassable: invite-member only checks the limit when organizationId is explicitly in the body, and the add-member/create-user endpoints never check it

- **Kind:** broken
- **Expected:** invite-member.mdx documents organizationId as optional ('Defaults to your active organization'). The plan's member limit should be enforced regardless of how the member is added — the UI blocks inviting past the limit (InviteMemberDialog.tsx:112-128), and auth.ts throws FORBIDDEN 'You have reached the limit of N members' when the limit is hit.
- **Actual:** The before-hook in auth.ts:322-345 runs the member-limit check only inside `if (organizationId)` where organizationId comes solely from the request body (line 323-326). Calling POST /api/auth/organization/invite-member without organizationId (the documented default-to-active-org path) skips the check entirely. POST /organizations/:organizationId/members (addUserToOrganization.ts — inserts at line 86 with no limit check) and POST /organizations/:organizationId/users (createUserInOrganization.ts — inserts at line 112 with no limit check) also add members with no limit enforcement on cloud.
- **Code:** `server/src/lib/auth.ts:322`, `server/src/lib/auth.ts:326`, `server/src/api/user/addUserToOrganization.ts:86`, `server/src/api/user/createUserInOrganization.ts:112`, `server/src/index.ts:386`, `server/src/index.ts:387`
- **Docs:** `docs/content/docs/api/organizations/invite-member.mdx`, `docs/content/docs/api/organizations/add-member.mdx`


### [MEDIUM] GET /org-event-count returns 403 for legitimate org members when the org has no sites, and silently returns partial (caller-visible-sites-only) counts instead of the documented organization-wide counts

- **Kind:** unexpected-behavior
- **Expected:** event-count.mdx: 'Returns daily event usage counts across an organization's sites.' A member of the organization should get the org's usage (or an empty data array for an org with no sites), not an authorization error, and the numbers should cover the organization's sites.
- **Actual:** After requireOrgMember has already verified membership, the handler recomputes access from getSitesUserHasAccessTo (line 39), filters to the org (line 42), and returns 403 'No access to organization or no sites found' whenever that list is empty (lines 44-46) — which happens for any member of an org with zero sites, and for a restricted member whose grants are empty. For a restricted member with partial grants, siteIds (line 48) contains only their accessible sites, so the 'organization' usage silently excludes all other sites with no indication in the response.
- **Code:** `server/src/api/analytics/getOrgEventCount.ts:39`, `server/src/api/analytics/getOrgEventCount.ts:42`, `server/src/api/analytics/getOrgEventCount.ts:44`, `server/src/index.ts:333`
- **Docs:** `docs/content/docs/api/organizations/event-count.mdx`


### [LOW] POST /organizations/:organizationId/sites crashes with an unhandled 500 when the documented-required 'domain' field (or the body) is missing

- **Kind:** broken
- **Expected:** create-site.mdx documents `domain` and `name` as required request-body fields. Omitting a required field should produce a 4xx validation error, as other handlers in this area do (e.g. addUserToOrganization returns 400 'Missing required fields').
- **Actual:** There is no Zod/Fastify schema on the route and no presence check. With `domain` missing, line 66 `domain.replace(/^https?:\/\//, ...)` throws TypeError (undefined.replace); with no JSON body at all, the destructuring at line 40 throws. Both throws happen before the `try {` at line 87, so they escape the handler's catch and Fastify returns a generic 500 Internal Server Error. Missing `name` reaches the insert and 500s on the NOT NULL constraint (schema.ts:67).
- **Code:** `server/src/api/sites/addSite.ts:40`, `server/src/api/sites/addSite.ts:66`, `server/src/api/sites/addSite.ts:87`, `server/src/index.ts:384`
- **Docs:** `docs/content/docs/api/organizations/create-site.mdx`


### [LOW] Self-hosted GET /organizations/:organizationId/sites returns subscription.eventLimit = null (Infinity serialized), contradicting the documented number type and the client's type

- **Kind:** docs-mismatch
- **Expected:** sites.mdx (lines 110-112) documents subscription.eventLimit as type number ('Monthly event limit for the plan'); the client type GetSitesFromOrgResponse declares `eventLimit: number` (client/src/api/admin/endpoints/sites.ts:65).
- **Actual:** On self-hosted deployments (IS_CLOUD false) the handler sets `eventLimit = Infinity` (getSitesFromOrg.ts:87-89). The response is serialized without a Fastify schema, so JSON.stringify converts Infinity to null and every self-hosted response carries `"eventLimit": null` — a value that is neither the documented number nor the client-declared type.
- **Code:** `server/src/api/sites/getSitesFromOrg.ts:89`, `server/src/api/sites/getSitesFromOrg.ts:130`, `client/src/api/admin/endpoints/sites.ts:65`
- **Docs:** `docs/content/docs/api/organizations/sites.mdx`


### [LOW] Docs promise assigning an invitee to 'one or more teams', but the dashboard invite dialog only supports a single team

- **Kind:** docs-mismatch
- **Expected:** inviting-users.mdx line 45: 'you can assign the new member to one or more teams during the invitation'; teams.mdx line 63: 'you can optionally assign them to one or more teams'. Both describe the Settings > Organization invite workflow.
- **Actual:** The invite dialog stores exactly one team id — `const [selectedTeamId, setSelectedTeamId] = useState<string>("none")` (line 57) bound to a single-select <Select> (lines 208-220) whose helper text reads 'Optionally add this member to a team' — and sends `teamId: selectedTeamId` as a single string (line 68). There is no multi-team selection in the UI.
- **Code:** `client/src/app/settings/organization/components/InviteMemberDialog.tsx:57`, `client/src/app/settings/organization/components/InviteMemberDialog.tsx:68`, `client/src/app/settings/organization/components/InviteMemberDialog.tsx:208`
- **Docs:** `docs/content/docs/(docs)/inviting-users.mdx`, `docs/content/docs/(docs)/teams.mdx`


### [LOW] inviting-users.mdx claims 'each user can only be in one organization', but nothing enforces this and the product is built for multi-org membership

- **Kind:** docs-mismatch
- **Expected:** inviting-users.mdx line 69 (info callout): 'Currently, each user can only be in one organization.'
- **Actual:** No code restricts a user to one organization. addUserToOrganization.ts:78-84 only rejects duplicates within the same organization ('User is already a member of this organization') and happily adds a user who already belongs to other orgs; better-auth is configured with allowUserToCreateOrganization: true (auth.ts:46) with no membership cap; getMyOrganizations returns an array of all the caller's orgs (getMyOrganizations.ts:16-27); and the sibling API doc list.mdx's own response example shows one user (user_xyz789) as a member of two organizations simultaneously.
- **Code:** `server/src/api/user/addUserToOrganization.ts:78`, `server/src/api/user/getMyOrganizations.ts:16`, `server/src/lib/auth.ts:46`
- **Docs:** `docs/content/docs/(docs)/inviting-users.mdx`, `docs/content/docs/api/organizations/list.mdx`


### [LOW] organization-settings.mdx says only the owner can change the organization name, but the API lets org admins update it (better-auth default permissions, no override)

- **Kind:** docs-mismatch
- **Expected:** organization-settings.mdx line 16: 'Update your organization's display name. Only the organization owner can change this setting.'
- **Actual:** Rybbit passes no custom `ac`/`roles` to the organization() plugin (auth.ts:45-122 configures only allowUserToCreateOrganization, creatorRole, teams, organizationHooks, sendInvitationEmail, schema), so better-auth's defaults apply, and the default admin role includes organization:["update"] (statement.mjs:26-28). An org admin can therefore rename the organization via POST /api/auth/organization/update. Only the dashboard hides the rename card from admins (page.tsx:104 gates it on isOwner), which is cosmetic, not enforcement.
- **Code:** `server/src/lib/auth.ts:45`, `server/node_modules/better-auth/dist/plugins/organization/access/statement.mjs:26`, `client/src/app/settings/organization/page.tsx:104`
- **Docs:** `docs/content/docs/(docs)/organization-settings.mdx`


### [LOW] POST /organizations/:organizationId/members: docs say an org admin can assign any of admin/member/owner, but role=owner from an org admin returns an undocumented 403

- **Kind:** docs-mismatch
- **Expected:** add-member.mdx documents role as '"admin" | "member" | "owner"' with the only requirement being 'admin or owner role in the organization', and its error table lists 400, 401, 404 and 500 — no 403 and no owner-role restriction.
- **Actual:** addUserToOrganization.ts:65-67 rejects role=owner unless the caller is the org owner or a system admin: `if (role === "owner" && !isAdmin && callerMembership?.role !== "owner") return reply.status(403).send({ error: "Only an organization owner can assign the owner role" })`. An org admin following the docs and posting {role: "owner"} gets a 403 status the docs never mention.
- **Code:** `server/src/api/user/addUserToOrganization.ts:56`, `server/src/api/user/addUserToOrganization.ts:65`
- **Docs:** `docs/content/docs/api/organizations/add-member.mdx`


### [LOW] Client createTeam wrapper types the response as Team (members/sites object arrays), but the server returns members as user-id strings and siteIds with no sites field

- **Kind:** docs-mismatch
- **Expected:** create.mdx correctly documents the create-team response: `members` is 'Array of added user IDs' (string[]) and `siteIds` is number[]. A client typing the response should match that.
- **Actual:** client/src/api/admin/endpoints/teams.ts:48 declares `authedFetch<Team>(...)` where Team (lines 15-23) has `members: TeamMember[]` ({userId,userName,userEmail} objects) and `sites: TeamSite[]`. The server actually sends `members: memberUserIds || []` (string[]) and `siteIds: siteIds || []`, and never a `sites` key (createTeam.ts:117-125). Any code consuming the typed result (e.g. `result.members[0].userName` or `result.sites`) would compile but get undefined at runtime.
- **Code:** `client/src/api/admin/endpoints/teams.ts:48`, `client/src/api/admin/endpoints/teams.ts:21`, `server/src/api/teams/createTeam.ts:117`
- **Docs:** `docs/content/docs/api/teams/create.mdx`


### [LOW] PUT /organizations/:organizationId/teams/:teamId accepts an empty team name and blanks the team, unlike create which rejects it

- **Kind:** unexpected-behavior
- **Expected:** create.mdx/createTeam establish that a team name must be non-empty: createTeam.ts:29-31 returns 400 'Team name is required' for empty/whitespace names. update.mdx describes `name` as 'Updated team name'; a user would expect the same non-empty rule on update.
- **Actual:** updateTeam.ts:92-96 applies `if (name !== undefined) { updates.name = name.trim(); }` with no emptiness check, so PUT with {"name": ""} (or "   ") succeeds with {success:true} and persists an empty-string team name, which then renders as a blank team card/filter option in the teams UI and home-page team selector.
- **Code:** `server/src/api/teams/updateTeam.ts:92`, `server/src/api/teams/createTeam.ts:29`
- **Docs:** `docs/content/docs/api/teams/update.mdx`, `docs/content/docs/api/teams/create.mdx`


---

## overview (12)


### [HIGH] Multi-value not_equals / not_contains filters are tautologies (OR-joined negations) and silently match everything

- **Kind:** broken
- **Expected:** getting-started.mdx documents not_equals as 'Value must not match' and not_contains as 'Value must not contain the substring'. A filter {parameter:'country', type:'not_equals', value:['US','CA']} should exclude sessions from both US and CA (NOT IN semantics).
- **Actual:** For every negative filter type with more than one value, the per-value conditions are joined with OR: `(country != 'US' OR country != 'CA')`, which is true for every row (a value cannot equal both), so the filter is a no-op and unfiltered data is returned with HTTP 200. Same for not_contains: `(x NOT LIKE '%a%' OR x NOT LIKE '%b%')` only excludes rows containing BOTH substrings.
- **Code:** `server/src/api/analytics/utils/getFilterStatement.ts:346-358`, `server/src/api/analytics/utils/getFilterStatement.ts:161-170`, `server/src/api/analytics/utils/getFilterStatement.ts:289-301`, `server/src/api/analytics/lite/utils.ts:92-95`
- **Docs:** `docs/content/docs/api/getting-started.mdx`
- **Evidence:** getFilterStatement.ts line 351-356: `const valuesWithOperator = filter.value.map(value => ...)` then `return `(${valuesWithOperator.join(" OR ")})`` — this generic branch is reached for not_equals/not_contains on ordinary parameters (they are not session-level, not entry/exit, not user_id, not null-check/regex/numeric/starts/ends/lat/lon). filterTypeToOperator (lines 21-47) maps not_equals→`!=` and not_contains→`NOT LIKE`, and the values are OR-joined. The same OR-join exists in buildStringFilterCondition lines 162-167 (used by session-level filters like event_name/channel and entry_page/exit_page) and in the lite path lite/utils.ts line 95 `parts.join(" OR ")`. That this is a bug, not intended semantics, is shown by the codebase itself: the user_id special case (getFilterStatement.ts lines 289-300) joins not_equals conditions with AND (`conditions.join(" AND ")`). All overview endpoints (/overview, /overview/time-series, /metric, /page-titles, lite variants) route filters through these functions, so any API consumer or dashboard user applying a multi-value exclusion gets completely unfiltered numbers with no error.


### [MEDIUM] Lite overview endpoints ignore start_datetime/end_datetime and silently return all-time data for exact-time ranges

- **Kind:** broken
- **Expected:** The lite endpoints (/overview-lite, /overview-bucketed-lite, /metric-lite) are drop-in replacements for the standard endpoints in the LITE_DASHBOARD build; the client sends the exact same query params, including start_datetime/end_datetime when the user picks a date range with specific start/end times (client buildApiParams, utils.ts lines 74-87). The results should cover only that datetime window.
- **Actual:** getLiteTimeStatement (lite/utils.ts lines 110-155) only builds a WHERE clause for the date trio or past-minutes pair; start_datetime/end_datetime are not even destructured (line 114). With a datetime range, validateTimeStatementParams({date: undefined, pastMinutesRange: undefined}) hits the schema's .catch and the function returns "" (line 154), so the MV query runs with no time filter and returns all-time totals with HTTP 200. getOverviewBucketedLite's isAllTime check (lines 180-184) also omits the datetime params, so no fill clause is generated either.
- **Code:** `server/src/api/analytics/lite/utils.ts:110-155`, `server/src/api/analytics/lite/getOverviewLite.ts:38-70`, `server/src/api/analytics/lite/getOverviewBucketedLite.ts:180-185`, `client/src/api/utils.ts:74-87`, `client/src/api/analytics/endpoints/types.ts:54-62`, `client/src/app/[site]/main/components/MainSection/OverviewLite.tsx:130`


### [MEDIUM] Malformed or incomplete time parameters are silently swallowed and the query runs over ALL TIME instead of returning 400

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx: 'You must provide either: All three date parameters (start_date, end_date, time_zone), OR all three exact datetime parameters, OR both relative parameters' and error code 400 for 'Bad Request (invalid parameters)'. A request with a typo'd timezone, malformed date, or a date range missing time_zone should be rejected.
- **Actual:** timeStatementParamsSchema ends in .catch({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined}) (query-validation.ts:96-100), so any validation failure — invalid IANA timezone, date not matching YYYY-MM-DD, start_date without end_date, date pair without time_zone, past_minutes_start <= past_minutes_end — silently produces an empty time statement (utils.ts:89-90 returns ""), and /overview, /metric, /page-titles, /live-user-count-adjacent queries execute with no time bound, returning ALL-TIME aggregates with HTTP 200 that look like data for the requested window.
- **Code:** `server/src/api/analytics/utils/query-validation.ts:96-100`, `server/src/api/analytics/utils/utils.ts:36-44`, `server/src/api/analytics/utils/utils.ts:89-90`, `server/src/api/analytics/getOverview.ts:17`, `server/src/api/analytics/getMetric.ts:60`, `server/src/api/analytics/getPageTitles.ts:37`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] /overview/time-series returns 500 (unhandled ZodError) for invalid time params, invalid bucket, or datetime range without time_zone

- **Kind:** broken
- **Expected:** Docs promise 400 'Bad Request (invalid parameters)' with body {"error": "..."}. time_zone is documented as required with exact datetime ranges, and bucket must be one of the TimeBucket enum values.
- **Actual:** getQuery is invoked at getOverviewBucketed.ts:210 BEFORE the try block (line 225). Inside getQuery, getTimeStatementFill (line 112) calls validateTimeStatementFillParams, whose schemas .parse() and THROW (no .catch here): timeBucketSchema.parse(bucket) throws on e.g. bucket=foo (query-validation.ts:323), and filterParamsTimeStatementFillSchema throws on malformed dates, bad timezone, or start_datetime/end_datetime without time_zone (refine at lines 176-187 requires time_zone for the datetime trio). The ZodError propagates to Fastify's default handler → HTTP 500 with Fastify's {statusCode,error,message} shape, not the documented 400 {error}.
- **Code:** `server/src/api/analytics/getOverviewBucketed.ts:104-112`, `server/src/api/analytics/getOverviewBucketed.ts:210-225`, `server/src/api/analytics/query: server/src/api/analytics/utils/query-validation.ts:322-330`, `server/src/api/analytics/utils/query-validation.ts:176-187`, `server/src/api/analytics/utils/query-validation.ts:218-228`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/overview/time-series.mdx`


### [MEDIUM] GET /metric with missing or invalid `parameter` crashes to a 500 instead of the documented 400

- **Kind:** broken
- **Expected:** metric.mdx documents `parameter` as required with type FilterParameter; getting-started.mdx documents 400 for invalid parameters with body {"error": "..."}.
- **Actual:** Omitting `parameter` throws TypeError: Cannot read properties of undefined (reading 'startsWith') and an unknown value (e.g. parameter=foobar) throws a ZodError; both are thrown while building the query BEFORE the handler's try/catch, so Fastify returns a generic 500 Internal Server Error instead of a 400.
- **Code:** `server/src/api/analytics/getMetric.ts:421-430`, `server/src/api/analytics/getMetric.ts:355`, `server/src/api/analytics/utils/getFilterStatement.ts:57-58`, `server/src/api/analytics/utils/getFilterStatement.ts:102`
- **Docs:** `docs/content/docs/api/overview/metric.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Time-series `time` values are SQL-format wall-clock strings in the requested timezone, not the documented ISO 8601 UTC datetimes

- **Kind:** docs-mismatch
- **Expected:** time-series.mdx documents `time` as 'ISO 8601 datetime' and the response example shows "time": "2024-01-01T00:00:00.000Z" — i.e. UTC instants with a Z suffix.
- **Actual:** The SELECT computes `toDateTime(toStartOfDay(toTimeZone(timestamp, <time_zone>)))`, so ClickHouse JSONEachRow serializes DateTime as "2024-01-01 00:00:00" — space-separated, no zone designator — and the wall-clock value is in the REQUESTED time_zone, not UTC. An API consumer who parses it per the docs (as UTC ISO) gets timestamps shifted by the timezone offset and most strict ISO parsers reject the string outright.
- **Code:** `server/src/api/analytics/getOverviewBucketed.ts:159`, `server/src/api/analytics/getOverviewBucketed.ts:170`, `client/src/app/[site]/main/components/MainSection/Chart.tsx:57`
- **Docs:** `docs/content/docs/api/overview/time-series.mdx`


### [LOW] /metric?parameter=event_name returns event occurrences as `count`, not the documented session count, making count and percentage mutually inconsistent

- **Kind:** docs-mismatch
- **Expected:** metric.mdx documents MetricItem.count as 'Number of sessions for this value' and percentage as 'Percentage of total sessions'.
- **Actual:** For parameter=event_name, count is `COUNT(*)` (total event rows, so a session firing an event 50 times contributes 50) while percentage is computed from `COUNT(distinct(session_id))`. The two fields use different units: percentage is session-share as documented but count is occurrences, so count/sum(counts)*100 does not equal percentage and count does not match the documented definition.
- **Code:** `server/src/api/analytics/getMetric.ts:97-113`
- **Docs:** `docs/content/docs/api/overview/metric.mdx`


### [LOW] Auth failures return 403 where the docs promise 401 (missing/invalid API key) and 404 (nonexistent site)

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx: '401 - Unauthorized (missing or invalid API key)', '403 - Forbidden (no access to site)', '404 - Not Found (site doesn't exist)'.
- **Actual:** All overview endpoints use the publicSite chain (index.ts:274-286 → resolveSiteId + allowPublicSiteAccess). allowPublicSiteAccess returns 403 {error:'Forbidden'} for BOTH a missing/invalid API key and a nonexistent numeric site id; 404 is only produced for string identifiers longer than 4 characters (resolveSiteId, auth-middleware.ts:41-44). A request with no credentials to a private site gets 403, not 401; a request to numeric site 999 that doesn't exist gets 403, not 404.
- **Code:** `server/src/lib/auth-middleware.ts:153-177`, `server/src/lib/auth-middleware.ts:37-48`, `server/src/lib/auth-utils.ts:357-383`, `server/src/index.ts:274-286`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] /metric with the documented lat/lon parameters builds SQL comparing Float64 to '' and fails with a 500

- **Kind:** broken
- **Expected:** metric.mdx types `parameter` as FilterParameter, and getting-started.mdx's FilterParameter table includes lat and lon; a breakdown request for them should either work or be rejected with 400.
- **Actual:** The generic branch emits `AND lat IS NOT NULL AND lat <> ''` (getMetric.ts:400-401 via `${sqlParam} <> ''`). lat/lon are non-nullable Float64 columns (clickhouse.ts:64-65); ClickHouse comparison of a Float64 column with the string literal '' attempts to convert '' to Float64 and raises an exception, so the query fails and the handler's catch returns 500 {error:'Failed to fetch lat'} for a parameter value the docs list as valid.
- **Code:** `server/src/api/analytics/getMetric.ts:398-404`, `server/src/api/analytics/getMetric.ts:369-372`, `server/src/db/clickhouse/clickhouse.ts:64-65`, `server/src/api/analytics/utils/query-validation.ts:283-284`
- **Docs:** `docs/content/docs/api/overview/metric.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] past-minutes time-series fill grid is computed in server/UTC time while data buckets are truncated in the requested timezone, mis-aligning buckets

- **Kind:** unexpected-behavior
- **Expected:** One row per bucket between the range bounds, with `time` values on a single consistent grid (time-series.mdx describes bucketed rows and a bucket table including day used with relative ranges).
- **Actual:** In past-minutes mode the WITH FILL FROM/TO bounds are `toStartOfX(toDateTime('<UTC iso>'))` — truncated in the server's default timezone (UTC) with no tz argument (getOverviewBucketed.ts:69-70) — while the actual data rows are truncated in the requested time_zone (`toStartOfX(toTimeZone(ts, tz))`, lines 159/170). Whenever those truncations land on different instants — bucket=day with any non-UTC time_zone (offset hours), or bucket=hour with half-hour-offset zones like Asia/Kolkata — the fill generates zero-rows on a grid interleaved with the real rows, so the series contains duplicate/extra buckets (e.g. a real day bucket at local midnight plus a zero day bucket at UTC midnight).
- **Code:** `server/src/api/analytics/getOverviewBucketed.ts:68-87`, `server/src/api/analytics/getOverviewBucketed.ts:159`, `server/src/api/analytics/getOverviewBucketed.ts:170`
- **Docs:** `docs/content/docs/api/overview/time-series.mdx`


### [LOW] With filters applied, /overview's pages_per_session, bounce_rate and session_duration are computed from a different event set than sessions/pageviews, contradicting the documented formulas

- **Kind:** unexpected-behavior
- **Expected:** definitions.mdx: Pages Per Session is 'Calculated by dividing the total number of pageviews by the total number of sessions'; Session Duration is 'the average length of time users spend on your site during a session'. A consumer combining the returned fields expects pages_per_session ≈ pageviews / sessions.
- **Actual:** Under a filter (e.g. pathname contains /blog): `pageviews` sums only filter-matching pageview events (FilteredSessionsWithStats.filtered_pageviews) while `pages_per_session` and `bounce_rate` are computed from AllSessionPageviews.total_pageviews_in_session — ALL pageviews of the matched sessions, unfiltered (lines 22-31, 48-49). `session_duration` = AVG(MAX-MIN timestamp of only the MATCHING events) (lines 36-37, 50), i.e. time between first and last matching event, not the session's duration. So the returned trio is internally inconsistent: pages_per_session ≠ pageviews/sessions, and session_duration is neither the full-session length nor derivable from the other fields.
- **Code:** `server/src/api/analytics/getOverview.ts:20-54`
- **Docs:** `docs/content/docs/(docs)/definitions.mdx`, `docs/content/docs/api/overview/overview.mdx`


### [LOW] Lite endpoints are registered unconditionally but their backing tables only exist when the server env LITE_DASHBOARD=true, and the client toggle is a separate env var

- **Kind:** unexpected-behavior
- **Expected:** Endpoints exposed by the route table should respond successfully on a default deployment, and the client's lite dashboard should only be enabled when the server can serve it.
- **Actual:** GET /sites/:siteId/overview-lite, /overview-bucketed-lite and /metric-lite are always registered (index.ts:277-279), but sessions_mv_target / session_hourly_mv_target / overview_hourly_mv_target / *_hourly_mv_target are only created inside `if (LITE_DASHBOARD) initializeLiteDashboardMVs()` (clickhouse.ts:286-288). On a deployment without server LITE_DASHBOARD=true, every lite call fails in ClickHouse (UNKNOWN_TABLE) and returns 500 {error:'Failed to fetch overview'}. Because the client gate is a different variable (NEXT_PUBLIC_LITE_DASHBOARD, client/src/lib/const.ts:10) than the server's (LITE_DASHBOARD, server/src/lib/const.ts:9), setting only the client flag renders the entire lite dashboard from endpoints that all 500.
- **Code:** `server/src/index.ts:277-279`, `server/src/db/clickhouse/clickhouse.ts:286-288`, `server/src/lib/const.ts:9`, `client/src/lib/const.ts:10`


---

## performance (9)


### [HIGH] Fresh installs create the events table without lcp/cls/inp/fcp/ttfb columns, so all three performance endpoints 500 and web-vitals ingestion fails

- **Kind:** broken
- **Expected:** Per the performance docs, enabling Web Vitals in site settings makes the Performance tab and the three /performance/* API endpoints return Core Web Vitals percentiles. The schema bootstrap should create the columns those queries and inserts use.
- **Actual:** The only ClickHouse schema bootstrap (initializeClickhouse in server/src/db/clickhouse/clickhouse.ts) creates the events table WITHOUT lcp, cls, inp, fcp, ttfb (and without ip, timezone, tag, import_id, identified_user_id). The only ALTER on events adds feature_flags (lines 79-85). No other DDL in the repo adds these columns and no SQL file is mounted into the ClickHouse container (docker-compose.yml mounts only config XMLs). On a new deployment, quantile(0.5)(lcp) etc. reference nonexistent columns (UNKNOWN_IDENTIFIER) so all three handlers hit their catch blocks and return 500, and pageviewQueue inserts rows containing lcp/cls/inp/fcp/ttfb keys into a table without those columns.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:44-77`, `server/src/db/clickhouse/clickhouse.ts:79-85`, `server/src/api/analytics/performance/getPerformanceOverview.ts:12-39`, `server/src/api/analytics/performance/getPerformanceTimeSeries.ts:102-132`, `server/src/api/analytics/performance/getPerformanceByDimension.ts:123-163`, `server/src/services/tracker/pageviewQueue.ts:103-107`
- **Docs:** `docs/content/docs/api/performance/overview.mdx`, `docs/content/docs/api/performance/time-series.mdx`, `docs/content/docs/api/performance/by-dimension.mdx`, `docs/content/docs/(docs)/feature-guides/performance.mdx`
- **Evidence:** CREATE TABLE IF NOT EXISTS events (clickhouse.ts:44-76) lists columns ending at event_name/props — no web-vitals columns. grep for 'lcp' across server/src/db returns nothing; grep for 'ADD COLUMN' shows only feature_flags (events), and session_replay_* alterations. git commit b5ad50a4 ('Refactor Clickhouse initialization by removing the ensureEventsColumns function', 2026-05-19) deleted EVENTS_COLUMNS_TO_ENSURE = [lcp Nullable(Float64), cls, inp, fcp, ttfb, ip, timezone, identified_user_id, import_id, tag] and the ensureEventsColumns() call WITHOUT folding those columns into the CREATE TABLE statement. Existing deployments keep the columns (added by older releases), but any fresh install gets a table where getPerformanceOverview.ts:13 'quantile(0.5)(lcp) AS lcp_p50' fails, and pageviewQueue.ts:103-107 inserts unknown fields (no input_format_skip_unknown_fields is set anywhere — grep confirms), so performance tracking is broken end-to-end.


### [HIGH] CLS measurements of exactly 0 are coerced to NULL at ingestion (pv.cls || null), systematically inflating all reported CLS percentiles

- **Kind:** broken
- **Expected:** Feature guide: CLS 'Good' is under 0.1 and the dashboard 'tracks Core Web Vitals from real user data'; overview docs promise 'aggregate performance metrics with percentile breakdowns'. A page load with zero layout shift (CLS = 0, the best possible and very common score) must be included in the percentile distribution.
- **Actual:** pageviewQueue.ts:104 stores the metric with `cls: pv.cls || null`, so a reported CLS of 0 (falsy) is written as NULL. ClickHouse quantile()/quantileIf() skip NULLs, so every zero-CLS page load is excluded from cls_p50/p75/p90/p99 in overview, time-series, and by-dimension. A site where 90% of loads have CLS 0 and 10% have CLS 0.3 reports cls_p50 = 0.3 instead of 0.
- **Code:** `server/src/services/tracker/pageviewQueue.ts:104`, `server/src/services/tracker/pageviewQueue.ts:103-107`, `server/src/analytics-script/webVitals.ts:50-61`, `server/src/analytics-script/tracking.ts:287-301`, `server/src/services/tracker/trackEvent.ts:83-87`, `server/src/api/analytics/performance/getPerformanceOverview.ts:17-20`
- **Docs:** `docs/content/docs/(docs)/feature-guides/performance.mdx`, `docs/content/docs/api/performance/overview.mdx`
- **Evidence:** Full chain: web-vitals v5 (server/package.json:73) reports CLS 0 on visibility-hidden; WebVitalsCollector.collectMetric (webVitals.ts:50-61) stores 0 (its all-collected check `value !== null` treats 0 as collected); trackWebVitals (tracking.ts:287-301) spreads `...vitals` into the payload so cls: 0 is sent; trackEvent zod schema `cls: z.number().min(0).nullable().optional()` (trackEvent.ts:84) accepts 0; trackEvent.ts:425 spreads payload into pageviewQueue; pageviewQueue.ts:104 `cls: pv.cls || null` converts 0 → null before the ClickHouse insert. The same `|| null` coercion applies to lcp/inp/fcp/ttfb (lines 103-107), but CLS is the only vital where 0 is a common legitimate value.


### [MEDIUM] Performance time-series 500s whenever time_zone is omitted — including the documented relative-time mode (past_minutes_start/past_minutes_end) — because the SELECT builds toTimeZone(timestamp, NULL)

- **Kind:** broken
- **Expected:** getting-started.mdx (Common Parameters) states time_zone is 'Required with date and exact datetime ranges' only, and documents the relative mode as valid with just the two parameters: '?past_minutes_start=60&past_minutes_end=0'. The time-series doc says the endpoint accepts all common parameters plus bucket.
- **Actual:** getQuery destructures time_zone with no default (line 88) and line 104 always emits `toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, ${SqlString.escape(time_zone)}))) AS time`. SqlString.escape(undefined) yields the literal NULL, producing `toTimeZone(timestamp, NULL)`. ClickHouse requires the timezone argument to be a constant String, so the query fails and the catch at lines 163-166 returns 500 'Failed to fetch performance time series'. Every documented relative-time request without time_zone (e.g. ?bucket=hour&past_minutes_start=60&past_minutes_end=0), and any all-time request without time_zone, gets a 500.
- **Code:** `server/src/api/analytics/performance/getPerformanceTimeSeries.ts:104`, `server/src/api/analytics/performance/getPerformanceTimeSeries.ts:84-95`, `server/src/api/analytics/performance/getPerformanceTimeSeries.ts:163-166`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/performance/time-series.mdx`


### [MEDIUM] Invalid query parameters (malformed filters JSON, invalid bucket, invalid/missing dimension) return 500 instead of the documented 400 — for overview and time-series as uncaught exceptions escaping the handler

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx Error Responses section: '400 - Bad Request (invalid parameters)' with body { "error": "..." }. by-dimension.mdx documents dimension as a required enum; time-series.mdx documents bucket as a required enum.
- **Actual:** (a) Overview and time-series call getQuery() OUTSIDE their try blocks (getPerformanceOverview.ts:52, try at 54; getPerformanceTimeSeries.ts:150, try at 152). Malformed ?filters= JSON throws Error('Invalid JSON format') from validateFilters (query-validation.ts:343); an invalid bucket (e.g. bucket=garbage with a valid date range) throws a ZodError from timeBucketSchema.parse (query-validation.ts:323). Both escape the handler and hit Fastify's default error handler, returning HTTP 500 with Fastify's {statusCode:500,error:'Internal Server Error',message:...} shape — not the documented 400 or documented error body. (b) by-dimension throws 'Invalid dimension' inside its try (getPerformanceByDimension.ts:63-65) for a missing or non-whitelisted dimension and the catch (lines 245-252) converts it to 500 'Failed to fetch performance by dimension' — again not 400.
- **Code:** `server/src/api/analytics/performance/getPerformanceOverview.ts:52`, `server/src/api/analytics/performance/getPerformanceTimeSeries.ts:150`, `server/src/api/analytics/performance/getPerformanceByDimension.ts:63-65`, `server/src/api/analytics/performance/getPerformanceByDimension.ts:245-252`, `server/src/api/analytics/utils/query-validation.ts:322-330`, `server/src/api/analytics/utils/query-validation.ts:337-348`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/performance/by-dimension.mdx`, `docs/content/docs/api/performance/time-series.mdx`


### [MEDIUM] Invalid or incomplete date parameters are silently dropped on overview and by-dimension, returning all-time data with HTTP 200 instead of an error

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx: 'You must provide either: All three date parameters (start_date, end_date, time_zone), OR all three exact datetime parameters, OR both relative parameters', and '400 - Bad Request (invalid parameters)'. A request with an invalid date (e.g. start_date=2024-13-45) or missing time_zone should be rejected.
- **Actual:** timeStatementParamsSchema ends with .catch({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined}) (query-validation.ts:96-100), so ANY validation failure (invalid date value, start after end, invalid timezone) is swallowed. Additionally getTimeStatement pre-filters: `start_date && end_date && time_zone ? {...} : undefined` (utils.ts:36), so omitting time_zone discards the dates before validation. In both cases getTimeStatement returns '' (utils.ts:89-90) and the WHERE clause has no timestamp constraint — the overview and by-dimension endpoints return aggregates over the site's entire history with HTTP 200, which the caller cannot distinguish from a correct answer for their requested window. (Time-series instead throws — see the 500-vs-400 finding — making the three endpoints mutually inconsistent for the same bad input.)
- **Code:** `server/src/api/analytics/utils/query-validation.ts:95-100`, `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:89-90`, `server/src/api/analytics/performance/getPerformanceOverview.ts:9`, `server/src/api/analytics/performance/getPerformanceByDimension.ts:67`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Time-series 'time' field is returned as ClickHouse SQL format in local wall-clock time, not the documented ISO 8601 UTC datetime

- **Kind:** docs-mismatch
- **Expected:** time-series.mdx documents time as 'ISO 8601 datetime' and the example response shows "time": "2024-01-01T00:00:00.000Z" (UTC, T separator, milliseconds, Z suffix).
- **Actual:** The SELECT (getPerformanceTimeSeries.ts:104) produces a DateTime in the requested time_zone; ClickHouse JSONEachRow serializes it as 'YYYY-MM-DD HH:MM:SS' (e.g. '2024-01-01 00:00:00'), and the value is the bucket start in the requested timezone's local wall-clock, not UTC. processResults leaves it untouched because '2024-01-01 00:00:00' is not numeric (utils.ts:98-110). API consumers parsing the documented ISO format get parse failures or, worse, silently misinterpreted timestamps for non-UTC time_zone values.
- **Code:** `server/src/api/analytics/performance/getPerformanceTimeSeries.ts:104`, `server/src/api/analytics/utils/utils.ts:93-115`, `client/src/app/[site]/performance/components/PerformanceChart.tsx:113`
- **Docs:** `docs/content/docs/api/performance/time-series.mdx`


### [LOW] Documented p95 percentile is not implemented anywhere — API computes only p50/p75/p90/p99 and the dashboard offers no p95 option

- **Kind:** docs-mismatch
- **Expected:** feature-guides/performance.mdx line 48: 'Choose which percentile to view (p50, p75, p90, p95, p99).'
- **Actual:** The overview/time-series/by-dimension SQL computes quantile(0.5)/(0.75)/(0.9)/(0.99) only — no quantile(0.95) anywhere in server/src/api/analytics/performance. The client percentile type is `"p50" | "p75" | "p90" | "p99"` (performanceStore.ts:5), the PercentileSelector renders exactly those four chips, and PerformanceChart's PERCENTILES constant is ["P50","P75","P90","P99"]. p95 cannot be selected or retrieved.
- **Code:** `server/src/api/analytics/performance/getPerformanceOverview.ts:13-32`, `server/src/api/analytics/performance/getPerformanceByDimension.ts:128-152`, `client/src/app/[site]/performance/performanceStore.ts:5`, `client/src/app/[site]/performance/components/PercentileSelector.tsx:10-15`, `client/src/app/[site]/performance/components/PerformanceChart.tsx:25`
- **Docs:** `docs/content/docs/(docs)/feature-guides/performance.mdx`


### [LOW] /api/metrics.js is a dead endpoint: docs say the main script loads it dynamically when Web Vitals is enabled, but the tracker bundles web-vitals inline and never requests it

- **Kind:** docs-mismatch
- **Expected:** proxy-guide/get-started.mdx line 61: 'The session replay and metrics scripts (/api/replay.js and /api/metrics.js) are loaded dynamically by the main script when those features are enabled in your site settings', and line 49 lists /api/metrics.js as the 'Web Vitals metrics script' users should proxy.
- **Actual:** The tracker source imports web-vitals statically (`import { onLCP, onCLS, onINP, onFCP, onTTFB } from "web-vitals"` — webVitals.ts:1) and initializes the collector in-process (index.ts:91-95). The built server/public/script.js contains the web-vitals implementation inline (it includes 'largest-contentful-paint') and has zero references to 'metrics.js' (unlike replay.js, which it does load dynamically). /api/metrics.js (index.ts:267, serving web-vitals.iife.js) is never fetched by any tracker; users who set up the documented proxy rewrite for it are proxying a route nothing calls, and the docs mislead about how Web Vitals collection works.
- **Code:** `server/src/index.ts:267`, `server/src/analytics-script/webVitals.ts:1`, `server/src/analytics-script/index.ts:91-95`, `server/public/script.js:1`
- **Docs:** `docs/content/docs/(docs)/proxy-guide/get-started.mdx`


### [LOW] Client/server contract drift on the overview endpoint: client declares a {current, previous} response type the server never returns, and sends a percentile param no server code reads

- **Kind:** unexpected-behavior
- **Expected:** The client's declared response type should match the server contract: the server returns { data: { lcp_p50 ... ttfb_p99, total_performance_events } } (getPerformanceOverview.ts:64, PerformanceOverviewMetrics in types.ts:7-11), and query params sent should be ones the server implements.
- **Actual:** GetPerformanceOverviewResponse is declared as { current: {lcp,cls,inp,fcp,ttfb}; previous: {...} } (performance.ts:6-21) — fields the server never returns; fetchPerformanceOverview casts the flat percentile object to it. The UI only works because PerformanceOverview.tsx:110 reads through `(data: any)` with computed keys `${metric}_${selectedPercentile}`, defeating type checking on this path. Separately, fetchPerformanceOverview and fetchPerformanceByDimension send `percentile: params.percentile` (performance.ts:111, 156) — grep confirms no handler in server/src/api/analytics/performance reads a percentile query param; the server always returns all percentiles, so the param is dead weight and the type is misleading for any future consumer of these endpoint functions.
- **Code:** `client/src/api/analytics/endpoints/performance.ts:6-21`, `client/src/api/analytics/endpoints/performance.ts:109-112`, `client/src/api/analytics/endpoints/performance.ts:149-157`, `client/src/app/[site]/performance/components/PerformanceOverview.tsx:110-113`, `server/src/api/analytics/performance/getPerformanceOverview.ts:64`, `server/src/api/analytics/types.ts:7-11`


---

## public-api-auth (11)


### [HIGH] Missing or invalid time parameters are silently swallowed and endpoints return all-time data with HTTP 200 instead of a 400 error

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx states 'All endpoints require date-based, exact datetime, or relative time parameters' and 'You must provide either: All three date parameters (start_date, end_date, time_zone), OR ...'. The error table promises '400 - Bad Request (invalid parameters)'. A request with missing time_zone, a malformed date, an invalid IANA timezone, or swapped past_minutes values should return 400.
- **Actual:** timeStatementParamsSchema ends with .catch({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined}) (query-validation.ts:96-100), so any Zod validation failure is converted into 'no time parameters'. getTimeStatement then returns "" (utils.ts:89-90), the WHERE clause has no time bound, and the endpoint returns HTTP 200 with statistics computed over the site's entire history.
- **Code:** `server/src/api/analytics/utils/query-validation.ts:96`, `server/src/api/analytics/utils/utils.ts:36`, `server/src/api/analytics/utils/utils.ts:40`, `server/src/api/analytics/utils/utils.ts:89`, `server/src/api/analytics/getOverview.ts:77`
- **Docs:** `docs/content/docs/api/getting-started.mdx`
- **Evidence:** Trace for GET /api/sites/:siteId/overview?start_date=2024-01-01&end_date=2024-01-31 (time_zone omitted, exactly the docs' 'date-based query' minus one required param): getOverview.ts:77 calls getQuery -> getTimeStatement (utils.ts:15). At utils.ts:36, `date` is only built when start_date && end_date && time_zone, so date=undefined; dateTimeRange and pastMinutesRange are also undefined. validateTimeStatementParams parses {date:undefined,dateTimeRange:undefined,pastMinutesRange:undefined}; the .refine at query-validation.ts:92 ('Either date, dateTimeRange, or pastMinutesRange must be provided') fails, but the .catch at query-validation.ts:96-100 swallows the failure and returns all-undefined. getTimeStatement falls through every branch and returns "" at utils.ts:90. The ClickHouse query at getOverview.ts:20-54 runs with only `site_id = {siteId}` and returns all-time numbers with 200. The same happens for invalid time_zone strings (refine at query-validation.ts:41-52 fails -> caught), malformed dates like start_date=2024-13-45 (regex passes, Date.parse NaN -> refine fails -> caught), and past_minutes_start <= past_minutes_end (refine at query-validation.ts:88 fails -> caught). Every non-bucketed analytics endpoint using getTimeStatement (getOverview, getSessions, getEvents, getMetric, etc.) inherits this: a typo silently changes the query period to all-time instead of erroring.


### [HIGH] GET /sites/:siteId/overview/time-series 500s in the documented relative-time mode (past_minutes_* without time_zone) because the SQL becomes toTimeZone(timestamp, NULL)

- **Kind:** broken
- **Expected:** getting-started.mdx says the relative mode needs only 'Both relative parameters (past_minutes_start, past_minutes_end)' and documents time_zone as 'Required with date and exact datetime ranges' (i.e. not for relative mode); its example is `?past_minutes_start=60&past_minutes_end=0`. time-series.mdx says the endpoint 'Accepts all Common Parameters'. So `GET /api/sites/123/overview/time-series?bucket=hour&past_minutes_start=60&past_minutes_end=0` should return bucketed data.
- **Actual:** getOverviewBucketed.ts:113 computes `const tzEscaped = SqlString.escape(time_zone)` with no default. SqlString.escape(undefined) returns the literal string `NULL` (verified with node against the installed sqlstring). The generated SELECT contains `toDateTime(toStartOfHour(toTimeZone(start_time, NULL)))` (line 159) and `toTimeZone(timestamp, NULL)` (line 170). ClickHouse's toTimeZone requires a constant String timezone argument, so the query fails and the handler's catch (getOverviewBucketed.ts:236-239) returns HTTP 500 {"error":"Failed to fetch pageviews"}.
- **Code:** `server/src/api/analytics/getOverviewBucketed.ts:113`, `server/src/api/analytics/getOverviewBucketed.ts:159`, `server/src/api/analytics/getOverviewBucketed.ts:170`, `server/src/api/analytics/lite/getOverviewBucketedLite.ts:178`, `server/src/api/analytics/getErrorBucketed.ts:97`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/overview/time-series.mdx`
- **Evidence:** Full trace: route index.ts:276 `fastify.get("/sites/:siteId/overview/time-series", publicSite, getOverviewBucketed)`. With only past_minutes params, validateTimeStatementFillParams passes (hasPastMinutesParams true, query-validation.ts:180), the fill clause is built without a timezone (getOverviewBucketed.ts:56-88), but the main query interpolates tzEscaped='NULL' at lines 159 and 170. Contrast with sibling endpoints that guard against this: lite/getOverviewBucketedLite.ts:178 uses `SqlString.escape(req.query.time_zone || "UTC")`, getErrorBucketed.ts:97 uses `req.query.time_zone || "UTC"`, and bots/getBotTimeSeries.ts:34 uses `SqlString.escape(time_zone || "UTC")` — only getOverviewBucketed omits the default. The dashboard client never hits this because toQueryParams (client/src/api/analytics/endpoints/types.ts:64-71) always sends time_zone even in past-minutes mode, so only external API consumers following the documented contract are affected. (Could not execute against a live ClickHouse — not running locally — but toTimeZone(x, NULL) is an illegal-argument error in ClickHouse; at minimum the emitted SQL contradicts the documented relative-mode contract.)


### [MEDIUM] not_equals / not_contains filters with multiple values are OR-joined into a tautology, silently excluding nothing

- **Kind:** broken
- **Expected:** getting-started.mdx documents not_equals as 'Exclude exact matches — Value must not match' and not_contains as 'Value must not contain the substring'. A filter {"parameter":"browser","type":"not_equals","value":["Chrome","Firefox"]} should exclude both browsers.
- **Actual:** getFilterStatement.ts:351-356 maps each value to `expression != value` and joins with " OR " regardless of filter type, producing `(browser != 'Chrome' OR browser != 'Firefox')`, which is true for every row (any browser differs from at least one of the two). The filter is a no-op and the endpoint returns unfiltered data with 200. Same for not_contains: `(x NOT LIKE '%a%' OR x NOT LIKE '%b%')`.
- **Code:** `server/src/api/analytics/utils/getFilterStatement.ts:351`, `server/src/api/analytics/utils/getFilterStatement.ts:356`, `server/src/api/analytics/utils/getFilterStatement.ts:289`, `server/src/api/analytics/utils/getFilterStatement.test.ts:145`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] Invalid `filters` parameter (bad JSON, unknown parameter/type, invalid regex) and invalid bucketed time params return HTTP 500 with a non-documented body instead of 400 { error }

- **Kind:** broken
- **Expected:** getting-started.mdx: '400 - Bad Request (invalid parameters)' and 'Error Response Format: { "error": "Error message describing what went wrong" }'. Sending filters=not-json, an unknown filter parameter, an empty regex, or a datetime range without time_zone on a bucketed endpoint should yield 400 with {error: ...}.
- **Actual:** In getOverview.ts the query is built at lines 77-89, outside the try/catch that starts at line 91. getFilterStatement -> validateFilters (getFilterStatement.ts:116, query-validation.ts:337-348) throws Error('Invalid JSON format') or a ZodError; getFilterStatement also throws for empty/too-long/JS-invalid regex (lines 143-155). The throw escapes the handler, and since no fastify setErrorHandler is registered anywhere in server/src, Fastify's default handler returns HTTP 500 with body {"statusCode":500,"error":"Internal Server Error","message":"..."} — wrong status and a shape whose `error` field is 'Internal Server Error', not the message the docs promise. Same pattern in getOverviewBucketed.ts (getQuery at 210-223 outside try at 225; validateTimeStatementFillParams throws ZodError for datetime-without-time_zone or an invalid bucket value) and getSessions.ts (getFilterStatement at line 102, try begins at line 179).
- **Code:** `server/src/api/analytics/getOverview.ts:77`, `server/src/api/analytics/getOverview.ts:91`, `server/src/api/analytics/getOverviewBucketed.ts:210`, `server/src/api/analytics/utils/getFilterStatement.ts:116`, `server/src/api/analytics/utils/query-validation.ts:337`, `server/src/api/analytics/sessions/getSessions.ts:102`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] API-key responses contain `referenceId`, but create/list/update docs promise a `userId` field

- **Kind:** docs-mismatch
- **Expected:** create.mdx (response table lines 66-69 and example line 266), list.mdx (ApiKey object lines 98-100, example line 276) and update.mdx (lines 79-81, example line 282) all document a `userId: string` field ('The ID of the user that owns the key') on the returned API key object.
- **Actual:** The installed @better-auth/api-key 1.5.5 model names the owner field `referenceId` (ApiKey type at types-CCe5L05Y.d.mts:485 `referenceId: string`; no userId field). POST /api/user/api-keys returns auth.api.createApiKey's result verbatim (createApiKey.ts:59-70), which spreads the DB record — the Postgres apikey table column is `referenceId` (schema.ts:296). The list endpoint returns `{...rest}` of the same record, and update likewise. Consumers reading `userId` per the docs get undefined.
- **Code:** `server/src/api/user/createApiKey.ts:59`, `server/src/api/user/createApiKey.ts:70`, `server/src/db/postgres/schema.ts:296`, `server/src/lib/auth-utils.ts:275`, `server/node_modules/@better-auth/api-key/dist/types-CCe5L05Y.d.mts:485`
- **Docs:** `docs/content/docs/api/api-keys/create.mdx`, `docs/content/docs/api/api-keys/list.mdx`, `docs/content/docs/api/api-keys/update.mdx`


### [MEDIUM] Documented `rateLimitEnabled` body field on POST /api/auth/api-key/update is rejected as a server-only property (400) for every HTTP caller

- **Kind:** docs-mismatch
- **Expected:** update.mdx request-body table (lines 49-53) documents `rateLimitEnabled: boolean, optional — 'Enable or disable rate limiting on the key'`, implying a session-authenticated POST /api/auth/api-key/update with {keyId, rateLimitEnabled: false} succeeds and returns the updated key.
- **Actual:** The route is served directly by better-auth (index.ts:247 forwards all /api/auth/* to the auth handler). In the plugin's update endpoint, `authRequired = ctx.request || ctx.headers` is always truthy for HTTP requests, and dist/index.mjs:1490-1491 throws BAD_REQUEST SERVER_ONLY_PROPERTY whenever rateLimitEnabled (or rateLimitMax/rateLimitTimeWindow/remaining/refill*/permissions) is present in the body. Every request following the docs gets HTTP 400 'Cannot update server-only property', and no code path in the Rybbit server exposes an alternative way to toggle a key's rate limiting.
- **Code:** `server/src/index.ts:247`, `server/node_modules/@better-auth/api-key/dist/index.mjs:1490`, `server/node_modules/@better-auth/api-key/dist/index.mjs:1491`
- **Docs:** `docs/content/docs/api/api-keys/update.mdx`


### [MEDIUM] POST /api/user/api-keys returns HTTP 500 for invalid input (e.g. expiresIn under 1 day or over 365 days) — undocumented bounds surfaced with the wrong status code

- **Kind:** unexpected-behavior
- **Expected:** create.mdx documents expiresIn as 'Seconds until the key expires. Omit for a key that never expires.' with no range restriction, and getting-started.mdx's error table maps invalid parameters to 400. So {"name":"ci","expiresIn":3600} should either create a key expiring in an hour or return 400.
- **Actual:** The plugin enforces keyExpiration bounds minExpiresIn=1 day and maxExpiresIn=365 days (dist/index.mjs:2117-2118 defaults; create route checks expiresIn/86400 against them at ~line 784-792 and throws APIError BAD_REQUEST EXPIRES_IN_IS_TOO_SMALL/TOO_LARGE). Rybbit's handler wraps the call in a blanket catch that maps every error — including these validation errors — to HTTP 500 (createApiKey.ts:71-73 `return reply.status(500).send({ error: error.message || "Failed to create API key" })`). So expiresIn=3600 (1 hour) yields 500 with a validation message, and the 1–365-day window is documented nowhere.
- **Code:** `server/src/api/user/createApiKey.ts:58`, `server/src/api/user/createApiKey.ts:71`, `server/node_modules/@better-auth/api-key/dist/index.mjs:2117`, `server/node_modules/@better-auth/api-key/dist/index.mjs:2118`
- **Docs:** `docs/content/docs/api/api-keys/create.mdx`, `docs/content/docs/api/getting-started.mdx`


### [LOW] lat/lon filters with type not_equals (or contains) behave as equals-with-tolerance — the filter selects exactly the rows it should exclude

- **Kind:** broken
- **Expected:** getting-started.mdx documents not_equals generically as 'Exclude exact matches' and lat/lon as 'Supports greater_than, less_than, equals (with 0.001 tolerance)'. A user sending {"parameter":"lat","type":"not_equals","value":["37.0"]} would expect either rows outside 37.0±0.001 or a validation error.
- **Actual:** The lat/lon special-case block (getFilterStatement.ts:331-344) never inspects filter.type. Filter types not handled earlier (equals, not_equals, contains, not_contains) all reach it, and it always emits the inclusion condition `lat >= v-0.001 AND lat <= v+0.001`. So not_equals returns ONLY the rows matching the value — exact inversion of the documented semantics — with HTTP 200.
- **Code:** `server/src/api/analytics/utils/getFilterStatement.ts:331`, `server/src/api/analytics/utils/getFilterStatement.ts:335`, `server/src/api/analytics/utils/getFilterStatement.ts:343`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] regex/not_regex and greater_than/less_than filters silently use only value[0], contradicting 'Multiple values are treated as OR conditions'

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx's filter object table documents value as 'Array of values to match against — Multiple values are treated as OR conditions' with no exception for any filter type. A regex filter with value ["^/a","^/b"] should match either pattern.
- **Actual:** buildStringFilterCondition takes `const pattern = String(values[0] ?? "")` (getFilterStatement.ts:141) and builds a single match() expression (line 157); values[1..n] are silently discarded. The numeric branch does the same: `const numericValue = Number(filter.value[0])` (line 319). No error is raised, so requests return data filtered by only the first value.
- **Code:** `server/src/api/analytics/utils/getFilterStatement.ts:141`, `server/src/api/analytics/utils/getFilterStatement.ts:157`, `server/src/api/analytics/utils/getFilterStatement.ts:319`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] user_id filter with contains/not_contains matches only the fingerprint user_id column, not identified_user_id, despite docs saying it matches both

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx documents user_id: 'Matches both device fingerprint and custom identified user ID' with no restriction on filter type.
- **Actual:** The dual-column special case (getFilterStatement.ts:273-302) only fires for is_null, is_not_null, equals, and not_equals (line 280 gate). Any other type — e.g. contains — falls through to the generic branch (line 346) using getSqlParam('user_id') which is just the raw `user_id` column, so identified users whose custom ID matches are silently excluded from results.
- **Code:** `server/src/api/analytics/utils/getFilterStatement.ts:273`, `server/src/api/analytics/utils/getFilterStatement.ts:280`, `server/src/api/analytics/utils/getFilterStatement.ts:346`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Site-scoped analytics endpoints never return the documented 401 (invalid key) or 404 (site doesn't exist) — every auth failure is 403

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx error table: '401 - Unauthorized (missing or invalid API key)', '403 - Forbidden (no access to site)', '404 - Not Found (site doesn't exist)'. A request to /api/sites/123/overview with an invalid Bearer key should get 401, and a request for a non-existent numeric siteId should get 404.
- **Actual:** allowPublicSiteAccess (used by publicSite, which guards every documented analytics GET, index.ts:176/275+) ends with `reply.status(403).send({error:"Forbidden"})` (auth-middleware.ts:176) for missing keys, invalid keys, expired/disabled keys, and out-of-org keys alike — checkApiKey collapses all of those into {valid:false} (auth-utils.ts:307/319). requireSiteAccess does the same (auth-middleware.ts:116). 401 is only emitted by requireAuth/requireAdmin, which the analytics routes never use. For a nonexistent numeric siteId, resolveSiteId skips lookup entirely (auth-middleware.ts:41 only resolves identifiers longer than 4 chars, and utils.ts:167-168 falls back to parseInt for all-digit strings), checkApiKey finds no organization for the site and access checks fail, so the caller gets 403 — the documented 404 is only reachable for string site identifiers.
- **Code:** `server/src/lib/auth-middleware.ts:176`, `server/src/lib/auth-middleware.ts:116`, `server/src/lib/auth-middleware.ts:41`, `server/src/lib/auth-utils.ts:307`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


---

## session-replay (8)


### [HIGH] List endpoint silently ignores documented start_datetime/end_datetime params, returning replays from the wrong time range

- **Kind:** docs-mismatch
- **Expected:** list.mdx line 34 says the endpoint 'Accepts all Common Parameters (time and filters)'; getting-started.mdx (lines 111-121, 138-141) documents the exact-datetime option (start_datetime + end_datetime + time_zone) as one of the three valid ways to bound every analytics query.
- **Actual:** getSessionReplays builds the service options from request.query but only forwards start_date, end_date, time_zone, past_minutes_start, past_minutes_end and filters — start_datetime/end_datetime are never read. In getTimeStatement, dateTimeRange is derived only from params.start_datetime/end_datetime (utils.ts:37), which are undefined, and since start_date/end_date are empty strings the date branch is also skipped, so the function returns "" (utils.ts:89-90). The query runs with no time constraint at all and returns the newest replays regardless of the requested window.
- **Code:** `server/src/api/sessionReplay/getSessionReplays.ts:23-34`, `server/src/api/analytics/utils/utils.ts:36-37`, `server/src/api/analytics/utils/utils.ts:67-71`, `server/src/api/analytics/utils/utils.ts:89-90`, `client/src/api/utils.ts:74-86`, `client/src/api/analytics/endpoints/types.ts:54-61`, `client/src/api/analytics/endpoints/sessionReplay.ts:94-99`
- **Docs:** `docs/content/docs/api/session-replay/list.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** Trace: docs list.mdx:34 -> route index.ts:348 -> getSessionReplays.ts:23-34 (options object literally enumerates start_date, end_date, time_zone, past_minutes_*, filters — no start_datetime/end_datetime) -> sessionReplayQueryService.ts:28 getTimeStatement(options) -> utils.ts:36 `const date = start_date && end_date && time_zone ? ... : undefined` (empty strings are falsy) and utils.ts:37 `const dateTimeRange = start_datetime && end_datetime ? ... : undefined` (fields absent) -> utils.ts:89-90 returns "" -> query at sessionReplayQueryService.ts:73-102 has no start_time bound. The dashboard actively triggers this: buildApiParams (client/src/api/utils.ts:74-86) emits startDateTime/endDateTime with startDate/endDate as "" whenever the user picks a range with explicit times; toQueryParams (types.ts:54-61) sends them as start_datetime/end_datetime; useGetSessionReplays passes them through fetchSessionReplays. The server drops them, so the replay list silently shows all replays instead of the selected window. Every other analytics endpoint that calls getTimeStatement with the raw query object honors these params; session replay is the outlier.


### [MEDIUM] GET session-replay/:sessionId returns 500 instead of 404 for a missing session — dead 404 branch due to error-message mismatch

- **Kind:** broken
- **Expected:** A request for a nonexistent sessionId should return 404 Not Found (getting-started.mdx error table, lines 488-498) — and the handler visibly intends this: it has an explicit branch returning 404 with { error: "Session replay not found" }.
- **Actual:** The service throws `new Error("Session replay not found for session " + sessionId)` (sessionReplayQueryService.ts:136), but the handler's 404 branch checks strict equality `error.message === "Session replay not found"` (getSessionReplayEvents.ts:34). The message never matches because of the appended session id, so the branch is dead and every missing-session request falls through to `reply.status(500).send({ error: "Internal server error" })` (line 37).
- **Code:** `server/src/services/replay/sessionReplayQueryService.ts:136`, `server/src/api/sessionReplay/getSessionReplayEvents.ts:33-37`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/session-replay/events.mdx`


### [MEDIUM] page_url in list/metadata responses is the LAST page recorded, not the documented 'Entry page'

- **Kind:** docs-mismatch
- **Expected:** list.mdx lines 104-107 document `page_url` as 'Entry page' (the first page of the recorded session); events.mdx says metadata has the same fields as a list item.
- **Actual:** Every replay batch flush re-inserts the metadata row with the CURRENT page URL, and the ReplacingMergeTree keeps the newest row, so `page_url` ends up being the last page the user was on at the final flush — for any multi-page session it is the exit page, not the entry page.
- **Code:** `server/src/services/replay/sessionReplayIngestService.ts:209`, `server/public/script-full.js:424`, `server/src/db/clickhouse/clickhouse.ts:194`, `server/src/services/replay/sessionReplayQueryService.ts:93-95`
- **Docs:** `docs/content/docs/api/session-replay/list.mdx`


### [MEDIUM] Replay list and full replay events are served without any authentication when the site is marked public

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx (lines 37-44) states 'All API requests must include authentication', and every list/events example sends a Bearer API key; the error table lists 401 for missing keys. A user would not expect full session recordings (rrweb DOM/interaction streams) to be fetchable anonymously.
- **Actual:** GET .../session-replay/list and GET .../session-replay/:sessionId are registered with the `publicSite` preHandler (index.ts:348-349), which is [resolveSiteId, allowPublicSiteAccess] (index.ts:176). allowPublicSiteAccess -> getUserHasAccessToSitePublic returns true with no session, no API key, and no private key whenever `config.public` is true (auth-utils.ts:366-369). So enabling the 'public dashboard' flag also exposes every session replay recording — including the complete rrweb event stream — to any anonymous caller who knows/guesses the numeric site id.
- **Code:** `server/src/index.ts:348-349`, `server/src/index.ts:176`, `server/src/lib/auth-middleware.ts:153-177`, `server/src/lib/auth-utils.ts:357-383`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/session-replay/list.mdx`, `docs/content/docs/api/session-replay/events.mdx`


### [LOW] start_time/end_time are returned as SQL-style 'YYYY-MM-DD HH:MM:SS' strings, not the documented ISO 8601 datetimes

- **Kind:** docs-mismatch
- **Expected:** list.mdx lines 90-99 declare start_time/end_time as 'ISO 8601 datetime' and the example response (lines 282-283) shows "2024-01-31T14:00:00.000Z" — an unambiguous UTC instant that `new Date()` parses correctly everywhere.
- **Actual:** The columns are ClickHouse DateTime (clickhouse.ts:169-170) written as `DateTime.fromJSDate(...).toFormat("yyyy-MM-dd HH:mm:ss")` (sessionReplayIngestService.ts:204-205); JSONEachRow serializes them as "2024-01-31 14:00:00" with no 'T', no milliseconds, and no timezone designator, and processResults (utils.ts:93-115) passes non-numeric strings through untouched. Consumers following the docs and parsing with `new Date(start_time)` get local-time interpretation (silently shifted by the client's UTC offset) or an Invalid Date in stricter parsers.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:169-170`, `server/src/services/replay/sessionReplayIngestService.ts:204-205`, `server/src/api/analytics/utils/utils.ts:93-115`, `client/src/app/[site]/replay/components/ReplayCard.tsx:77`
- **Docs:** `docs/content/docs/api/session-replay/list.mdx`


### [LOW] Client expects totalCount from the list endpoint that the server never returns, so the replay-count header shows only the loaded page count

- **Kind:** unexpected-behavior
- **Expected:** The client type `SessionReplayListResponse { data: ...; totalCount: number }` and ReplayList's header intend to display the total number of replays matching the current range/filters, with singular/plural copy driven by that total.
- **Actual:** The server responds with `{ data: replaysWithTraits }` only (getSessionReplays.ts:42) — no totalCount field anywhere in the handler or service. ReplayList.tsx:41 reads `data?.pages[0]?.totalCount`, which is always undefined, so line 72 falls back to `flattenedData.length`: the header shows the number of replays fetched so far (e.g. '20 replays' for the first page of hundreds) and grows as the user scrolls. The pluralization check `totalCount === 1 ? t("replay") : t("replays")` (line 74) can never be true, so a single result renders as '1 replays'.
- **Code:** `client/src/api/analytics/endpoints/sessionReplay.ts:28-31`, `client/src/app/[site]/replay/components/ReplayList.tsx:41`, `client/src/app/[site]/replay/components/ReplayList.tsx:72-75`, `server/src/api/sessionReplay/getSessionReplays.ts:42`


### [LOW] Malformed limit/offset/filters on the list endpoint produce 500 Internal Server Error instead of the documented 400

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx error table (lines 488-498) promises 400 Bad Request for invalid parameters; list.mdx documents limit/offset as numbers and filters as the shared JSON filter parameter.
- **Actual:** The handler has no Zod/validation layer: `limit ? Number(limit) : 50` turns `?limit=abc` into NaN (getSessionReplays.ts:24-25), which is passed as a ClickHouse UInt32 query param ({limit: NaN}, sessionReplayQueryService.ts:33,100-101) and fails at query time; a non-JSON `filters` value makes validateFilters throw `new Error("Invalid JSON format")` (query-validation.ts:340-344) inside the service. Both errors land in the handler's blanket catch (getSessionReplays.ts:43-46) which returns 500 { error: "Internal server error" }, with no indication the caller's input was at fault.
- **Code:** `server/src/api/sessionReplay/getSessionReplays.ts:24-27`, `server/src/api/sessionReplay/getSessionReplays.ts:43-46`, `server/src/api/analytics/utils/query-validation.ts:337-347`, `server/src/services/replay/sessionReplayQueryService.ts:30-33`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/session-replay/list.mdx`


### [LOW] POST record endpoint returns 200 success for a nonexistent site; the 'Site not found' guard is unreachable

- **Kind:** unexpected-behavior
- **Expected:** The code itself intends to distinguish unknown sites: line 76-78 has `if (!siteId) { throw new Error(`Site not found: ...`) }`, which would surface as an error response, and integrators testing a wrong/typoed site id would expect something other than success.
- **Actual:** siteConfig.getConfig returns undefined for an unknown site id, and the destructuring `= (await siteConfig.getConfig(...)) ?? {}` (recordSessionReplay.ts:61-69) leaves both siteId and sessionReplay undefined. The `if (!sessionReplay)` check runs FIRST (lines 71-74) and returns `200 { success: true, message: "Session replay not enabled" }`, so the `if (!siteId)` guard on lines 76-78 can never execute for a missing site (when the site exists, siteId is always set). Replay batches posted to any invalid site id are acknowledged as success and silently discarded.
- **Code:** `server/src/api/sessionReplay/recordSessionReplay.ts:61-74`, `server/src/api/sessionReplay/recordSessionReplay.ts:76-78`


---

## sessions-users (13)


### [HIGH] Fresh installs create an events table without identified_user_id/ip/timezone/tag, so every sessions/users/user-traits endpoint 500s

- **Kind:** broken
- **Expected:** A self-hosted deployment initialized by the server (initializeClickhouse) supports all documented sessions/users/user-traits endpoints and the identify() flow.
- **Actual:** The CREATE TABLE events statement (clickhouse.ts:44-76) defines columns only up to props JSON; it does not include identified_user_id, ip, timezone, tag, or the web-vitals columns. Commit b5ad50a4 deleted the ensureEventsColumns() migration that used to ALTER these columns in (it added ip Nullable(String), timezone, identified_user_id String DEFAULT '', tag, lcp/cls/inp/fcp/ttfb, import_id), and no other DDL in the repo re-adds them to the events table (the only remaining identified_user_id ALTERs at clickhouse.ts:159 and :204 target session_replay tables). Every audited query selects or filters on these columns: getSessions argMax(identified_user_id)/argMax(ip)/argMax(tag), getUsers COALESCE(NULLIF(identified_user_id,'')...), getUserInfo WHERE identified_user_id = {userId}, getUserSessionCount WHERE ... OR identified_user_id = {userId}, getUserTraitValueUsers WHERE identified_user_id IN (...). On a database created by the current init code, ClickHouse raises UNKNOWN_IDENTIFIER and each handler returns 500. Ingestion also sends ip/timezone/tag/import_id fields (pageviewQueue.ts:103-113) that have no destination column.
- **Code:** `server/src/db/clickhouse/clickhouse.ts:44-76`, `server/src/api/analytics/sessions/getSessions.ts:112`, `server/src/api/analytics/sessions/getSessions.ts:145-148`, `server/src/api/analytics/users/getUsers.ts:108-110`, `server/src/api/analytics/users/getUserInfo.ts:90`, `server/src/api/analytics/users/getUserSessionCount.ts:36`, `server/src/api/analytics/users/getUserTraits.ts:134-146`, `server/src/services/tracker/pageviewQueue.ts:103-113`
- **Docs:** `docs/content/docs/api/sessions/list.mdx`, `docs/content/docs/api/users/list.mdx`, `docs/content/docs/identify-users.mdx`
- **Evidence:** clickhouse.ts:44-76 CREATE TABLE column list ends at `props JSON` — no identified_user_id/ip/timezone/tag. `git show b5ad50a4` removes ensureEventsColumns() with EVENTS_COLUMNS_TO_ENSURE = [lcp, cls, inp, fcp, ttfb, ip, timezone, identified_user_id, import_id, tag] and its call site in initializeClickhouse, without adding those columns to the CREATE TABLE. Repo-wide grep for 'ADD COLUMN' finds only feature_flags (events) and session-replay-table ALTERs; there are no .sql init scripts for ClickHouse (clickhouse/ contains only MIGRATION.md and a docker-compose file). getSessions.ts:112 `argMax(identified_user_id, timestamp)`, :145 `argMax(ip, timestamp)`, :148 `argMax(tag, timestamp)`; getUsers.ts:108 `COALESCE(NULLIF(events.identified_user_id, ''), events.user_id)`; getUserInfo.ts:90 `events.identified_user_id = {userId:String}`; getUserSessionCount.ts:36 `identified_user_id = {userId:String}`; getUserTraits.ts:146 `events.identified_user_id IN ({userIds:Array(String)})`. All of these reference columns absent from the freshly-created table, so every request errors and the catch blocks return 500. Existing databases created before b5ad50a4 still have the columns, which masks the bug for upgrades but not new installs.


### [HIGH] GET /users: most documented filter parameters make the ClickHouse query fail with unknown identifiers (500)

- **Kind:** broken
- **Expected:** users/list.mdx line 34 says the endpoint 'Accepts all Common Parameters', whose filter list (getting-started.mdx:236-405) includes pathname, page_title, querystring, utm_source/medium/campaign/term/content, lat, lon, timezone, event_name, channel, entry_page, exit_page. The users feature guide additionally promises 'Filter by: Specific events triggered'.
- **Actual:** getUsers builds the filter statement with default options (getUsers.ts:102) and applies it to the outer query `SELECT * FROM AggregatedUsers WHERE 1 = 1 ${filterStatement}` (getUsers.ts:139-145). AggregatedUsers projects only effective_user_id, user_id, identified_user_id, country, region, city, language, browser(+version), operating_system(+version), device_type, screen_width/height, referrer, channel, hostname, pageviews, events, sessions, last_seen, first_seen, tag. It has no pathname, page_title, querystring, url_parameters (needed for utm_* filters), lat, lon, or timezone columns, and no session_id column — yet event_name and channel filters compile to `session_id IN (SELECT ... FROM events ...)` (getFilterStatement.ts:184-188, 224-229) and entry_page/exit_page to the same shape (getFilterStatement.ts:237-268). Any of these documented filters produces an UNKNOWN_IDENTIFIER ClickHouse error, the Promise.all rejects, and the handler returns 500 'Failed to fetch users'.
- **Code:** `server/src/api/analytics/users/getUsers.ts:102`, `server/src/api/analytics/users/getUsers.ts:105-146`, `server/src/api/analytics/utils/getFilterStatement.ts:184-188`, `server/src/api/analytics/utils/getFilterStatement.ts:224-229`, `client/src/lib/filterGroups.ts:45-50`, `client/src/api/analytics/hooks/useGetUsers.ts:24`
- **Docs:** `docs/content/docs/api/users/list.mdx`, `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/(docs)/feature-guides/users.mdx`
- **Evidence:** Trace: filters → getFilterStatement(filters, site, timeStatement) with no sessionLevelParams override → DEFAULT_SESSION_LEVEL_PARAMS = ['event_name','channel'] (getFilterStatement.ts:19). For pathname/page_title/querystring the generic branch emits e.g. `pathname LIKE '%/blog%'` (getFilterStatement.ts:346-357); for utm_* getSqlParam returns `url_parameters['utm_source']` (getFilterStatement.ts:66-75); for timezone/lat/lon the raw column name. None of these identifiers exist in the AggregatedUsers derived table (getUsers.ts:105-138 lists every projected column), so the outer WHERE cannot resolve them. For event_name/channel/entry_page/exit_page the emitted condition references `session_id`, also absent from AggregatedUsers. The first-party client exposes exactly these filters on the Users page: USER_PAGE_FILTERS = BASE_FILTERS (includes page_title, querystring, channel, utm_*, lat, lon) + pathname + entry_page + exit_page (client/src/lib/filterGroups.ts:3-50), passed via useGetUsers.ts:24 → fetchUsers, so the shipped UI can trigger the 500. Note the count query applies the same filterStatement directly on raw events (getUsers.ts:163-172) where the columns DO exist, confirming the main/outer placement is the defect.


### [HIGH] Missing or invalid time parameters are silently swallowed and the query runs over all-time data — including the docs' own example requests

- **Kind:** unexpected-behavior
- **Expected:** getting-started.mdx:89-141 states date-range queries require all three of start_date, end_date, time_zone, and that 400 is returned for invalid parameters (line 493). sessions/list.mdx:176 and locations.mdx:80 show example requests using only `start_date=2024-01-01&end_date=2024-01-31` — a user following them expects data restricted to January 2024.
- **Actual:** getTimeStatement only builds the date branch when start_date AND end_date AND time_zone are all present (utils.ts:36). Without time_zone the composed object fails timeStatementParamsSchema's .refine, but the schema ends with `.catch({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined})` (query-validation.ts:96-100), so validation errors are converted into 'no time filter' and getTimeStatement returns '' (utils.ts:90). The request succeeds (200) and returns sessions/users/locations across the site's entire history. The same .catch swallows malformed dates, invalid IANA timezones, end_datetime <= start_datetime, and past_minutes_start <= past_minutes_end — none produce the documented 400.
- **Code:** `server/src/api/analytics/utils/utils.ts:36-44`, `server/src/api/analytics/utils/utils.ts:89-90`, `server/src/api/analytics/utils/query-validation.ts:92-100`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/sessions/list.mdx`, `docs/content/docs/api/sessions/locations.mdx`
- **Evidence:** Trace for the doc example `GET /sessions?start_date=2024-01-01&end_date=2024-01-31` (no time_zone): getSessions.ts:97 → getTimeStatement(req.query) → utils.ts:36 `const date = start_date && end_date && time_zone ? {...} : undefined` → date undefined → validateTimeStatementParams({date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined}) → final .refine 'Either date, dateTimeRange, or pastMinutesRange must be provided' fails → .catch returns all-undefined → getTimeStatement falls through every branch and returns '' → the CTE WHERE is only `site_id = {siteId}` (getSessions.ts:150-154) → all-time sessions returned with HTTP 200. Same path for getUsers (getUsers.ts:101) and getSessionLocations (getSessionLocations.ts:18). No 400 is ever produced for bad time params because Zod errors are caught by the schema itself.


### [MEDIUM] GET /sessions: documented querystring and timezone filters produce unknown-identifier ClickHouse errors (500)

- **Kind:** broken
- **Expected:** sessions/list.mdx:34 says GET /sessions 'Accepts all Common Parameters'; the common filter parameter tables include querystring (getting-started.mdx:335-339) and timezone (getting-started.mdx:299-303).
- **Actual:** The filter statement is applied to the outer query `... FROM AggregatedSessions a LEFT JOIN ReplaySessions r ... WHERE 1 = 1 ${filterStatement}` (getSessions.ts:166-171). The AggregatedSessions CTE (getSessions.ts:108-148) projects hostname, utm_*, lat, lon, tag, etc., but never selects querystring or timezone. A filter like [{"parameter":"querystring","type":"contains","value":["ref="]}] compiles to `querystring LIKE '%ref=%'` against a derived table with no such column → UNKNOWN_IDENTIFIER → catch block returns 500 'Failed to fetch sessions' (getSessions.ts:201-205). The client's own sessions page offers the querystring filter (SESSION_PAGE_FILTERS includes BASE_FILTERS with querystring, client/src/lib/filterGroups.ts:16).
- **Code:** `server/src/api/analytics/sessions/getSessions.ts:102-105`, `server/src/api/analytics/sessions/getSessions.ts:108-171`
- **Docs:** `docs/content/docs/api/sessions/list.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] GET /users/:userId never returns the intended 404 — nonexistent users get 200 with zeroed metrics and epoch timestamps

- **Kind:** broken
- **Expected:** The handler's own 404 path ('User not found') should fire for unknown user IDs; a caller reasonably expects an error rather than fabricated data (getting-started.mdx documents 404 among the standard responses).
- **Actual:** The outer ClickHouse query aggregates over the `sessions` CTE with no GROUP BY (getUserInfo.ts:97-119: COUNT(DISTINCT session_id), avg, any(), MAX, MIN, SUM). An aggregate query without GROUP BY always yields exactly one row, even over an empty input set, so for a user with zero events data.length is 1, never 0, and the check `if (data.length === 0) return 404` (getUserInfo.ts:146-150) is dead code. The endpoint returns 200 with sessions: 0, empty strings for country/browser/etc., duration: NaN-ish (avg over empty → null/0), and first_seen/last_seen as ClickHouse epoch defaults ('1970-01-01 00:00:00'), plus traits: null and linked_devices: []. The client user page then renders this junk (e.g. UserSidebar formats first_seen/last_seen via DateTime.fromSQL → 'Jan 1, 1970').
- **Code:** `server/src/api/analytics/users/getUserInfo.ts:97-119`, `server/src/api/analytics/users/getUserInfo.ts:143-150`
- **Docs:** `docs/content/docs/api/users/info.mdx`, `docs/content/docs/api/getting-started.mdx`


### [MEDIUM] GET /users totalCount is computed with different filter semantics than the page data, so counts and rows disagree

- **Kind:** broken
- **Expected:** users/list.mdx documents totalCount as 'Total number of users across all pages' — i.e., the count of exactly the users the data pages enumerate under the same filters.
- **Actual:** For filters that do work (country, browser, device_type, region, city, language, hostname, referrer, user_id, tag...), the main query applies them to per-user aggregates: e.g. country resolves against `argMax(country, timestamp)` — the user's most recent event (getUsers.ts:111, applied at :142). The count query applies the identical filter string directly to raw events rows (getUsers.ts:163-172 `FROM events WHERE site_id ... ${filterStatement}`), counting a user if ANY of their events matches. A user whose earlier events were from US but whose latest event is from CA is counted by countQuery for filter country=US but excluded from the data query. totalCount can exceed (or otherwise disagree with) the real number of listable users, producing phantom pages in pagination.
- **Code:** `server/src/api/analytics/users/getUsers.ts:139-145`, `server/src/api/analytics/users/getUsers.ts:149-172`, `server/src/api/analytics/users/getUsers.ts:199-209`
- **Docs:** `docs/content/docs/api/users/list.mdx`


### [MEDIUM] Timestamps are returned in ClickHouse 'YYYY-MM-DD HH:MM:SS' format, not the ISO 8601 datetimes the API docs promise

- **Kind:** docs-mismatch
- **Expected:** sessions/list.mdx:145-154 types session_start/session_end as 'ISO 8601 datetime' with example values like "2024-01-31T14:00:00.000Z"; users/list.mdx:152-161 and users/info.mdx:124-133 promise the same for first_seen/last_seen; sessions/get.mdx:93-96 for event timestamps.
- **Actual:** All these fields come straight from ClickHouse DateTime columns via JSONEachRow (e.g. MAX(timestamp) AS session_end, getSessions.ts:132), which serializes as 'YYYY-MM-DD HH:MM:SS' with a space separator and no timezone designator. processResults (utils.ts:93-115) only does numeric coercion — Number('2024-01-31 14:00:00') is NaN so the string passes through unchanged. API consumers parsing the documented ISO format (new Date(session_start), Date.parse) get invalid or locally-misinterpreted dates because the value carries no 'T'/'Z' and is implicitly UTC.
- **Code:** `server/src/api/analytics/utils/utils.ts:93-115`, `server/src/api/analytics/sessions/getSessions.ts:132-133`, `server/src/api/analytics/users/getUsers.ts:128-129`, `client/src/components/Sessions/SessionCard.tsx:44-48`
- **Docs:** `docs/content/docs/api/sessions/list.mdx`, `docs/content/docs/api/sessions/get.mdx`, `docs/content/docs/api/users/list.mdx`, `docs/content/docs/api/users/info.mdx`


### [MEDIUM] Sessions, session detail, and user info responses expose undocumented visitor IP addresses (plus lat/lon), reachable without authentication on public sites

- **Kind:** unexpected-behavior
- **Expected:** The documented Session, SessionMeta and UserInfo response objects contain no ip field (sessions/list.mdx:75-168, sessions/get.mdx:70-124, users/info.mdx:50-139 list every field; ip and lat/lon are absent from the session docs). Docs also state all API requests must include authentication (getting-started.mdx:37-39).
- **Actual:** getSessions selects `argMax(ip, timestamp) AS ip`, `argMax(lat, ...)`, `argMax(lon, ...)` per session (getSessions.ts:145-147); getSession selects `any(ip) AS ip` (getSession.ts:105); getUserInfo selects `any(ip) AS ip` (getUserInfo.ts:117) — all returned to the caller. Every route in this area is registered with the publicSite preHandler (index.ts:288-300), whose allowPublicSiteAccess → getUserHasAccessToSitePublic returns true for ANY unauthenticated request when the site's config.public flag is set (auth-utils.ts:366-369). So on a site with a public dashboard, anyone can enumerate per-session and per-user raw IP addresses, precise lat/lon, identified user IDs, and traits (emails etc.) with plain unauthenticated GETs.
- **Code:** `server/src/api/analytics/sessions/getSessions.ts:145-147`, `server/src/api/analytics/sessions/getSession.ts:105`, `server/src/api/analytics/users/getUserInfo.ts:117`, `server/src/lib/auth-middleware.ts:153-177`, `server/src/lib/auth-utils.ts:357-383`, `server/src/index.ts:288-300`
- **Docs:** `docs/content/docs/api/sessions/list.mdx`, `docs/content/docs/api/sessions/get.mdx`, `docs/content/docs/api/users/info.mdx`


### [LOW] GET /users default page_size is 100, not the documented 20

- **Kind:** docs-mismatch
- **Expected:** users/list.mdx:43-47 documents page_size: 'Number of results per page', default 20.
- **Actual:** getUsers.ts:48 destructures `page_size: pageSize = "100"`, so a request without page_size returns 100 users per page.
- **Code:** `server/src/api/analytics/users/getUsers.ts:48`
- **Docs:** `docs/content/docs/api/users/list.mdx`


### [LOW] GET /sessions pagination applies LIMIT/OFFSET without an ORDER BY on the final result, so page order and stability are not guaranteed

- **Kind:** unexpected-behavior
- **Expected:** A 'paginated list of sessions' (sessions/list.mdx:3,18) implies a deterministic order so that page N+1 continues where page N ended without duplicates or gaps; the query's intent (ORDER BY session_end DESC) is newest-first.
- **Actual:** The ORDER BY session_end DESC sits inside the AggregatedSessions CTE (getSessions.ts:157). The outer query then LEFT JOINs ReplaySessions, applies WHERE conditions (filters, identified_only, min_* thresholds) and LIMIT {limit} OFFSET {offset} (getSessions.ts:166-176) with no ORDER BY of its own. SQL (including ClickHouse) does not guarantee that a subquery's ordering survives a join plus outer filtering, especially under multi-threaded execution — so LIMIT/OFFSET is applied to a result whose order is formally unspecified, which can reorder, duplicate, or drop sessions across pages.
- **Code:** `server/src/api/analytics/sessions/getSessions.ts:157`, `server/src/api/analytics/sessions/getSessions.ts:166-176`
- **Docs:** `docs/content/docs/api/sessions/list.mdx`


### [LOW] Session detail 'events' count includes performance (web-vitals) rows and pageviews, disagreeing with the events list, pagination.total, and the sessions-list semantics

- **Kind:** unexpected-behavior
- **Expected:** sessions/list.mdx:137-140 defines a session's events as 'Number of custom events'. sessions/get.mdx's example response shows session.events (7) equal to pagination.total (7), i.e. the count of rows the events array will page through (which excludes performance rows).
- **Actual:** getSession's session query computes `count() as events` (getSession.ts:102) — every row for the session, including type='pageview' AND type='performance' web-vitals beacons. The sibling countQuery and eventsQuery both add `AND type != 'performance'` (getSession.ts:123, 143). So for a session with 5 pageviews, 2 custom events and 3 performance rows: sessions list reports events=2 (countIf(type='custom_event'), getSessions.ts:138), session detail reports session.events=10, while pagination.total=7 and the events array can never contain more than 7 entries — the same field name has three different values across documented endpoints and session.events permanently exceeds what pagination can reach.
- **Code:** `server/src/api/analytics/sessions/getSession.ts:102`, `server/src/api/analytics/sessions/getSession.ts:116-125`, `server/src/api/analytics/sessions/getSession.ts:128-148`
- **Docs:** `docs/content/docs/api/sessions/get.mdx`, `docs/content/docs/api/sessions/list.mdx`


### [LOW] Unauthenticated or invalid-key requests return 403 Forbidden, but docs document 401 Unauthorized for missing/invalid API keys

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx:490-498 documents '401 - Unauthorized (missing or invalid API key)' and reserves 403 for 'no access to site'.
- **Actual:** All nine endpoints in this area use publicSite → allowPublicSiteAccess (index.ts:176, 288-300). When no API key/session is presented (or the key is invalid) and the site is not public, the middleware falls through to `return reply.status(403).send({ error: "Forbidden" })` (auth-middleware.ts:176). There is no 401 path in allowPublicSiteAccess at all, so the documented 401 can never occur for these endpoints.
- **Code:** `server/src/lib/auth-middleware.ts:172-176`, `server/src/index.ts:176`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Invalid 'filters' JSON and other malformed inputs return 500 (in inconsistent shapes) instead of the documented 400

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx:490-506 promises '400 - Bad Request (invalid parameters)' and the uniform error shape {"error": "..."} for malformed input such as a bad filters value.
- **Actual:** validateFilters throws ('Invalid JSON format' / Zod errors, query-validation.ts:337-348). In getSessions/getUsers this throw is caught by the generic catch and surfaced as 500 'Failed to fetch sessions'/'Failed to fetch users' (getSessions.ts:201-205, getUsers.ts:210-213). getSessionLocations has no try/catch at all, so the same throw escapes to Fastify's default handler, producing a 500 with Fastify's {statusCode, error, message} envelope — a third, undocumented error shape. Similarly, a non-IANA time_zone on /users/session-count is interpolated into toDate(timestamp, 'bogus') (getUserSessionCount.ts:31) and the resulting ClickHouse error becomes a 500, and a non-numeric limit/page on /sessions becomes a ClickHouse query_params type error → 500. No malformed-parameter path in this area returns 400.
- **Code:** `server/src/api/analytics/utils/query-validation.ts:337-348`, `server/src/api/analytics/sessions/getSessions.ts:201-205`, `server/src/api/analytics/sessions/getSessionLocations.ts:7-66`, `server/src/api/analytics/users/getUserSessionCount.ts:31`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


---

## sites-config (9)


### [HIGH] DELETE /api/sites/:siteId never deletes the site's analytics events from ClickHouse despite docs promising all data is permanently deleted

- **Kind:** docs-mismatch
- **Expected:** delete.mdx: "Permanently deletes a site and all its associated data." site-settings.mdx Delete Site: "All analytics data, reports, funnels, and goals will be permanently deleted."
- **Actual:** The handler deletes only session_replay_events and session_replay_metadata from ClickHouse plus the Postgres sites row. The deletion of the main `events` table (all pageviews, custom events, performance, errors, bot events) is commented out, and no cleanup job exists elsewhere, so every analytics event for the deleted site remains in ClickHouse indefinitely.
- **Code:** `server/src/api/sites/deleteSite.ts:11-14`, `server/src/api/sites/deleteSite.ts:16-26`, `server/src/lib/siteConfig.ts:182-193`
- **Docs:** `docs/content/docs/api/sites/delete.mdx`, `docs/content/docs/(docs)/site-settings.mdx`
- **Evidence:** deleteSite.ts lines 11-14 contain the events deletion commented out: `// await clickhouse.command({ query: "DELETE FROM events WHERE site_id = {id:UInt32}" ... })`. Lines 16-26 only run DELETE on session_replay_events, session_replay_metadata, and siteConfig.removeSite (Postgres `db.delete(sites)`, siteConfig.ts:186). A repo-wide grep for `DELETE FROM events` finds only deleteSiteImport.ts (per-import) and the commented line; no cron/cleanup job targets orphaned events (no matches for orphan cleanup in server/src). Since site_id is a Postgres serial that is never reused, the rows are unreachable but persist — contradicting both docs pages and GDPR-style expectations of "permanently deleted".


### [HIGH] Deleting a site that has import history silently fails (FK violation swallowed) but still returns success:true and destroys its session replay data

- **Kind:** broken
- **Expected:** delete.mdx documents response `success: Whether the deletion was successful` — success:true must mean the site was actually deleted; on failure the site should remain intact or an error be returned.
- **Actual:** For any site with rows in import_status (every site that ever ran a data import), `db.delete(sites)` raises a foreign-key violation because import_status_site_id_sites_site_id_fk is ON DELETE NO ACTION (only FK to sites without cascade). siteConfig.removeSite catches and logs the error (siteConfig.ts:190-192), so Promise.all resolves and the handler returns 200 {success:true} while the site still exists. Meanwhile the two ClickHouse session-replay DELETEs in the same Promise.all already ran, so replay data is irreversibly destroyed for a site that was not deleted.
- **Code:** `server/src/api/sites/deleteSite.ts:16-29`, `server/src/lib/siteConfig.ts:182-193`, `server/src/db/postgres/schema.ts:802-827`, `server/drizzle/0000_premium_jubilee.sql:449`, `client/src/api/admin/endpoints/sites.ts:103-107`
- **Docs:** `docs/content/docs/api/sites/delete.mdx`
- **Evidence:** Trace: DELETE /sites/:siteId (index.ts:358, adminSite) → deleteSite.ts:16-26 Promise.all([CH delete session_replay_events, CH delete session_replay_metadata, siteConfig.removeSite(Number(id))]). removeSite (siteConfig.ts:182-193) wraps `db.delete(sites).where(...)` in try/catch that only logs. schema.ts:816-819 defines the import_status→sites FK with no onDelete, and the applied migration confirms it: 0000_premium_jubilee.sql:449 `... ON DELETE no action`. All other FKs to sites.siteId are ON DELETE cascade (funnels:425, goals:437, gsc_connections:443, member_site_access:491, user_aliases:593, user_profiles:599, experiments, feature_flags, dashboards). deleteSite.ts:29 unconditionally replies {success:true}; the client (sites.ts:103) treats any 2xx as success and shows the site list refreshed — the 'deleted' site reappears.


### [MEDIUM] Documented single-IP exclusion (esp. IPv6) uses raw string equality, so equivalent-but-differently-written addresses are accepted by validation yet never match

- **Kind:** broken
- **Expected:** hiding-own-traffic.mdx and filter-traffic.mdx promise single-IP exclusion including "Single IPv6: 2001:db8::1, ::1" — an excluded address should be blocked regardless of textual representation.
- **Actual:** matchesIPPattern's single-IP branch is `return ipAddress === trimmedPattern;` — a byte-for-byte string comparison of the untrimmed/unnormalized header IP against the stored pattern. IPv6 has many equivalent textual forms, so a pattern like `2001:0db8::1` or `2001:DB8::1` (both accepted as valid by validateIPPattern via `new Address6(...)`) never matches a visitor arriving as `2001:db8::1`. Likewise an IPv4 pattern `203.0.113.45` never matches when the request IP surfaces as IPv4-mapped `::ffff:203.0.113.45` (Node's request.ip form on dual-stack sockets), since the exact compare fails and the CIDR/range branches don't apply.
- **Code:** `server/src/lib/siteConfig.ts:333-336`, `server/src/lib/ipUtils.ts:22-34`, `server/src/utils.ts:260-290`, `server/src/services/tracker/trackEvent.ts:318-327`
- **Docs:** `docs/content/docs/(docs)/hiding-own-traffic.mdx`, `docs/content/docs/(docs)/filter-traffic.mdx`


### [LOW] POST /organizations/:organizationId/sites has no request validation and returns 500 on missing/invalid body fields

- **Kind:** broken
- **Expected:** Malformed input to an authenticated JSON endpoint should produce a 400 with a validation error (as sibling endpoints do via Zod, e.g. updateSiteConfig).
- **Actual:** The handler destructures request.body and calls `domain.replace(...)` (line 66) before the try block (line 87). A body of `{}` or `{"name":"x"}` (no `domain`) throws TypeError: Cannot read properties of undefined (reading 'replace') → Fastify generic 500. A body missing `name` passes the domain checks, then hits the Postgres NOT NULL constraint on sites.name (schema.ts:67) inside the try → 500 "Internal server error". Additionally, `excludedIPs` is inserted without validateIPPattern (addSite.ts:137), unlike PUT /config which 400s on invalid patterns (updateSiteConfig.ts:141-157), so invalid patterns can be seeded at creation and silently never match.
- **Code:** `server/src/api/sites/addSite.ts:39-66`, `server/src/api/sites/addSite.ts:87`, `server/src/index.ts:384`


### [LOW] POST /sites/:siteId/private-link-config reports success and returns a key even when the database write fails, leaving the key unpersisted

- **Kind:** broken
- **Expected:** update-private-link.mdx documents `success: Whether the request was successful` and `privateLinkKey: New private link key (for generate)` — a returned key must be the one actually stored.
- **Actual:** The handler generates a random key, then calls siteConfig.updateConfig, whose entire DB update is wrapped in a try/catch that only logs (siteConfig.ts:154-156) and resolves normally. The handler then unconditionally replies {success:true, data:{privateLinkKey}} (updateSitePrivateLinkConfig.ts:50-55). If the Postgres UPDATE fails, the caller receives success plus a key that was never saved; a dashboard iframe built with it (client DashboardEmbedTab.tsx uses generatedPrivateLink.privateLinkKey immediately) will 403 because getUserHasAccessToSitePublic compares against the stored privateLinkKey (auth-utils.ts:372-375). Same swallow applies to revoke: success:true with the old key still active.
- **Code:** `server/src/api/sites/updateSitePrivateLinkConfig.ts:34-55`, `server/src/lib/siteConfig.ts:144-157`
- **Docs:** `docs/content/docs/api/sites/update-private-link.mdx`


### [LOW] Widget embed docs say bar chart and top countries default to "on", but the widget and embed-stats endpoint default both to off when the params are absent

- **Kind:** docs-mismatch
- **Expected:** widget.mdx Card options table: "Bar chart | on / off | on" and "Top countries | on / off | on" — a card widget without explicit parameters should show the chart and top-5 countries; the minutes default of 30 is honored, implying absent params take the documented defaults.
- **Actual:** Both the widget HTML route and the stats endpoint treat absent params as false: `const chart = sp.get("chart") === "true"` (route.ts:308) and `const includeChart = req.query.chart === "true"` (getEmbedStats.ts:35). A hand-built URL like /widget/123?variant=card (which the docs invite: "the widget URL accepts these parameters") renders only the count — no chart, no countries — while `minutes` genuinely defaults to 30 (route.ts:306-307, getEmbedStats.ts:31).
- **Code:** `server/src/api/sites/getEmbedStats.ts:35-36`, `client/src/app/widget/[siteId]/route.ts:308-309`
- **Docs:** `docs/content/docs/(docs)/embeds/widget.mdx`


### [LOW] filter-traffic.mdx "Testing Filters Locally" curl targets POST /track, but the tracking endpoint only exists at /api/track

- **Kind:** docs-mismatch
- **Expected:** The documented test command `curl -X POST http://localhost:3000/track ...` should reach the ingestion endpoint and demonstrate exclusion filtering.
- **Actual:** The only registration is `server.post("/api/track", trackEvent)` (index.ts:466). The self-host Caddy proxy forwards only `handle /api/*` to the backend; everything else goes to the Next.js client (Caddyfile:7-13), which has no /track route. The documented command therefore returns a 404 from the client app and cannot exercise the filters; the real tracking script posts to `${analyticsHost}/track` where analyticsHost already includes /api (tracking.ts:186, script served from /api/script.js).
- **Code:** `server/src/index.ts:466`, `Caddyfile:7-13`, `server/src/analytics-script/tracking.ts:186`
- **Docs:** `docs/content/docs/(docs)/filter-traffic.mdx`


### [LOW] hiding-own-traffic.mdx claims IP exclusion changes take effect "within seconds", but per-worker site-config caching means up to 60 seconds

- **Kind:** docs-mismatch
- **Expected:** hiding-own-traffic.mdx Key Features: "Near real-time updates: Changes take effect within seconds".
- **Actual:** SiteConfig keeps an in-process Map cache with a 60-second TTL (siteConfig.ts:40-41). updateConfig clears only the cache of the process that handled the PUT /sites/:siteId/config request (this.cache.clear(), line 153). The server runs as a Node cluster (index.ts imports node:cluster; worker branches at 474-494), and ingestion requests land on arbitrary workers, so other workers keep serving the stale exclusion list — your own traffic keeps being tracked for up to 60 seconds after saving. filter-traffic.mdx states the correct number ("Changes usually take effect within 60 seconds"), so the two docs also contradict each other.
- **Code:** `server/src/lib/siteConfig.ts:40-41`, `server/src/lib/siteConfig.ts:144-157`, `server/src/index.ts:474-494`
- **Docs:** `docs/content/docs/(docs)/hiding-own-traffic.mdx`, `docs/content/docs/(docs)/filter-traffic.mdx`


### [LOW] GET /api/sites/:siteId returns createdAt/updatedAt as Postgres 'YYYY-MM-DD HH:MM:SS' strings, not the documented ISO 8601 datetimes

- **Kind:** docs-mismatch
- **Expected:** get.mdx documents createdAt/updatedAt as type string, typeDescription "ISO 8601 datetime", with the example response showing "2024-01-15T10:30:00.000Z".
- **Actual:** sites.createdAt/updatedAt are drizzle `timestamp(..., { mode: "string" })` on a timezone-less Postgres timestamp column, which the pg driver returns as raw text like "2024-01-15 10:30:00.123456" — no 'T' separator, no timezone designator — and getSite passes them through untouched (getSite.ts:35-36). Strict ISO 8601 parsers (e.g. Luxon DateTime.fromISO, Safari's Date parsing of the space-separated form) reject or misinterpret this, and the missing offset makes the wall-clock ambiguous for API consumers.
- **Code:** `server/src/api/sites/getSite.ts:35-36`, `server/src/db/postgres/schema.ts:70-71`
- **Docs:** `docs/content/docs/api/sites/get.mdx`


---

## tracking-ingestion (14)


### [HIGH] POST /api/track never returns 429; a rate-limited API key silently degrades to untrusted ingestion, corrupting or discarding server-side events while returning success

- **Kind:** docs-mismatch
- **Expected:** sending-events.mdx (lines 232-234) promises: 'API keys are limited to 500 requests per 10 minutes. Exceeding the limit returns a 429 status code.' Callers therefore expect a 429 they can back off on, and expect their ip_address/user_agent overrides to keep working until then.
- **Actual:** The documented limit numbers are wrong (better-auth keys are created with 20 req/min Standard or 200 req/min Pro over a 60s window, const.ts:28-30; getting-started.mdx documents these correct numbers, contradicting sending-events.mdx). Worse, /api/track never sends 429 at all: isTrustedServerSideIngestion() calls checkApiKey() and only reads .valid, discarding the rateLimited flag (trackEvent.ts:257-258). A rate-limited key yields {valid:false, rateLimited:true} (auth-utils.ts:310-313), so the request is processed as an untrusted browser request: resolveTrackingIdentity ignores the payload's ip_address/user_agent and substitutes the calling server's IP and HTTP User-Agent (requestIdentity.ts:31-32), and checkBotBlocking runs (trackEvent.ts:292-309) — non-browser UAs (curl/python/node) and datacenter IPs are then classified as bots and the event is diverted to the bot_events table while the API still responds 200 {success:true} (trackEvent.ts:406-416).
- **Code:** `server/src/services/tracker/trackEvent.ts:251-259`, `server/src/services/tracker/trackEvent.ts:288-309`, `server/src/services/tracker/trackEvent.ts:406-416`, `server/src/lib/auth-utils.ts:310-313`, `server/src/lib/const.ts:28-30`, `server/src/services/tracker/requestIdentity.ts:31-32`
- **Docs:** `docs/content/docs/api/sending-events.mdx`, `docs/content/docs/api/getting-started.mdx`
- **Evidence:** Trace: trackEvent → isTrustedServerSideIngestion (trackEvent.ts:251-259) requires a Bearer header and returns checkApiKey(...).valid only. checkApiKey (auth-utils.ts:253-320) returns {valid:false, rateLimited:true} when better-auth reports RATE_LIMITED; that flag is only turned into a 429 by the stats-API middlewares (auth-middleware.ts:69-70 etc.), which /api/track does not use — it is registered with no preHandler (index.ts:466). With trustedServerSideIngestion=false, checkBotBlocking's UA-pattern and header-heuristic layers run (botBlocking/index.ts:215-235); a server-side HTTP client UA matches classifyUA/detectBot, so botDetectionResult is truthy and the event goes to botEventQueue with a 200 success response (trackEvent.ts:406-416). grep confirms no 429 is ever emitted from the trackEvent path.


### [MEDIUM] Documented default type:'pageview' is not implemented — POST /api/track without 'type' is rejected with 400

- **Kind:** docs-mismatch
- **Expected:** sending-events.mdx (lines 31-35) documents the 'type' field as optional with default: 'pageview' ('Standard page view tracking. Set type: "pageview" (default)'), so a body without 'type' should be accepted as a pageview.
- **Actual:** trackingPayloadSchema is z.discriminatedUnion("type", [...]) (trackEvent.ts:61). A payload with no 'type' fails safeParse and the handler returns 400 {success:false, error:'Invalid payload'} (trackEvent.ts:267-273). There is no defaulting logic anywhere in the handler.
- **Code:** `server/src/services/tracker/trackEvent.ts:61`, `server/src/services/tracker/trackEvent.ts:265-273`
- **Docs:** `docs/content/docs/api/sending-events.mdx`


### [MEDIUM] Event timestamps are written to ClickHouse in the server's local timezone while every analytics query interprets the column as UTC

- **Kind:** broken
- **Expected:** Events ingested via POST /api/track should be stored with UTC timestamps, because all read paths compare the timestamp column against UTC boundaries (utils.ts:53-70 uses toTimeZone(..., 'UTC') and toDateTime(..., 'UTC'), and the API docs define start_datetime/end_datetime as 'Exact UTC timestamps').
- **Actual:** createBasePayload records timestamp as new Date().toISOString() (tracker/utils.ts:161), then pageviewQueue formats it with DateTime.fromISO(pv.timestamp).toFormat("yyyy-MM-dd HH:mm:ss") (pageviewQueue.ts:75) with no zone option. Luxon's fromISO converts to the system zone, so on any server whose TZ is not UTC every stored timestamp is shifted by the UTC offset. botEventQueue.ts:49 has the identical bug.
- **Code:** `server/src/services/tracker/pageviewQueue.ts:75`, `server/src/services/tracker/botBlocking/botEventQueue.ts:49`, `server/src/api/analytics/utils/utils.ts:53-70`, `server/src/services/tracker/utils.ts:161`


### [MEDIUM] Tracking script sends unbounded page_title/querystring/tag/user_id values that the server's Zod limits reject, silently dropping every event on affected pages

- **Kind:** broken
- **Expected:** Installing the script tag per script.mdx should track pageviews and events on every page; server-side field limits (page_title 512, querystring 2048, tag 256, user_id 255) should be enforced by truncation client-side or at worst degrade that one field.
- **Actual:** The script builds payloads with raw, untruncated values: page_title: document.title (script-full.js:718), querystring: url.search (line 714), tag from data-tag (line 727), user_id from localStorage (lines 723-725). The server rejects the whole payload with 400 when any field exceeds its max — page_title max 512 (trackEvent.ts:24), querystring max 2048 (line 20), tag max 256 (line 28), user_id max 255 (line 27) — because the schemas are .strict() Zod objects validated before anything else (trackEvent.ts:265-273). sendTrackingData only console.errors on failure (script-full.js:746-748), so all tracking for that page (pageviews, custom events, web vitals, errors) is silently lost.
- **Code:** `server/public/script-full.js:710-727`, `server/src/services/tracker/trackEvent.ts:19-28`, `server/public/script-full.js:746-748`
- **Docs:** `docs/content/docs/(docs)/script.mdx`, `docs/content/docs/(docs)/script-troubleshooting.mdx`


### [MEDIUM] Docs claim API keys bypass 'domain validation' on /api/track, but no domain validation exists for any request

- **Kind:** docs-mismatch
- **Expected:** sending-events.mdx line 18: 'An API key is optional but recommended for server-side tracking — it bypasses bot detection and domain validation.' This implies requests WITHOUT an API key are validated against the site's registered domain (Origin/hostname check), preventing arbitrary parties from injecting events into someone else's site_id.
- **Actual:** trackEvent performs no origin or domain validation anywhere: the only hostname-related check is the user-configured excludedHostnames blocklist (trackEvent.ts:364-380). normalizeOrigin exists in server/src/utils.ts:189 but is referenced only by its own unit test — it is never called from any request path. Any client can POST events for any site_id from any origin; only bot heuristics stand in the way.
- **Code:** `server/src/services/tracker/trackEvent.ts:262-432`, `server/src/utils.ts:189`
- **Docs:** `docs/content/docs/api/sending-events.mdx`


### [MEDIUM] POST /api/identify honors client-supplied ip_address/user_agent without any API key and lets unauthenticated callers trigger ClickHouse ALTER TABLE mutations per request

- **Kind:** unexpected-behavior
- **Expected:** Consistent trust handling with /api/track, where ip_address/user_agent overrides are only honored for requests bearing a valid API key (trustedServerSideIngestion, trackEvent.ts:288-290 → requestIdentity.ts:31-32). identify-users.mdx describes identify as linking 'this anonymous visitor' (the caller's own device) to a user ID.
- **Actual:** handleIdentify computes the anonymous fingerprint from payload-supplied ip_address/user_agent with no trust gate: userIdService.generateUserId(ip_address || resolveClientIp(request), user_agent || header, siteId) (identifyService.ts:91-95), or directly from a caller-chosen anonymous_id (line 90). Any unauthenticated caller who knows a public site_id can therefore mint aliases for arbitrary fingerprints. Additionally, each identify with a previously-unseen anonymousId inserts a userAliases row and fire-and-forgets backfillIdentifiedUserId (line 124), which issues three ALTER TABLE ... UPDATE mutations against ClickHouse (identifyService.ts:52-57) — so a loop sending random anonymous_id values generates unbounded Postgres rows and a ClickHouse mutation storm, unauthenticated.
- **Code:** `server/src/services/tracker/identifyService.ts:89-95`, `server/src/services/tracker/identifyService.ts:98-136`, `server/src/services/tracker/identifyService.ts:42-62`, `server/src/services/tracker/trackEvent.ts:288-290`
- **Docs:** `docs/content/docs/(docs)/identify-users.mdx`


### [LOW] Identify backfill only rewrites the last 30 days of anonymous events, but docs promise 'all past anonymous events' are updated

- **Kind:** docs-mismatch
- **Expected:** identify-users.mdx line 23: 'When a new alias is created ... Rybbit retroactively updates all past anonymous events from that device to include the identified user ID.'
- **Actual:** backfillIdentifiedUserId caps the mutation at 30 days: BACKFILL_DAYS = 30 (identifyService.ts:40) and the ALTER TABLE UPDATE includes 'AND timeColumn >= now() - INTERVAL {days} DAY' (line 54). Anonymous events older than 30 days are never attributed, and per the docs' own note (line 115) subsequent identify calls never re-backfill, so the gap is permanent.
- **Code:** `server/src/services/tracker/identifyService.ts:38-40`, `server/src/services/tracker/identifyService.ts:52-57`
- **Docs:** `docs/content/docs/(docs)/identify-users.mdx`


### [LOW] Server-side 'truncation' of error message/stack is dead code — documented 500/2000-char limits for error events are not enforced

- **Kind:** broken
- **Expected:** sending-events.mdx (lines 193-218) documents error events with message 'Max 500 chars' and stack 'Max 2000 chars'; the code comment at trackEvent.ts:138 ('Apply truncation limits') shows the intent to truncate oversized values.
- **Actual:** Inside the Zod .refine for error properties, parsed.message/parsed.stack are truncated on the local object produced by JSON.parse (trackEvent.ts:139-144), but the refine only returns a boolean — the original string `val` is what flows into the payload and ClickHouse. A 3900-char message inside a <=4096-char properties string passes validation and is stored untruncated; the mutation of `parsed` is discarded.
- **Code:** `server/src/services/tracker/trackEvent.ts:126-155`, `server/src/services/tracker/trackEvent.ts:138-144`
- **Docs:** `docs/content/docs/api/sending-events.mdx`


### [LOW] Hardcoded silent drop of all events from site 9133 with 800x600 screens in the ingestion queue

- **Kind:** unexpected-behavior
- **Expected:** POST /api/track responds {success:true} only for events that will be recorded (subject to the documented exclusion settings: IP, country, path, hostname, user-agent, bot detection).
- **Actual:** pageviewQueue.processQueue contains a hardcoded filter: `if (pv.site_id == 9133 && pv.screenWidth == 800 && pv.screenHeight == 600) { return false; }` (pageviewQueue.ts:52-54). Matching events — including trusted API-key ingestion that legitimately reports an 800x600 screen — are dropped after the API already returned {success:true}, with no log, no bot_events record, and no site setting controlling it.
- **Code:** `server/src/services/tracker/pageviewQueue.ts:51-55`


### [LOW] track-events.mdx tells users to call pageview() when 'data-track-spa is set to "false"', but the script has no data-track-spa attribute

- **Kind:** docs-mismatch
- **Expected:** track-events.mdx line 51: 'Tracks a pageview. Useful when data-track-spa is set to "false" ...' — implying SPA auto-tracking is controlled by a script-tag attribute.
- **Actual:** parseScriptConfig (script-full.js:135-179) reads only data-site-id, site-id, data-namespace, data-skip-patterns, data-mask-patterns, data-debounce, data-tag and the data-replay-* attributes. SPA tracking comes exclusively from the remote tracking-config response (autoTrackSpa ← apiConfig.trackSpaNavigation, script-full.js:231; served by getTrackingConfig.ts:31). Setting data-track-spa="false" on the script tag has no effect, and script.mdx's own attribute table (which omits data-track-spa) confirms the attribute no longer exists.
- **Code:** `server/public/script-full.js:135-179`, `server/public/script-full.js:227-240`, `server/src/api/sites/getTrackingConfig.ts:23-35`
- **Docs:** `docs/content/docs/(docs)/track-events.mdx`, `docs/content/docs/(docs)/script.mdx`


### [LOW] Over-monthly-limit responses from /api/track are a bare text string, not the documented {success} JSON shape

- **Kind:** docs-mismatch
- **Expected:** sending-events.mdx (lines 221-230, 438-453) documents the /api/track response as JSON with a boolean 'success' field for both success and error cases.
- **Actual:** When usageService.isSiteOverLimit is true, the handler replies `reply.status(200).send("Site over monthly limit, event not tracked")` (trackEvent.ts:314) — an HTTP 200 with a text/plain string body. Every documented client pattern (e.g. the JavaScript example's `await response.json()` at sending-events.mdx:271) throws a JSON parse error on this response, and callers cannot distinguish 'tracked' from 'dropped for quota' since both are 200.
- **Code:** `server/src/services/tracker/trackEvent.ts:312-315`
- **Docs:** `docs/content/docs/api/sending-events.mdx`


### [LOW] Query-parameter API key auth (?api_key=) documented for all API requests does not activate trusted ingestion on /api/track

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx (lines 39-55): 'All API requests must include authentication using one of the following methods: Bearer Token ... Query Parameter (Testing Only) ?api_key=your_api_key_here', so testing /api/track with ?api_key= should behave like the Bearer header (bypassing bot detection and enabling ip_address/user_agent overrides).
- **Actual:** isTrustedServerSideIngestion short-circuits to false unless the Authorization header starts with 'Bearer ' (trackEvent.ts:253-255); checkApiKey — which does support the query parameter (auth-utils.ts:263-264) — is never reached for a query-param-only request. Events sent with ?api_key= are treated as untrusted: bot detection applies and ip_address/user_agent overrides are ignored, with no error indicating the key was unused.
- **Code:** `server/src/services/tracker/trackEvent.ts:251-259`, `server/src/lib/auth-utils.ts:259-264`
- **Docs:** `docs/content/docs/api/getting-started.mdx`


### [LOW] Script applies skipPatterns to every event type, not just pageviews as documented — custom events, errors and web vitals on skipped paths are silently dropped

- **Kind:** unexpected-behavior
- **Expected:** script.mdx (line 42) documents data-skip-patterns as: 'A JSON string array of URL path patterns to ignore. Pageviews matching these patterns won't be tracked.' A user calling window.rybbit.event(...) on a skipped page (e.g. an /admin/** page) would expect the explicit custom event to still be sent.
- **Actual:** createBasePayload returns null whenever the current pathname matches a skip pattern (script-full.js:703-705), and track() aborts for ALL event types when the base payload is null (lines 755-758) — so custom events, outbound clicks, button/copy/form autocapture, errors (line 903 routes through track) and web vitals (trackWebVitals, lines 819-823) are all suppressed on skipped paths, not just pageviews.
- **Code:** `server/public/script-full.js:697-709`, `server/public/script-full.js:750-775`, `server/public/script-full.js:819-831`
- **Docs:** `docs/content/docs/(docs)/script.mdx`


### [LOW] clearUserId() does not reset the session replay recorder's user ID — replay batches after logout are still attributed to the previous user

- **Kind:** unexpected-behavior
- **Expected:** identify-users.mdx (line 116): 'Calling clearUserId() removes the user ID from localStorage so future events are anonymous.' All post-logout data streams, including session replay, should stop carrying the cleared user ID.
- **Actual:** identify() calls sessionReplayRecorder.updateUserId(customUserId) (script-full.js:929-931), but clearUserId() only nulls this.customUserId and removes the localStorage key (lines 965-972) — it never calls updateUserId(""). The recorder keeps its captured userId and every subsequent flushEvents() sends batches with `userId: this.userId` set to the logged-out user (lines 420-421), which the /session-replay/record endpoint accepts as the identified user (server/src/api/sessionReplay/recordSessionReplay.ts:12).
- **Code:** `server/public/script-full.js:965-972`, `server/public/script-full.js:917-932`, `server/public/script-full.js:418-429`
- **Docs:** `docs/content/docs/(docs)/identify-users.mdx`


---

## Unverified candidates (verifier hit rate limit — treat with extra skepticism)


**[gsc]**

### [MEDIUM] Auth-level asymmetry: member-role users can start the OAuth flow but the callback demands site admin, stranding them on a raw 403 after Google consent — yet the same members CAN disconnect or repoint the connection

- **Kind:** unexpected-behavior
- **Expected:** A privilege model where the same role that can create a GSC connection can complete it, and where destructive operations (disconnect, repoint property) require at least the same privilege as creating the connection.
- **Actual:** GET /gsc/connect is registered with authSite (index.ts:415) and re-checks only member-level access (connect.ts:21 getUserHasAccessToSite), so an org 'member' gets the Google consent URL and grants access. The callback then requires admin (callback.ts:57 getUserHasAdminAccessToSite; auth-utils.ts:96-98 skips role==='member' when adminOnly=true) and responds 403 JSON {"error":"Access denied"} — a bare API response in the browser, mid-flow, after consent was already granted at Google. Meanwhile DELETE /gsc/disconnect (disconnect.ts:23) and POST /gsc/select-property (selectProperty.ts:35) only require member-level access, so the member who cannot complete a connection can delete or repoint the admin's existing one.
- **Code:** `server/src/index.ts:415`, `server/src/api/gsc/connect.ts:21`, `server/src/api/gsc/callback.ts:57`, `server/src/api/gsc/disconnect.ts:23`, `server/src/api/gsc/selectProperty.ts:35`, `server/src/lib/auth-utils.ts:96`, `server/src/lib/auth-utils.ts:390`


**[gsc]**

### [LOW] select-property accepts any arbitrary string as the GSC property, permanently breaking data fetches until reconnect

- **Kind:** unexpected-behavior
- **Expected:** POST /sites/:siteId/gsc/select-property should only accept a property URL that the connected Google account actually owns (the list returned by getGSCProperties during the callback).
- **Actual:** The handler validates only that propertyUrl is truthy and not the literal 'PENDING_SELECTION' (selectProperty.ts:30-32), then writes it verbatim to gsc_connections (selectProperty.ts:41-48). Any site member can POST propertyUrl: 'https://example.com/' (or garbage); /gsc/status will report it as the connected property, and every /gsc/data call will send it to Google (getData.ts:47), which rejects it with 403 — surfaced in the UI as the misleading 'No Data ... 2-3 day delay' empty state.
- **Code:** `server/src/api/gsc/selectProperty.ts:30`, `server/src/api/gsc/selectProperty.ts:41`, `server/src/api/gsc/getData.ts:47`


**[dashboards-custom-query]**

### [HIGH] Multi-value not_equals / not_contains filters are OR-joined tautologies and silently filter nothing (PDF export and shared filter builder)

- **Kind:** broken
- **Expected:** getting-started.mdx documents not_equals as 'Exclude exact matches / Value must not match' and not_contains as 'Exclude substring matches'. export-pdf.mdx says the PDF endpoint's `filters` param uses 'the same format as the Common Parameters filters'. A filter [{parameter:'country', type:'not_equals', value:['US','GB']}] should exclude both US and GB rows.
- **Actual:** For 2+ values, negative filter conditions are joined with OR, producing an always-true predicate. Verified by executing getFilterStatement with tsx: input [{parameter:'country',type:'not_equals',value:['US','GB']}] produces `AND (country != 'US' OR country != 'GB')` — every row satisfies at least one branch, so the filter is a no-op and US/GB traffic is included. Same for not_contains: `(pathname NOT LIKE '%/admin%' OR pathname NOT LIKE '%/blog%')`, and for session-level params (event_name/channel) via buildStringFilterCondition.
- **Code:** `server/src/api/analytics/utils/getFilterStatement.ts:161-167`, `server/src/api/analytics/utils/getFilterStatement.ts:346-356`, `server/src/services/pdfReports/pdfReportService.ts:66`, `server/src/api/analytics/utils/getFilterStatement.ts:289-300`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/sites/export-pdf.mdx`
- **Evidence:** getFilterStatement.ts:164-167 builds `values.map(value => `${expression} ${op} ...`).join(' OR ')` for ALL filter types via filterTypeToOperator (not_equals → '!=', not_contains → 'NOT LIKE'), both in buildStringFilterCondition (used by session-level subqueries, entry_page/exit_page) and in the generic branch at lines 351-356. The user_id special case at lines 289-300 joins not_equals conditions with AND — proving the intended semantics — but no other parameter gets that treatment. The PDF endpoint reaches this via generatePdfReport → pdfReportService.fetchReportData → getFilterStatement(JSON.stringify(filters), siteId) at pdfReportService.ts:66, and the resulting tautological fragment is interpolated into every overview/chart/topN query (e.g. pdfReportService.ts:197-198, 145). Runtime check output: `AND (country != 'US' OR country != 'GB')`.


**[dashboards-custom-query]**

### [MEDIUM] PDF report compares the current period against a previous period that is one day shorter, biasing all growth percentages

- **Kind:** broken
- **Expected:** The 'vs previous period' change indicators on the PDF metric cards should compare two windows of equal length (a 31-day report should be compared with the preceding 31 days).
- **Actual:** For any multi-day range the previous window is exactly one day shorter than the current window. Example start_date=2024-01-01, end_date=2024-01-31: getTimeStatement's date branch (utils.ts:53-64) includes both boundary dates, so the current window is Jan 1–Jan 31 = 31 days. pdfReportService.ts:48 computes durationDays = ceil(end.diff(start,'days').days) = 30 (not 31), then previousEnd = Dec 31 and previousStart = previousEnd.minus({days: 29}) = Dec 2, i.e. Dec 2–Dec 31 = 30 days. All six metric-card growth numbers (PdfReportTemplate.tsx:43-81, fed by previousOverview from pdfReportService.ts:86) are computed against a window missing one day, systematically overstating growth by roughly N/(N-1).
- **Code:** `server/src/services/pdfReports/pdfReportService.ts:45-64`, `server/src/api/analytics/utils/utils.ts:53-64`, `server/src/services/pdfReports/templates/PdfReportTemplate.tsx:43-81`
- **Docs:** `docs/content/docs/api/sites/export-pdf.mdx`


**[dashboards-custom-query]**

### [MEDIUM] PDF export in past-minutes / all-time / exact-time modes silently produces an all-time report with an empty chart and 0% deltas instead of an error

- **Kind:** broken
- **Expected:** export-pdf.mdx marks start_date, end_date, and time_zone as required (YYYY-MM-DD); getting-started.mdx promises 400 for invalid parameters. In the UI, exporting a PDF while viewing 'Last 30 minutes'/'Last 24 hours' (past-minutes), 'All time', or an exact time-of-day range should either produce a report for that range or be rejected/disabled.
- **Actual:** The Export-as-PDF menu item is available in every time mode (ExportButton.tsx:82-87 gates only on plan, not mode). In past-minutes and all-time modes, getStartAndEndDate returns nulls (api/utils.ts:40-42) and exportPdf sends start_date='' and end_date='' (exportPdf.ts:17-18). The server schema `z.string()` accepts empty strings (generatePdfReport.ts:7-8), then: (1) timeStatementParamsSchema's .catch() (query-validation.ts:96-100) turns the invalid date params into an empty time statement, so overview/topN cover ALL TIME, not the selected range; (2) previous and current periods are both all-time, so every change indicator reads 0%; (3) fetchChartData interpolates the empty string into toDateTime({startDate:String},...) which fails in ClickHouse and is swallowed at pdfReportService.ts:161-164, yielding an empty sessions chart; (4) the Content-Disposition filename becomes 'rybbit-report-<id>-Invalid DateTime-to-Invalid DateTime.pdf' because DateTime.fromISO('').toFormat() renders 'Invalid DateTime' (generatePdfReport.ts:45-47). The user gets a success toast and a misleading report. The same silent all-time fallback applies to API callers who send malformed dates (e.g. '01-01-2024') or an invalid time_zone — a 200 PDF with wrong-range data instead of the documented 400. Exact-time ranges also degrade: exportPdf.ts drops the time-of-day components, exporting whole days.
- **Code:** `client/src/app/[site]/components/SubHeader/Export/exportPdf.ts:13-21`, `client/src/api/utils.ts:40-42`, `client/src/app/[site]/components/SubHeader/Export/ExportButton.tsx:82-87`, `server/src/api/analytics/generatePdfReport.ts:6-11`, `server/src/api/analytics/utils/query-validation.ts:96-100`, `server/src/services/pdfReports/pdfReportService.ts:135-158`, `server/src/api/analytics/generatePdfReport.ts:45-47`
- **Docs:** `docs/content/docs/api/sites/export-pdf.mdx`, `docs/content/docs/api/getting-started.mdx`


**[dashboards-custom-query]**

### [LOW] Invalid `filters` on GET /sites/:siteId/export/pdf returns 500 instead of the documented 400

- **Kind:** docs-mismatch
- **Expected:** getting-started.mdx's error table promises '400 - Bad Request (invalid parameters)' for all endpoints; export-pdf.mdx documents `filters` as a JSON-encoded filter array following the common format.
- **Actual:** Three invalid-filter shapes all surface as 500 'Failed to generate PDF report': (1) malformed JSON — `filters ? JSON.parse(filters) : undefined` at generatePdfReport.ts:42 throws SyntaxError, caught by the generic handler at lines 53-60 which returns 500 because the message doesn't contain 'not found'; (2) an unknown filter `parameter` — validateFilters' zod parse (query-validation.ts:347) throws ZodError inside pdfReportService.fetchReportData (line 66), which propagates to the same 500; (3) an invalid regex pattern (e.g. value ['(']) — getFilterStatement.ts:147-151 throws 'Invalid regex pattern...', also becoming a 500. Only missing/mistyped top-level query keys get a 400 (generatePdfReport.ts:28-33).
- **Code:** `server/src/api/analytics/generatePdfReport.ts:42`, `server/src/api/analytics/generatePdfReport.ts:53-60`, `server/src/services/pdfReports/pdfReportService.ts:66`, `server/src/api/analytics/utils/getFilterStatement.ts:147-155`, `server/src/api/analytics/utils/query-validation.ts:337-348`
- **Docs:** `docs/content/docs/api/getting-started.mdx`, `docs/content/docs/api/sites/export-pdf.mdx`


**[dashboards-custom-query]**

### [LOW] Custom-query validator falsely rejects valid ClickHouse constructs (ARRAY JOIN, IN tuple(...)) that only read scoped_events

- **Kind:** unexpected-behavior
- **Expected:** The query editor and dashboard cards advertise 'ClickHouse SQL executed against scoped_events' (shared/src/dashboards.ts:51, AI system prompt 'Use ClickHouse syntax'). A query that reads only scoped_events, such as `SELECT k, count() FROM scoped_events ARRAY JOIN mapKeys(url_parameters) AS k GROUP BY k`, should run.
- **Actual:** validateScopedQuery treats the identifier after any JOIN keyword as a table reference, so ARRAY JOIN / LEFT ARRAY JOIN followed by a column or function expression is rejected with the misleading error 'Queries can only read from scoped_events'. Likewise `country IN tuple('US','GB')` is rejected because collectInTableReferences reads 'tuple' as a table name. Verified by executing the validator: `SELECT k, count() FROM scoped_events ARRAY JOIN mapKeys(url_parameters) AS k GROUP BY k` → "Queries can only read from scoped_events"; `SELECT count() FROM scoped_events WHERE country IN tuple('US','GB')` → same error. This affects POST /organizations/:orgId/analytics/query (400), POST /sites/:siteId/dashboards/run-card (400), and the AI generator, which returns 422 'Generated query failed validation' whenever the LLM emits ARRAY JOIN (a natural choice for the url_parameters Map column its own schema prompt advertises).
- **Code:** `server/src/api/analytics/utils/customQueryValidation.ts:285-329`, `server/src/api/analytics/utils/customQueryValidation.ts:331-344`, `server/src/api/analytics/utils/customQueryValidation.ts:402-407`, `server/src/api/analytics/runCustomQuery.ts:28-31`, `server/src/api/analytics/runDashboardCardQuery.ts:51-54`, `server/src/api/analytics/generateCustomQuery.ts:215-228`


**[dashboards-custom-query]**

### [LOW] Dashboard time-series cards bucket in UTC while the range is scoped and labeled in the user's timezone, misattributing day buckets

- **Kind:** unexpected-behavior
- **Expected:** The dashboards list page promises cards 'scoped to the site time range' (page.tsx:52). A day-bucketed card for the selected local-timezone range should produce one point per local calendar day, labeled with that day, matching the main analytics charts.
- **Actual:** run-card substitutes {{bucket}} with a plain interval (runDashboardCardQuery.ts:48-49) and the curated examples bucket with toStartOfInterval(timestamp, INTERVAL 1 DAY) on the raw UTC timestamp (examples.ts:162), while the outer time scope uses local-timezone day boundaries via getTimeStatement (runDashboardCardQuery.ts:59-67, utils.ts:53-64). The client then parses bucket starts as UTC (dashboards/utils.ts:160 `DateTime.fromSQL(value, { zone: 'utc' })`) and formats tick/tooltip labels after setZone(getTimezone()) (utils.ts:214). For tz=America/New_York, selecting the single day 'June 3' scopes events to Jun 3 04:00–Jun 4 04:00 UTC, which falls into UTC day buckets Jun 3 00:00 and Jun 4 00:00; Jun 3 00:00 UTC renders as Jun 2 20:00 local, so the chart shows points labeled 'Jun 2' and 'Jun 3' for a one-day 'June 3' view, and every daily point aggregates a 20:00–20:00 local window rather than the local calendar day.
- **Code:** `server/src/api/analytics/runDashboardCardQuery.ts:48-49`, `server/src/api/analytics/runDashboardCardQuery.ts:59-74`, `client/src/app/[site]/dashboards/examples.ts:162-166`, `client/src/app/[site]/dashboards/utils.ts:158-163`, `client/src/app/[site]/dashboards/utils.ts:204-218`, `client/src/app/[site]/dashboards/components/charts/DashboardLineChart.tsx:49-53`


**[dashboards-custom-query]**

### [LOW] PDF export plan gating is client-side only; the server enforces no subscription check and public sites allow anonymous Puppeteer-backed generation

- **Kind:** unexpected-behavior
- **Expected:** The client hides 'Export as PDF Report' for free and AppSumo plans (ExportButton.tsx:82), implying PDF export is a paid feature.
- **Actual:** GET /sites/:siteId/export/pdf is registered with the publicSite preHandler (index.ts:342 → allowPublicSiteAccess) and neither the handler nor pdfReportService checks the site owner's plan, so any free-plan user can generate PDFs by calling the endpoint directly, and for sites marked public any unauthenticated visitor can too. Each request launches a fresh headless Chromium instance (pdfReportService.ts:465 puppeteer.launch per call) plus 11 parallel ClickHouse queries.
- **Code:** `client/src/app/[site]/components/SubHeader/Export/ExportButton.tsx:82`, `server/src/index.ts:342`, `server/src/api/analytics/generatePdfReport.ts:20-62`, `server/src/lib/auth-middleware.ts:153-177`, `server/src/services/pdfReports/pdfReportService.ts:464-490`


**[dashboards-custom-query]**

### [LOW] The per-site Query page runs custom SQL org-wide: scoped_events includes every site in the organization, not the site in the URL

- **Kind:** unexpected-behavior
- **Expected:** The query editor lives at /[site]/query inside a single site's navigation, alongside dashboards whose scoped_events is limited to that one site (runDashboardCardQuery.ts:70-74). A user writing `SELECT count() FROM scoped_events` there would expect counts for the current site.
- **Actual:** The page resolves the site's organizationId (page.tsx:22-23) and posts to /organizations/:orgId/analytics/query; the server builds scoped_events as `PREWHERE site_id IN {siteIds}` with ALL sites the user can access in that org (runCustomQuery.ts:33-47). Manually written queries therefore aggregate traffic across every org site with no UI indication; only AI-generated queries get a `WHERE site_id = X` nudge via the system prompt (generateCustomQuery.ts:128-130), so the same question typed as SQL vs. asked of the AI returns different numbers. The identically named scoped_events table has different scoping semantics between the Query page and dashboard cards.
- **Code:** `client/src/app/[site]/query/page.tsx:21-23`, `client/src/app/[site]/query/page.tsx:167`, `server/src/api/analytics/runCustomQuery.ts:33-47`, `server/src/api/analytics/generateCustomQuery.ts:128-130`


---

## Refuted during verification


- **[funnels]** Funnel analyze corrupts page-step regexes: backslash escapes are stripped by ClickHouse, giving wrong visitor counts or 500s, and disagreeing with step-sessions
  - Why refuted: Re-traced the full path (index.ts:303-304 routes, getFunnel.ts:63-67/201-208, utils.ts:124-139, getFunnelStepSessions.ts:85, both cited docs) and then empirically tested the exact SQL literals both handlers generate against a live clickhouse-server:25.4.2 — the precise version pinned in the repo's docker-compose.yml. The finding's core premise ("in a ClickHouse single-quoted literal an unknown escape \c collapses to c") is false: ClickHouse's parser deliberately PRESERVES the backslash for unrecognized escapes (hex('\.') = 5C2E), specifically so LIKE/regex escapes survive. Every concrete scenario refuted: match('/pricingXhtml','^/pricing\.html$')=0 (no overcount) while the real path matches; match('/foo(bar)','^/foo\(bar\)$')=1 and match('/foobar',...)=0 (no zero-visitor bug); match('/c++','^/c\+\+$')=1 with no RE2 error (no 500). And since '\.' and '\\.' decode to the identical string, analyze and step-sessions execute the same regex — no divergence for any of the claimed metacharacters. The only real discrepancy is for step values containing a literal backslash (\\ is a recognized escape, so getFunnel yields regex \b word-boundary vs step-sessions' correct \\b), but browser-collected pathnames cannot contain raw backslashes (URL spec normalizes \ to /), making that an unreachable micro edge case, not the reported high-severity break.


- **[flags-experiments]** Experiment results silently drop pathname, entry/exit page, event_name and feature-flag filters that are active on the page
  - Why refuted: Re-traced the full path myself. The mechanical claims hold (useExperiments.ts:27 uses getFilteredFilters(GOALS_PAGE_FILTERS); filterGroups.ts:41 omits pathname/entry_page/exit_page/event_name/feature_flag; store.ts:521-524 drops non-listed filters; the server route at index.ts:329 with getFilterStatement.ts would honor them if sent). But the finding's core assertion — filters 'remain visibly active in the global filter bar but are silently excluded' — is refuted by the UI: experiments/page.tsx:39 passes availableFilters={GOALS_PAGE_FILTERS} to SubHeader, and SubHeader/Filters/Filters.tsx:34,47-53,99-108 renders any non-applicable active filter as a grayed-out disabled pill with a tooltip reading 'Filter not active for this page'. The finding's own expected behavior ('or to be told it isn't applied') is exactly what happens. Furthermore, NewFilterButton/ParameterPopover prevent adding these filters on the experiments page at all, and feature_flag:* filters cannot be created anywhere in the client UI (zero 'feature_flag' references in client/src; no FilterOptions entry in const.tsx), making that sub-scenario unreachable. Given the visible disabled state, the docs line 'Results respect the global date range and filters applied on the page' (experiments.mdx:125) is consistent with actual behavior — enabled filters are respected and non-applicable ones are explicitly marked not active, so there is no genuine docs mismatch.


---

## Coverage notes per area


### overview (12 candidate(s))

Fully traced end-to-end (docs -> route registration in server/src/index.ts:274-286 -> preHandlers resolveSiteId/allowPublicSiteAccess in server/src/lib/auth-middleware.ts -> handler -> Zod validation in server/src/api/analytics/utils/query-validation.ts -> ClickHouse SQL -> response construction -> client hooks/components): GET /overview (getOverview.ts), /overview/time-series (getOverviewBucketed.ts), /overview-lite (lite/getOverviewLite.ts), /overview-bucketed-lite (lite/getOverviewBucketedLite.ts), /metric (getMetric.ts), /metric-lite (lite/getMetricLite.ts), /page-titles (getPageTitles.ts), /live-user-count (getLiveUsercount.ts), /has-data (sites/getSiteHasData.ts). Client consumers verified: client/src/api/analytics/endpoints/{overview.ts,types.ts,misc.ts}, hooks/{useGetOverview,useGetOverviewBucketed,useGetMetric,useGetPageTitles,useGetLiveUserCount}.ts, and the main dashboard components (MainSection/Chart.tsx, OverviewLite.tsx, page.tsx). Undocumented in docs/content/docs/api: /overview-lite, /overview-bucketed-lite, /metric-lite, /has-data — audited for broken/unexpected behavior only. /has-data and /live-user-count traced with no defects beyond the shared auth-status-code mismatch (live-user-count also 500s on a non-numeric `minutes` value since it has no try/catch, but the parameter defaults correctly when absent). Not verifiable in this environment: no local ClickHouse instance was reachable (localhost:8123 refused), so SQL-level behaviors (Float64-vs-'' comparison exception for parameter=lat/lon, WITH FILL grid alignment, DateTime JSON rendering/timezone propagation, validity of countIf(DISTINCT ...)) rest on code traces plus documented ClickHouse semantics rather than live execution; the two findings that depend on them (lat/lon 500, past-minutes fill misalignment) are marked low severity accordingly. Also noted but NOT reported as an in-scope finding: the events CREATE TABLE in server/src/db/clickhouse/clickhouse.ts:44-76 lacks columns the tracker inserts and queries reference (timezone, tag, identified_user_id, perf metrics, ip, import_id) with no ALTER in-repo — schema appears to be managed out-of-band, so the documented `timezone` filter parameter could not be verified against a live schema. The docs' Filter Types table omits six implemented types (starts_with, ends_with, is_null, is_not_null, greater_than_or_equal, less_than_or_equal) — undocumented extras, not defects.


### sessions-users (13 candidate(s))

Fully traced end-to-end (docs -> route registration in server/src/index.ts:288-300 -> auth preHandler (publicSite = resolveSiteId + allowPublicSiteAccess) -> handler -> ClickHouse/Postgres SQL -> response -> client hook/page): GET /sessions (getSessions.ts), GET /sessions/:sessionId (getSession.ts), GET /sessions/locations (getSessionLocations.ts), GET /users (getUsers.ts), GET /users/:userId (getUserInfo.ts), GET /users/session-count (getUserSessionCount.ts), GET /user-traits/keys, /user-traits/values, /user-traits/users (getUserTraits.ts). Shared plumbing traced: getTimeStatement/processResults/enrichWithTraits (utils/utils.ts), getFilterStatement + Zod validation (utils/getFilterStatement.ts, utils/query-validation.ts), sessionAttribution.ts, ClickHouse schema (db/clickhouse/clickhouse.ts) including git history of the removed ensureEventsColumns migration, and client consumers (client/src/api/analytics/endpoints/{sessions,users,userTraits}.ts, hooks useGetUserSessions/useGetUsers, SessionCard, user/[userId]/page.tsx, filterGroups.ts). The three user-traits endpoints matched their docs (defaults, response shapes, required-param 400s) apart from the fresh-install schema issue; no independent findings there except a theoretical page-instability from ORDER BY user_count ties, which I did not report. Undocumented but working server params noted: sessions accepts session_id/min_pageviews/min_events/min_duration; users accepts search/search_field — audited for breakage only (none found beyond reported items). Not verified against a live system: I could not execute queries against a running ClickHouse/Postgres, so findings about ClickHouse error behavior (unknown-identifier 500s, empty-aggregate row for the dead 404, JSONEachRow DateTime serialization) rest on the schema DDL in the repo, SQL semantics, and corroborating client code (e.g. DateTime.fromSQL parsing) rather than observed responses. The ClickHouse identifier-ambiguity question for unqualified session_id in getSessions' outer JOIN (both join sides project session_id) was left unreported as analyzer-version-dependent. Rate limiting (429) and cloud plan gating of API keys were out of scope and untested.


### errors (10 candidate(s))

Fully traced end-to-end: (1) GET /api/sites/:siteId/errors/names, (2) GET /api/sites/:siteId/errors/events, (3) GET /api/sites/:siteId/errors/time-series. For each: docs (docs/content/docs/api/errors/{names,events,time-series}.mdx, getting-started.mdx common parameters, feature-guides/errors.mdx) -> route registration (server/src/index.ts:282-284, publicSite preHandler at index.ts:176) -> auth chain (resolveSiteId + allowPublicSiteAccess in server/src/lib/auth-middleware.ts, checkApiKey in auth-utils.ts:253+ — Bearer header and api_key query param both supported as documented) -> handlers (server/src/api/analytics/getErrorNames.ts, getErrorEvents.ts, getErrorBucketed.ts) -> shared utils (getTimeStatement/processResults/TimeBucketToFn in utils/utils.ts, getFilterStatement.ts, Zod schemas in utils/query-validation.ts) -> ClickHouse SQL construction -> response shaping -> client consumption (client/src/api/analytics/endpoints/errors.ts, hooks/errors/*, app/[site]/errors/page.tsx, ErrorListItem.tsx, ErrorDetails.tsx, ErrorSparklineChart.tsx) and ingestion of error events (services/tracker/trackEvent.ts error schema, pageviewQueue.ts insert). Not verified against a live system: I could not execute queries against a running ClickHouse instance, so the WITH FILL misalignment finding rests on ClickHouse's documented WITH FILL semantics plus the contrast with the bucket-aligned implementation in getOverviewBucketed.ts (same repo, same purpose); likewise the 500-status findings rest on the absence of any fastify setErrorHandler in server/src (verified by grep) and Fastify's default error behavior. Cloud rate-limiting (429 per plan tier) was not exercised. Deliberately not reported: server returns extra undocumented fields on /errors/events (page_title, referrer, operating_system_version, city, region) — additive, non-breaking; time-series accepts undocumented bucket values (ten_minutes, fifteen_minutes, year); feature-guide items 'Affected Pages' and 'Browser & Device' are arguably satisfied per-event in the expanded details view, so only the clear-cut 'First/Last Seen' and 'Affected Users' absences were reported; the unused non-paginated client hook useGetErrorNames mistypes the unwrapped array response as ErrorNamesPaginatedResponse, but it has no call sites so no user-facing effect. Filter parameters were checked against the documented list (all documented FilterParameters exist in baseFilterParamSchema; filters on error endpoints are injected into the same WHERE as type='error' with AND semantics as documented).


### events (8 candidate(s))

Fully traced end-to-end (docs contract → route registration in server/src/index.ts:290-292,330-332 → publicSite preHandler (resolveSiteId + allowPublicSiteAccess) → handler → ClickHouse SQL → response construction → client hooks and events-page components): GET /api/sites/:siteId/events (getEvents.ts, both since_timestamp and cursor modes, incl. enrichWithTraits Postgres join), /events/time-series (getEventBucketed.ts), /events/count (getSiteEventCount.ts), /events/names (getEventNames.ts), /events/properties (getEventProperties.ts), /events/outbound (getOutboundLinks.ts), plus shared utils (getTimeStatement, getFilterStatement, query-validation.ts, processResults) and client consumers (client/src/api/analytics/endpoints/events.ts, hooks/events/*, EventLog/OutboundLinksList/EventsChart components). Verified against docs/content/docs/api/events/*.mdx, api/getting-started.mdx, api/live-feed.mdx, and the four feature-guide pages. Could NOT verify without a live ClickHouse (none running locally): (1) whether toDateTime64({since_timestamp:String},3) accepts fully ISO-8601 'Z'-suffixed inputs as list.mdx implies — the dashboard only ever sends 'YYYY-MM-DD HH:mm:ss' round-tripped from responses, so the documented ISO input path is untested and may 500; (2) whether the `props != '{}'` predicate in getEventProperties.ts:45 (JSON column compared to a String literal on ClickHouse 25.4) is accepted — the dashboard exercises this endpoint routinely so it presumably works, but I could not prove it. Bucketing/timezone rendering of toDateTime(toStartOfX(toTimeZone(...))) was reviewed and looks consistent with the documented local-time bucket output but was not executed. Docs-side gap noted but not filed as a finding (docs defect, not endpoint behavior): /docs/api/export-events is linked from getting-started.mdx:35, live-feed.mdx:193 and weekly-report.mdx:265 but no such page exists under docs/content/docs/api/. Undocumented hard result caps (names LIMIT 1000, properties LIMIT 500, outbound LIMIT 1000, list poll LIMIT 500 — only the last is documented) were not filed as findings. track-events.mdx/autocapture.mdx/tagging.mdx mostly describe tracking-script (ingestion) behavior outside the six GET endpoints; only their query-side promises (tag filtering, event types, outbound url property) were audited. Cloud API-key rate limits (20/200 rpm) were not verifiable in this environment.


### funnels (12 candidate(s))

Fully traced end-to-end (docs -> route registration in server/src/index.ts:301-306 (under /api prefix, index.ts:470) -> auth preHandlers (publicSite/authSite, index.ts:176-177; auth-middleware.ts; auth-utils.ts) -> handlers in server/src/api/analytics/funnels/* -> ClickHouse SQL (getTimeStatement, getFilterStatement, patternToRegex in api/analytics/utils/*) or Drizzle/Postgres (funnels table, db/postgres/schema.ts:114-121) -> client endpoints (client/src/api/analytics/endpoints/funnels.ts), hooks (hooks/funnels/*), and UI (app/[site]/funnels/components/Funnel.tsx, FunnelRow.tsx, SessionsList/SessionCard)): GET /api/sites/:siteId/funnels, POST /api/sites/:siteId/funnels (create/update), DELETE /api/sites/:siteId/funnels/:funnelId, POST /api/sites/:siteId/funnels/analyze, POST /api/sites/:siteId/funnels/:stepNumber/sessions. Docs read: docs/content/docs/api/funnels/{list,create,delete,analyze,step-sessions}.mdx, docs/content/docs/(docs)/funnels.mdx, docs/content/docs/api/getting-started.mdx (common time/filter parameters), and the funnel-dropoff guide (its examples correctly include time_zone). Not verified by execution: I could not run queries against a live ClickHouse/Postgres, so ClickHouse-side behaviors are asserted from documented/known semantics rather than observed: (a) single-quoted string literals collapse unknown escapes \\c to c (basis of the analyze regex-escaping finding; corroborated by the divergent SqlString.escape usage in the sibling handler), (b) JSONEachRow serializes NaN as null by default, (c) unknown-identifier failures for the filter findings follow directly from the CTE column lists vs the events DDL in server/src/db/clickhouse/clickhouse.ts:43-84 (events gains identified_user_id/ip/timezone/tag columns via deployment-time DDL outside this repo's init code — inferred from the insert payload in services/tracker/pageviewQueue.ts:73-113 — but has no utm_* columns anywhere). The (docs)/funnels.mdx UI claims that DO hold were verified in code: wildcard semantics (* / **) in patternToRegex, per-step hostname and multi-property filters (ANDed), Reached/Dropped tab step-number offset (client passes stepNumber-1 for dropped, matching server semantics), and dropped mode returning [] for the final step. The funnels list response's undocumented extra fields (configuration, conversionRate, totalVisitors — the latter two always null because nothing ever writes data.lastResult) were noted but not reported as findings since docs don't promise them and the UI ignores them.


### goals (8 candidate(s))

Fully traced end-to-end (docs → route registration server/src/index.ts:307-312 under the /api prefix (index.ts:470) → preHandlers → handler → Postgres/ClickHouse SQL → client hooks → page components): GET /api/sites/:siteId/goals (getGoals.ts), GET /goals/time-series (getGoalTimeSeries.ts + goalConditions.ts), GET /goals/:goalId/sessions (getGoalSessions.ts), POST /goals (createGoal.ts), PUT /goals/:goalId (updateGoal.ts), DELETE /goals/:goalId (deleteGoal.ts). Auth verified: GETs use publicSite (resolveSiteId + allowPublicSiteAccess — session, public site, x-private-key, or API key; auth-middleware.ts:153-177), writes use authSite (requireSiteAccess, auth-middleware.ts:91-117); the docs' Bearer-API-key examples work for the write endpoints because attachApiKeyUser sets request.user (auth-middleware.ts:27-31) and the handlers' in-body getUserHasAccessToSite honors req.user.id (auth-utils.ts:45-47). Verified as matching docs: pagination/sort validation and meta on the list endpoint (page_size max 100, sort whitelist, defaults), create/update Zod validation incl. the eventPropertyKey/eventPropertyValue pairing rule, delete/update 404-vs-403 goal-vs-site checks, goal_ids parsing (comma list and JSON array) with empty→{data:[]}, bucket validation with hour default, per-bucket conversion_rate ≤ 1 (numerator and denominator draw from the same filtered event set), wildcard regex construction (patternToRegex: * → [^/]+ single segment, ** → .*, anchored), and filters application on list + time-series. Not verified (requires a live ClickHouse, so not reported as findings): (1) whether ORDER BY session_end DESC inside the AggregatedSessions CTE is guaranteed to survive the outer LIMIT/OFFSET under multi-threaded execution (ClickHouse does not formally guarantee subquery order — could make goal-session pagination unstable); (2) legacy numeric eventPropertyValue matching uses toFloat64(JSONExtractString(props, key)), and JSONExtractString returns '' for JSON-number values, so numeric property goals likely never match (or error) when props store real JSON numbers — depends on how props are serialized at ingest and CH short-circuit settings. Also noted: the goal config returned by the list endpoint includes the propertyFilters array that the UI writes, but list.mdx's GoalConfig table does not document it (docs gap, not a behavioral defect). The DisabledOverlay 'basic' plan gate on the goals page and cloud rate limiting were out of scope and not exercised.


### journeys-retention (10 candidate(s))

Fully traced end-to-end: (1) GET /api/sites/:siteId/journeys — docs (docs/content/docs/api/insights/journeys.mdx, feature-guides/journeys.mdx, api/getting-started.mdx common params) → route registration (server/src/index.ts:302, /api prefix at index.ts:470) → publicSite preHandler chain (resolveSiteId + allowPublicSiteAccess, server/src/lib/auth-middleware.ts, auth-utils.ts:357-383) → handler server/src/api/analytics/getJourneys.ts including stepFilters Zod schema, patternToRegex, getTimeStatement (utils/utils.ts), validateTimeStatementParams/validateFilters (utils/query-validation.ts), getFilterStatement (utils/getFilterStatement.ts) and the full ClickHouse SQL → client consumption (client/src/api/analytics/endpoints/misc.ts fetchJourneys, endpoints/types.ts toQueryParams, api/utils.ts buildApiParams/authedFetch, hooks/useGetJourneys.ts, app/[site]/journeys/page.tsx, SankeyDiagram.tsx, [privateKey] re-export, api-playground endpointConfig). (2) GET /api/sites/:siteId/retention — same auth chain (index.ts:285) → server/src/api/analytics/getRetention.ts (full SQL: UserFirstPeriod/PeriodActivity/CohortRetention/CohortSize CTEs, processRetentionData) → client (fetchRetention, useGetRetention, app/[site]/retention/page.tsx, RetentionChart.tsx). Verified route paths/methods/defaults/ranges (steps 2-10 default 3, limit 1-500 default 100, mode day|week default week, range 7-365 default 90) and response shapes (journeys[]{path,count,percentage}; data{cohorts,maxPeriods,mode,range}) match docs. site_id UInt16 in retention matches the ClickHouse schema (db/clickhouse/clickhouse.ts:45), so not flagged. Not verified: no live server/ClickHouse run — all findings are from static code tracing; ClickHouse dateDiff('week') between Monday-aligned dates and groupArray ordering under subquery ORDER BY were checked against ClickHouse documented semantics and not flagged. The client Sankey visualization and retention grid rendering have no API-doc coverage beyond the feature guides, so they were audited for broken/unexpected behavior only (one tooltip inconsistency reported).


### performance (9 candidate(s))

Fully traced end-to-end: (1) GET /api/sites/:siteId/performance/overview, (2) .../performance/time-series, (3) .../performance/by-dimension — each from route registration (server/src/index.ts:336-338) through the publicSite preHandler chain (resolveSiteId + allowPublicSiteAccess, server/src/lib/auth-middleware.ts:153-176; auth behavior — Bearer API key, session, or public-site access with 401/403/429 — matches the docs contract), through query construction (getTimeStatement/getFilterStatement/validate* in server/src/api/analytics/utils), the ClickHouse SQL, and response construction; and on the client through endpoints/performance.ts, the three useGetPerformance* hooks, and PerformanceOverview/PerformanceChart/PerformanceTable/PercentileSelector components. Also traced the /api/metrics.js route and the full web-vitals pipeline: analytics-script (webVitals.ts collector, tracking.ts trackWebVitals) → POST /track zod schema (trackEvent.ts performance variant) → pageviewQueue ClickHouse insert → events table schema (db/clickhouse/clickhouse.ts), including git history for the removed ensureEventsColumns migration. Filters logic (getFilterStatement) was reviewed for the documented filter types and found consistent for these endpoints. Not verified live: no ClickHouse instance was available locally, so two claims rest on ClickHouse documented semantics rather than execution — (a) toTimeZone(timestamp, NULL) rejecting a non-constant-string timezone (finding 3), and (b) UNKNOWN_IDENTIFIER on missing lcp/... columns for fresh installs (finding 1; the column absence itself is verified from the DDL and git history). WITH FILL gap-row typing (Nullable quantile columns filling as NULL vs 0) could not be empirically confirmed, so no finding was filed on fill-row rendering. The /api/metrics.js endpoint has no docs under docs/content/docs/api/performance; its only documentation is the proxy guide, which was used for that finding.


### bots (8 candidate(s))

Fully traced end-to-end: GET /api/sites/:siteId/bots/overview, /bots/time-series, and /bots/by-dimension — from route registration (server/src/index.ts:339-341) through the publicSite preHandler chain (resolveSiteId + allowPublicSiteAccess, server/src/lib/auth-middleware.ts:37-48,153-177, including API-key, session, public-site and private-key paths), the query builders (server/src/api/analytics/bots/{getBotOverview,getBotTimeSeries,getBotDimension}.ts and bots/utils.ts), the shared time/filter validation (api/analytics/utils/utils.ts, query-validation.ts), and the ClickHouse schemas for events and bot_events (db/clickhouse/clickhouse.ts:44-127). Client consumption traced through client/src/api/analytics/endpoints/bots.ts, hooks/bots/* (response re-wrapping in {data} verified consistent with component access patterns), BotsOverview/BotChart/BotSection/BotMetadata components, and the API playground config — no client/server contract mismatches found: response field names/types match, BOT_AVAILABLE_FILTERS exactly matches the server's BOT_FILTER_PARAMETERS, only valid dimensions are requested, and non-filterable dimensions (asn_org, bot_category, matched_ua_pattern) are correctly marked filterable=false. The bot-detection.mdx ingestion claims were spot-checked against services/tracker/botBlocking/index.ts, botEventQueue.ts, and trackEvent.ts: blockBots gating, trusted server-side (API-key) bypass, hosting-ASN-as-supporting-evidence-only, multi-layer recording, exclusion of bot events from the events table/session pipeline, and bot event record contents all match the docs (except the mobile-site layer skip, reported). Not verified by execution: everything here is static code tracing — no live ClickHouse queries were run, so runtime-only behaviors (WITH FILL boundary/timezone alignment, which mirrors the battle-tested canonical getOverviewBucketed implementation; FixedString(2) country serialization; the documented cloud rate-limit numbers in checkApiKey) were checked by code reading only. Filter-type coverage beyond the documented 8 types (starts_with/ends_with/is_null/etc.) exists in the bot filter builder as undocumented extras and was not treated as a defect.


### session-replay (8 candidate(s))

Fully traced end-to-end: (1) GET /api/sites/:siteId/session-replay/list — docs (list.mdx, getting-started.mdx) -> route index.ts:348 -> publicSite preHandlers (resolveSiteId, allowPublicSiteAccess in lib/auth-middleware.ts / auth-utils.ts) -> getSessionReplays.ts -> SessionReplayQueryService.getSessionReplayList (ClickHouse SQL incl. getTimeStatement/getFilterStatement) -> enrichWithTraits (Postgres userProfiles) -> client fetchSessionReplays/useGetSessionReplays/ReplayList. (2) GET .../session-replay/:sessionId — events.mdx -> index.ts:349 -> getSessionReplayEvents.ts -> service (metadata FINAL query, events query, R2 batch reconstruction, processResults numeric coercion which converts event_type strings to the documented numeric `type`) -> client useGetSessionReplayEvents. (3) DELETE .../session-replay/:sessionId — delete.mdx -> index.ts:350 authSite/requireSiteAccess -> deleteSessionReplay.ts -> service delete (R2 keys + two ClickHouse DELETEs); 404-when-missing and {success:true} match docs. (4) POST /api/session-replay/record/:siteId — no API docs exist for it (audited for broken/unexpected only) -> recordSessionReplay.ts (Zod schema, exclusion checks, usage limits) -> SessionReplayIngestService (events insert + ReplacingMergeTree metadata upsert) plus the tracking-script producer (server/public/script-full.js) and CORS exemption (lib/cors.ts:87). (5) GET /api/replay.js — index.ts:266 sendFile of rrweb.min.js which exists in server/public with fastifyStatic rooted there; script-full.js loads `${analyticsHost}/replay.js` consistently. Not verifiable statically: runtime ClickHouse behavior (e.g. JSON number->LowCardinality(String) coercion when inserting rrweb numeric event types, NaN query-param serialization details) — no live DB in this audit; conclusions there are based on code reading. Judgment calls not reported as findings: delete.mdx's 'requires site write access' maps to requireSiteAccess (any org member or any valid org API key regardless of role) — Rybbit has no read-only role, so no concrete mismatch; session-level filter subqueries (event_name/channel/entry_page/exit_page) are built without site_id scoping because getSessionReplayList calls getFilterStatement without siteId (sessionReplayQueryService.ts:30) — correctness is preserved by UUID session ids, so it is a performance concern only and excluded per instructions; resolveSiteId only resolves string identifiers longer than 4 chars, so a hypothetical <=4-char site identifier would 500, but real site identifiers exceed that length.


### flags-experiments (10 candidate(s))

Fully traced end-to-end: GET/POST /sites/:siteId/feature-flags and PUT/DELETE /sites/:siteId/feature-flags/:flagId (server/src/api/featureFlags/index.ts + schemas.ts, Drizzle writes, ClickHouse stats query, client endpoints/hooks and feature-flags page components); POST /sites/:siteId/feature-flags/evaluate (auth, server runtime — including requireSiteAccess/checkApiKey Bearer-key path, resolveClientIp/geolocation/UA-derived context, userProfiles trait loading, evaluator service with bucketing/condition sets/variants/remote config, response shape vs the documented assignment fields — all documented response fields and reason values are implemented); POST /site/:siteId/feature-flags/evaluate (public, client runtime — traced from the tracking script config.ts/tracking.ts including visitorId stickiness via localStorage, exposure event emission, feature_flags map attachment to events, and ingestion via trackEvent.ts/pageviewQueue.ts into the ClickHouse feature_flags Map column); GET/POST /sites/:siteId/experiments, PUT/DELETE /sites/:siteId/experiments/:experimentId (schemas, reference validation, unique flag-per-experiment constraint, status timestamps — verified on zod 3.24.4 that .partial() does NOT resurrect the status default, so partial updates cannot accidentally reset status); GET /sites/:siteId/experiments/:experimentId/results (exposure and assignment-fallback ClickHouse queries, goal condition builder, time/filter statement builders, buildExperimentResults, client confidence math in experimentHelpers.ts and ExperimentResultsPanel). Auth preHandlers (resolveSiteId, requireSiteAccess, requireSiteAdminAccess) verified against route registrations at server/src/index.ts:319-329; the documented Bearer API-key auth for the server evaluate endpoint works as documented. Evaluator unit tests pass (9/9). Not verified: no live ClickHouse/Postgres was run, so SQL behavior (e.g. LEFT JOIN default-value semantics assumed with join_use_nulls=0 for the last_goal_at >= exposed_at condition, JSONEachRow 64-bit-int-as-string handling — mitigated by processResults numeric coercion) is from static analysis only; cloud proxy mapping of the documented /api prefix to these routes was assumed. Docs coverage note: only the server evaluate endpoint and the dashboard behavior are documented — the feature-flag/experiment CRUD REST APIs, the public /site/:siteId/feature-flags/evaluate endpoint, and the results endpoint have no API docs pages, so those were audited for correctness/consistency only per instructions.


### sites-config (9 candidate(s))

Fully traced end-to-end (docs contract -> route registration in server/src/index.ts:353-384 -> preHandler auth (resolveSiteId/allowPublicSiteAccess/requireSiteAccess/requireSiteAdminAccess/requireOrgAdminFromParams in server/src/lib/auth-middleware.ts) -> handler -> Drizzle/ClickHouse queries -> client hooks/components): GET /sites/:siteId (getSite.ts + client sites.ts/useSites.ts/SiteSettings.tsx), DELETE /sites/:siteId (deleteSite.ts + siteConfig.removeSite + FK audit in schema.ts and drizzle/0000 migration), PUT /sites/:siteId/config (updateSiteConfig.ts, Zod schema, ipUtils validation, siteConfig cache), PUT /sites/:siteId/move (moveSite.ts + applySiteMove.ts), GET is-public (getSiteIsPublic.ts), GET excluded-ips/-countries/-paths/-hostnames/-user-agents (getSiteExcludedIPs/Countries/getSiteExclusions.ts + client exclusions endpoints/hooks/managers), GET+POST private-link-config (getSitePrivateLinkConfig.ts/updateSitePrivateLinkConfig.ts + usePrivateLink/DashboardEmbedTab/ShareSite), GET /site/tracking-config/:siteId (getTrackingConfig.ts + analytics-script/config.ts consumer — contract matches), GET /sites/:siteId/embed-stats (getEmbedStats.ts + client /widget/[siteId]/route.ts + EmbedTab.tsx), POST /organizations/:organizationId/sites (addSite.ts + client addSite). Also traced the enforcement side of the filtering docs: trackEvent.ts exclusion chain (order IP->country->path->hostname->UA matches filter-traffic.mdx, 200-with-no-write matches, applies to all payload types in the discriminated union) and recordSessionReplay.ts (same checks for replay batches); glob/substring/case-insensitivity semantics verified against siteConfig.matchesGlob/isUserAgentExcluded and their unit tests (siteConfig.test.ts). Notes: (1) PUT /api/sites/:siteId (bare) is in the audit scope list but is neither a registered route nor documented — updates go through PUT /sites/:siteId/config; not a defect. (2) POST /organizations/:organizationId/sites, PUT /sites/:siteId/move, and GET /site/tracking-config/:siteId have no docs pages, so they were audited for correctness only. (3) Docs under-document real behavior in places I did not report as findings: get.mdx omits ~10 returned fields (type, embedEnabled, trackIp, trackInitialPageView, trackSpaNavigation, trackButtonClicks, trackCopy, trackFormInteractions), update-config.mdx omits many accepted body fields (name, type, embedEnabled, excludedPaths/Hostnames/UserAgents, tags, etc.); is-public/excluded-paths/-hostnames/-user-agents docs write the path param as :site instead of :siteId. (4) Could not verify at runtime (no server/DB started; static trace only): the exact pg text format of timestamp columns (asserted from drizzle mode:'string' semantics), and Fastify's precise 500 body for the addSite TypeError. (5) None of the in-scope endpoints accept the shared time/filter query parameters, so the getting-started common-parameter contract was only skimmed for auth/error-code claims; its '401 vs 403' table is loosely inconsistent with the middleware (missing credentials on site routes yield 403, not 401) but both codes are listed so it was not reported. (6) has-data and export-pdf endpoints/docs were out of scope and not audited.


### orgs-teams (12 candidate(s))

Fully traced end-to-end (route registration in server/src/index.ts -> preHandler definitions in server/src/lib/auth-middleware.ts + auth-utils.ts -> handler -> Drizzle/ClickHouse queries -> client hook/component): GET /api/organizations (getMyOrganizations, no preHandler, own auth via getUserIdFromRequest); GET+POST /organizations/:organizationId/sites (orgMember/orgAdminParams -> getSitesFromOrg/addSite -> client fetchSitesFromOrg/addSite in client/src/api/admin/endpoints/sites.ts); GET+POST /organizations/:organizationId/members and POST /organizations/:organizationId/users (listOrganizationMembers, addUserToOrganization, createUserInOrganization -> client admin/endpoints/organizations.ts); PUT /organizations/:organizationId/members/:memberId/sites (updateMemberSiteAccess -> client admin/endpoints/auth.ts); GET/POST/PUT/DELETE /organizations/:organizationId/teams[/:teamId] (listTeams/createTeam/updateTeam/deleteTeam -> client admin/endpoints/teams.ts + useTeams hooks + CreateEditTeamDialog); GET /org-event-count/:organizationId (getOrgEventCount -> fetchOrgEventCount -> useGetOrgEventCount -> UsageChart/EventUsageChart); GET /user/organizations and POST /user/account-settings (authOnly -> getUserOrganizations/updateAccountSettings -> client accountSettings.ts/AccountInner). Documented better-auth passthrough endpoints (POST /api/auth/organization/invite-member, remove-member, update-member-role, accept-invitation) were traced through better-auth 1.5.5 dist sources (crud-invites.mjs, adapter.mjs, access/statement.mjs) plus Rybbit's hooks in server/src/lib/auth.ts; team-on-accept behavior and multi-teamId support verified in that code. Undocumented-in-API-docs parts (POST users, PUT member sites, GET /user/organizations, POST /user/account-settings) were audited for broken/unexpected behavior only, per instructions. Not verified by execution: ClickHouse WITH FILL row output for non-UTC time_zone (reasoned from the generated SQL and ClickHouse fill semantics, not run against a live cluster), and exact better-auth response bodies for remove-member/update-member-role (shape taken from better-auth source, matches docs). One additional observation not filed as a finding because no doc promises it: requireAuth's API-key branch (auth-middleware.ts:60-67 + checkApiKey in auth-utils.ts:253-320) only validates keys when an organizationId/siteId param is in scope, so Bearer API keys always get 401 on GET /user/organizations and POST /user/account-settings even when valid — session-only in practice.


### public-api-auth (11 candidate(s))

FULLY TRACED: (1) POST /api/user/api-keys — route index.ts:410 (authOnly/requireAuth) -> createApiKey.ts -> getSubscriptionInner plan gating (cloud 403 for free/basic matches create.mdx) -> auth.api.createApiKey in @better-auth/api-key 1.5.5 -> Postgres apikey table; rate-limit constants verified (const.ts:28-30 = 60s window, 20 standard, 200 pro, matching getting-started.mdx). (2) The better-auth-served key routes documented in api-keys/*.mdx: GET /api/auth/api-key/list (query params organizationId/limit/offset/sortBy/sortDirection and {apiKeys,total,limit,offset} envelope all confirmed in plugin dist), POST /api/auth/api-key/update, POST /api/auth/api-key/delete ({success} confirmed), all mounted via index.ts:247 catch-all. (3) All seven preHandler chains (publicSite/authSite/adminSite/authOnly/adminOnly/orgMember/orgAdminParams, index.ts:176-182) and the full bearer/query api_key path: checkApiKey -> auth.api.verifyApiKey -> plugin validateApiKey, including the RATE_LIMITED error-code handshake producing 429, org-membership scoping, and the x-private-key / public-site fallbacks in getUserHasAccessToSitePublic. (4) Common time params through getTimeStatement + validateTimeStatementParams (non-bucketed) and getTimeStatementFill + validateTimeStatementFillParams (bucketed), exercised concretely against getOverview, getOverviewBucketed, and getSessions; date/datetime/past-minutes SQL bounds checked (end_date inclusive-day logic, exclusive end_datetime as documented, past-minutes computed in JS). (5) Filter pipeline: validateFilters Zod schemas vs the documented parameter list (all documented parameters exist in baseFilterParamSchema; city 'Region-City' concat, referrer domainWithoutWWW, dimensions concat, event_name/channel session-level subqueries, regex 500-char cap, lat/lon 0.001 tolerance all confirmed implemented). (6) Client consumption: useUserApiKeys hooks + ApiKeyManager.tsx (consistent with new {apiKeys} list envelope; client and server both on better-auth 1.5.5), and buildApiParams/toQueryParams (client always sends time_zone, which masks the overview/time-series NULL-timezone 500 from dashboard users). NOT VERIFIED / LIMITS: ClickHouse was not running locally, so the toTimeZone(...,NULL) failure and RE2-vs-JS regex rejection are asserted from generated SQL plus ClickHouse function semantics, not observed responses; better-auth plugin behavior was verified by reading the installed dist bundle (version 1.5.5), not by running the server; Stripe plan-name mapping inside getSubscriptionInner was not exercised. Undocumented-but-implemented extras noted without findings: filter types starts_with/ends_with/is_null/is_not_null/greater_than_or_equal/less_than_or_equal and the 'tag'/'feature_flag:*' parameters; non-bucketed endpoints accept datetime ranges without time_zone (docs claim it is required — lenient direction, folded into finding evidence); v1-migration.mdx contains only reverse-proxy guidance (verified /api prefix registration at index.ts:470 matches it; no other testable API claims). GET /api/organizations, though it appears in organizations/list.mdx, is registered without a preHandler and its handler-level auth belongs to the organizations audit area, so it was only checked for how it intersects the shared API-key path.


### tracking-ingestion (14 candidate(s))

Fully traced end-to-end: (1) POST /api/track — route registration (server/src/index.ts:466), Zod discriminated-union validation for all 9 event types, isTrustedServerSideIngestion/checkApiKey, resolveTrackingIdentity/resolveClientIp, checkBotBlocking (all 5 layers incl. botEventQueue divert), usage limit, IP/country/path/hostname/UA exclusions, createBasePayload + userIdService fingerprinting, sessionsService.updateSession (Redis + fallback), pageviewQueue batch insert into ClickHouse events (schema checked in server/src/db/clickhouse/clickhouse.ts). (2) POST /api/identify — identifyService validation, alias create/update, traits upsert with null-key removal, 30-day ClickHouse backfill. (3) GET /api/script.js — static serve (index.ts:265); audited via server/public/script-full.js and spot-verified the served minified script.js matches on the load-bearing behaviors (is_new_identify, page_title:document.title, _bs/_bsm, absence of data-track-spa). (4) GET /api/site/tracking-config/:siteId — handler (api/sites/getTrackingConfig.ts) plus both consumers: the browser script's parseScriptConfig mapping and the react-native SDK's fetchRemoteConfig. Also audited the react-native SDK (react-native/index.js) against react-native.mdx and the server contract — no mismatches found there (it sends anonymous_id on both /track and /identify, keeping fingerprints consistent). Not verifiable in this repo: the @rybbit/js web SDK and @rybbit/node SDK sources (docs sdks/web.mdx and sdks/node.mdx describe packages not present in the monorepo), so SDK-internal claims (init/cleanup/onPageChange, error-gating warnings, node constructor throwing on missing apiKey) could only be checked against the server contract, not their implementations; note node.mdx calls apiKey 'Required' while the server accepts keyless ingestion. better-auth's verifyApiKey rate-limit internals were trusted per its rateLimited flag rather than traced into the library. /api/track accepts none of the shared time/filter query parameters, so those contracts were read (getting-started.mdx) only for the auth and rate-limit sections. Session replay ingestion was traced only where the identify/clearUserId flow touches it, and the shared-state (Redis) hot path was reviewed but not exercised against a live instance — no runtime HTTP tests were performed, all findings rest on static traces plus targeted Node/zod/luxon runtime checks.


### imports (12 candidate(s))

Fully traced end-to-end: GET /api/sites/:siteId/imports (index.ts:370 -> adminSite preHandlers in lib/auth-middleware.ts -> api/sites/getSiteImports.ts -> services/import/importStatusManager.ts -> client useImport.ts/ImportManager.tsx), POST /api/sites/:siteId/imports (index.ts:371 -> createSiteImport.ts -> importQuotaManager/importQuotaTracker -> client), POST /api/sites/:siteId/imports/:importId/events (index.ts:372-376, 50MB bodyLimit -> batchImportEvents.ts -> mappers umami/simpleAnalytics/plausible -> ClickHouse insert -> client csvParser.ts/plausibleParser.ts), DELETE /api/sites/:siteId/imports/:importId (index.ts:377 -> deleteSiteImport.ts -> ClickHouse DELETE + Postgres delete -> client). Verified against docs/content/docs/api/imports/{list,create,events,delete}.mdx and docs/content/docs/(docs)/data-import.mdx; these endpoints take none of the shared time/filter query parameters, so the common-parameter docs were not applicable. Confirmed-correct doc promises: adminSite auth (admin/owner API key or session admin), free-plan 403 on cloud for all four endpoints, 429 on second concurrent create (single-process cloud), 50MB body limit, 400 when deleting a running import, 200-empty-body responses, and self-hosted unlimited window/quota/concurrency (ImportQuotaTracker.create returns Infinity/1900-01 and startImport always true when !IS_CLOUD). Version-dependent claims verified against installed packages: zod 3.24.4 uuid regex is loose (synthetic Plausible UUIDs pass), papaparse 5.5.3 worker path does not await async chunk callbacks. Could not verify (stated assumptions): Rybbit Cloud's actual CLUSTER_WORKERS setting (per-process lock finding applies only when >0 or across restarts); the runtime value of ClickHouse input_format_skip_unknown_fields (assumed default 1 for clickhouse-server 25.4.2, which determines whether fresh-install inserts silently drop import_id rather than fail outright — either way the delete endpoint 500s on fresh schemas); exact column sets of real Umami/Simple Analytics CSV exports (external to repo); and host Postgres/Node timezones for non-Docker self-hosted deployments (affects the Simple Analytics timezone and startedAt display findings). Did not audit the AI custom-query surface that references import_id (server/src/api/analytics/generateCustomQuery.ts) beyond noting it documents the column.


### gsc (9 candidate(s))

All six in-scope endpoints were fully traced end-to-end. GET /sites/:siteId/gsc/connect (index.ts:415 authSite -> connect.ts -> signGSCState in utils.ts -> client useConnectGSC/GSCManager/SearchConsole ConnectPrompt); GET /api/gsc/callback (index.ts:416 public -> callback.ts -> token exchange, getGSCProperties, Drizzle insert/update on gsc_connections, redirects -> client select-property page); GET /sites/:siteId/gsc/status (index.ts:417 publicSite -> status.ts -> useGetGSCConnection -> SearchConsole/GSCManager); GET /sites/:siteId/gsc/data (index.ts:420 publicSite -> getData.ts -> refreshGSCToken -> Google searchAnalytics API -> useGetGSCData -> SearchConsole/SearchConsoleDialog, including the shared buildApiParams/toQueryParams time plumbing); DELETE /sites/:siteId/gsc/disconnect (index.ts:418 authSite -> disconnect.ts -> useDisconnectGSC); POST /sites/:siteId/gsc/select-property (index.ts:419 authSite -> selectProperty.ts -> select-property page). Auth preHandlers (resolveSiteId, requireSiteAccess, allowPublicSiteAccess) and auth-utils helpers (getUserHasAccessToSite/getUserHasAdminAccessToSite/getUserHasAccessToSitePublic, getSitesUserHasAccessTo adminOnly semantics) were read in full. Documentation is minimal: GSC appears only in docs/content/docs/(docs)/site-settings.mdx (one sentence, Cloud tag) and the self-host-vs-cloud.mdx feature table (Cloud check / self-host minus — consistent with the IS_CLOUD gating in client main/page.tsx:92 and SiteSettings.tsx:104); it has no page under docs/content/docs/api, so most of the audit is against basic correctness plus the shared time-parameter contract in docs/content/docs/api/getting-started.mdx. Not verified at runtime: no live Google OAuth credentials were available, so Google-side responses (exact status codes for invalid siteUrl 'PENDING_SELECTION', refresh-token rotation behavior) are inferred from Google API semantics rather than observed; no findings depend on those specifics beyond 'Google rejects the request'. Minor unreported observations: the dimension query param has no runtime allowlist (server/src/api/gsc/types.ts declares a union but getData.ts:28 only checks presence, so any string is forwarded to Google and Google's 400 is proxied back with raw details — no crash); GSC country rows use alpha-3 codes converted via i18n-iso-countries with a raw-code fallback (getData.ts:76-78), so unmapped codes (e.g. GSC's 'zzz' unknown region) render without flag/name; the GSC section also ignores the dashboard filter bar entirely (client never sends filters to /gsc/data), which appears intentional since GSC data cannot be filtered by Rybbit dimensions.


### dashboards-custom-query (8 candidate(s))

Fully traced end-to-end: (1) GET/POST /api/sites/:siteId/dashboards, GET/PUT/DELETE /api/sites/:siteId/dashboards/:dashboardId — index.ts:313-317, authSite (resolveSiteId + requireSiteAccess in server/src/lib/auth-middleware.ts), handlers in server/src/api/analytics/dashboards/*, Zod schemas in dashboardSchema.ts, Drizzle `dashboards` table (schema.ts:123-131), client endpoints/hooks (client/src/api/analytics/endpoints/dashboards.ts, hooks/useDashboards.ts) and pages (app/[site]/dashboards/*). No contract mismatches found in CRUD itself: casing, response shapes ({success, dashboardId}), 404/403 site-ownership checks, and the 20-card limit (server dashboardSchema.ts:7 vs client utils.ts:18) all line up. (2) POST /sites/:siteId/dashboards/run-card — full trace through bucket substitution, validateScopedQuery, getTimeStatement, ClickHouse wrapper, and client useDashboardCard/DashboardCardView/chart utils. (3) POST /organizations/:organizationId/analytics/query and POST .../analytics/query/generate — orgMember preHandler, getSitesUserHasAccessTo (including restricted-member branch), customQueryValidation (also exercised at runtime via tsx for the false-rejection finding), OpenRouter error mapping, abort handling, and the client Query page. (4) GET /api/sites/:siteId/export/pdf — publicSite preHandler, generatePdfReport handler, pdfReportService (all 11 queries), PdfReportTemplate metric cards, getFilterStatement (exercised at runtime for the negative-filter finding), and the client ExportButton/exportPdf path. Documentation exists ONLY for export/pdf (docs/content/docs/api/sites/export-pdf.mdx + getting-started.mdx common parameters/errors); dashboards, run-card, and the org analytics query/generate endpoints are undocumented (roadmap.mdx lists 'Custom reports/dashboards' as a roadmap item only), so those were audited for broken/unexpected behavior per instructions. Not verified against a live system: actual ClickHouse runtime behavior (e.g., that toDateTime('') errors, order preservation through the LIMIT wrapper, PREWHERE-in-CTE acceptance) was reasoned from ClickHouse semantics, not executed; Puppeteer PDF rendering and OpenRouter calls were not executed; the ClickHouse server default timezone (which the past-minutes branch of getTimeStatement implicitly assumes is UTC via bare toDateTime) could not be confirmed from repo config — that is shared infrastructure affecting all endpoints, not just this area, and was left out of the findings.
