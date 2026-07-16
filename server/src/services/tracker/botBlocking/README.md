# Bot Blocking

This directory owns tracker-side bot detection for public `/track` ingestion. `trackEvent.ts` validates the payload, resolves the request IP, and calls `checkBotBlocking()`. If any bot method matches, the event is stored in ClickHouse `bot_events` with per-layer bot metadata.

Detected bot requests are not inserted into the normal `events` table, so dashboard, report, replay-list, and usage queries do not need a bot filter.

## Entry Point

`index.ts` is the single decision point. It receives:

- the Fastify request headers
- site-level `blockBots`
- the validated tracking payload fields needed for bot checks
- the resolved request IP

Requests with a verified Bearer API key for the site bypass bot blocking because they are treated as trusted server-side ingestion.

## Detection Flow

All methods run before a decision is returned. This avoids skewed logs where a request that matches multiple bot methods is only counted against the first one.

The returned response still uses the first matched method's message for compatibility, but the log includes all matching methods in `detections`.

Current methods:

- `ua_pattern`: classifies the user-agent using vendored `isbot` patterns plus local AI, social, SEO, framework, headless, and monitoring patterns.
- `header_heuristics`: scores missing or inconsistent browser headers, scripting framework UAs, headless UAs, stale Chrome versions, and suspicious fetch metadata.
- `client_signals`: detects when browser-side and client-derived fingerprints reach the configured threshold. This includes automation APIs, default automation viewport sizes, impossible dimensions, outer-dimension anomalies, SwiftShader, and plugin/API absence.
- `bot_asn`: detects curated bot/scanner/AI provider ASNs as a standalone layer. Generic ipverse `hosting` ASNs are supporting evidence only and are recorded when another layer also matched.
- `rate_anomaly`: detects request bursts and crawl-shaped behavior using in-memory sliding-window counters.

The client-side `_bs` value is a cached, weighted score computed once per page lifecycle. Strong signals such as automation APIs, impossible dimensions, or default automation viewport sizes can reach the blocking threshold alone; weaker signals such as SwiftShader, missing Chrome globals, and empty plugin lists only add supporting weight. The client also sends `_bsm`, a compact bitmask used for aggregate component counters. The server supplements that mask from validated screen dimensions so older scripts can still move `800x600`, `1024x768`, and impossible dimensions into the `client_signals` layer.

## Logging

Detected bot requests emit one consolidated log line:

- no raw user-agent string
- no bot-blocking service child logger field
- no repeated per-detection message strings
- `siteId`
- `detectionCount`
- `detectionLayers`
- structured `detections`

Each detection object contains compact method-specific details such as matched UA pattern, header score, ASN metadata, or anomaly counters.

`botDetectionStats.ts` also logs process-lifetime totals for tracker requests that reach the bot-blocking entry point every 5 seconds:

- `totalRequests`
- `totalBotRequests`
- `botRequestPercentage`
- `botDetectionTotals` by method
- `clientBotScoreHistogram` with buckets for missing, `0`, `1`, `2`, and `3+`
- `clientBotSignalTotals` for `_bsm` components: missing mask, automation API, zero outer dimensions, missing Chrome global, SwiftShader, empty plugins, default `800x600` viewport, default `1024x768` viewport, impossible dimensions, outer dimension anomalies, plugin/API absence, and unknown mask bits

A request can increment multiple method totals if multiple methods detected it, so method totals can sum higher than `totalBotRequests`.

## Storage

`botEventQueue.ts` enriches detected bot requests with the same browser, device, and geolocation basics as normal events, then inserts a compact audit row into `bot_events`.

The table keeps only the columns needed to inspect bot traffic:

- request identity and route fields: `site_id`, `timestamp`, `session_id`, `user_id`, `hostname`, `pathname`, `querystring`, `referrer`, `type`
- browser, OS, device, screen, and location fields
- ASN fields: `asn`, `asn_org`
- one boolean column for each detection layer
- UA classification fields: `matched_ua_pattern`, `bot_category`

`bot_events` has a 3-month TTL. The main `events` table has no bot-specific columns or bot-specific TTL.

## ASN Data

`datacenterAsns.ts` is generated from ipverse `as-metadata` where `metadata.category === "hosting"`.

Regenerate it with:

```sh
npm run update:datacenter-asns
```

`botProviderAsns.ts` is the curated overlay for known bot, AI, scanner, and internet measurement ASNs that ipverse does not reliably categorize as hosting.

## Rate Anomaly Layer

`anomalyScorer.ts` uses per-process memory only. It tracks short rolling windows for:

- events per `siteId + IP + UA hash`
- events per `siteId + IP`
- distinct paths per visitor tuple
- distinct UAs per IP
- distinct hostnames per IP
- site-wide volume for a UA hash
- missing client bot score volume

The layer is score-based. Strong rules, such as more than 30 events in 10 seconds for one visitor tuple or more than 25 distinct paths in 60 seconds, can block alone. Weak rules, such as missing client score, only add context unless paired with stronger behavior.

This catches obvious floods and fast crawlers, but it is local to a Node process. If the signal is useful in production, move the same keys and thresholds to Redis so counters are shared across workers and containers.

## Trust Boundaries

Bot blocking assumes the resolved IP is meaningful. The tracker resolves IPs from `X-Real-IP`, then `X-Forwarded-For`, then `CF-Connecting-IP`, then the Fastify request IP. The forwarded headers rank above `CF-Connecting-IP` so that first-party proxies (CloudFront, Fastly, nginx, ...) are attributed to the original visitor rather than the proxy's edge node. Public tracking requests ignore client-supplied `ip_address` and `user_agent`; those overrides are only honored for trusted server-side ingestion.

Client-supplied `_bs` and `_bsm` are useful inputs but are not secure proof.
