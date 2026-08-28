# Bot Blocking

This directory owns tracker-side bot detection for public `/track` ingestion. `trackEvent.ts` validates the payload, resolves the request IP, and calls `checkBotBlocking()`.

## Detection and enforcement are separate

Detection runs for **every** site. Only trusted server-side ingestion skips it, because it is authenticated first-party traffic reporting its own IP and user agent, which several layers would convict outright.

Site-level `blockBots` decides what happens to a detection, not whether one is looked for. `checkBotBlocking()` returns `enforced` alongside the detection, and ingestion routes on it:

| detection | `blockBots` | event lands in | audit row |
| --- | --- | --- | --- |
| yes | on | — (kept out of `events`) | `bot_events` |
| yes | off | `events`, as normal | `bot_observations` |
| no | either | `events`, as normal | — |

Enforced detections are still not inserted into `events`, so dashboard, report, replay-list, and usage queries need no bot filter.

A site that has turned blocking off previously returned before any layer ran, which left it with neither protection nor any record of what it was receiving. `bot_observations` is that record — a forensic sample of the traffic each layer would have acted on, collected without changing a single number the site owner sees today.

It is a sample and not a ledger, so do not treat a count from it as "what blocking would have removed". The queue drops a batch on ClickHouse failure rather than retrying (the same as `bot_events` — an audit row must never cost an ingest), and it is written after the event itself, so a crash between the two loses the row and keeps the event. Compare shapes and ratios in it; do not reconcile its count against `events`.

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

The client-side `_bs` value is a cached, weighted score computed once per page lifecycle. Strong signals such as automation APIs, impossible dimensions, or default automation viewport sizes can reach the blocking threshold alone; weaker signals such as SwiftShader, missing Chrome globals, and empty plugin lists only add supporting weight. The client also sends `_bsm`, a compact bitmask used for aggregate component counters. The server supplements that mask from validated screen dimensions so older scripts can still move `800x600`, `1024x768`, `1280x1200`, square screens, and impossible dimensions into the `client_signals` layer.

One signal is server-only: `missingScreenDimensions`. A browser always has `window.screen`, so only the server can observe that a hit arrived carrying no dimensions at all. It is weak (weight 1, never strong) and skipped for mobile sites, where a native SDK has no screen to report. It exists so the geometry rules — which are skipped outright when nothing is reported — leave a trace of having been skipped rather than the hit passing silently.

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

`botDetectionStats.ts` also logs process-lifetime totals for tracker requests that reach the bot-blocking entry point every 60 seconds:

- `totalRequests`
- `totalBotRequests` — what was **detected**
- `totalEnforcedBotRequests` — the subset that was actually diverted out of `events`. The gap between the two is what sites with blocking disabled are absorbing.
- `botRequestPercentage`
- `botDetectionTotals` by method
- `clientBotScoreHistogram` with buckets for missing, `0`, `1`, `2`, and `3+`
- `clientBotSignalTotals` for `_bsm` components: missing mask, automation API, zero outer dimensions, missing Chrome global, SwiftShader, empty plugins, default `800x600` viewport, default `1024x768` viewport, default `1280x1200` viewport, square screen, missing screen dimensions, impossible dimensions, outer dimension anomalies, plugin/API absence, and unknown mask bits

`missingMask` and the histogram's `missing` bucket follow what the **client** reported, so they measure tracker adoption. The per-signal totals count every bit we ended up with, inferred server-side or not — which is what makes a newly defined bit appearing in production the proof that a deploy actually took.

A request can increment multiple method totals if multiple methods detected it, so method totals can sum higher than `totalBotRequests`.

## Storage

`botEventQueue.ts` enriches detected bot requests with the same browser, device, and geolocation basics as normal events, then inserts a compact audit row. It exports two queues over one implementation: `botEventQueue` writes to `bot_events` (enforced), and `botObservationQueue` writes to `bot_observations` (detected but not enforced). The schemas are identical on purpose, so the same forensic query runs against either.

The table keeps only the columns needed to inspect bot traffic:

- request identity and route fields: `site_id`, `timestamp`, `session_id`, `user_id`, `hostname`, `pathname`, `querystring`, `referrer`, `type`
- browser, OS, device, screen, and location fields
- ASN fields: `asn`, `asn_org`
- one boolean column for each detection layer
- UA classification fields: `matched_ua_pattern`, `bot_category`
- client evidence: `client_bot_score`, `client_signal_mask`
- anomaly evidence: `anomaly_reasons` (the rules that fired, comma-separated) and `anomaly_score`. The boolean layer columns say *that* the anomaly layer convicted; these say which of its dozen rules did, which is the only form in which the row can be argued with.

Both tables are healed by `ensureBotEventsColumns` at init, so a column added here reaches tables created by earlier versions.

`bot_events` has a 3-month TTL; `bot_observations` has a 30-day TTL, since it exists to answer a current question rather than to hold long-term history. The main `events` table has no bot-specific columns or bot-specific TTL — any such columns present on a production `events` table are drift, and nothing writes them.

## ASN Data

`datacenterAsns.ts` is generated from ipverse `as-metadata` where `metadata.category === "hosting"`.

Regenerate it with:

```sh
npm run update:datacenter-asns
```

`botProviderAsns.ts` is the curated overlay for known bot, AI, scanner, and internet measurement ASNs that ipverse does not reliably categorize as hosting.

## Rate Anomaly Layer

`anomalyScorer.ts` keeps its counters in Redis, so every worker and replica shares one view; an in-process fallback takes over automatically if Redis is unavailable, and `DISABLE_REDIS_ANOMALY=true` pins scoring to it. All of a request's counters ride one Lua round-trip.

It tracks:

- events per `siteId + IP + UA hash`, over 10s and 60s
- interaction-event bursts per visitor tuple, on their own beyond-human threshold
- distinct paths per visitor tuple
- events, distinct UAs, and distinct hostnames per IP
- site-wide volume for a UA hash
- missing client bot score volume
- browser-version spread within a cohort (`siteId + screen + language + browser family`), in one-hour buckets
- events per actor per day
- site volume and distinct actors, and per-cohort volume, distinct actors and direct hits, in 10-minute buckets (the site-flood rules)
- enumeration shape per cohort, in 15-minute buckets

Reasons come back in two lists, and the distinction is structural rather than a matter of how the scores happen to add up:

- **convicting** — keyed on a single actor, or on a distribution no organic population produces. These can open a conviction.
- **supporting** — keyed on dimensions real visitors share (an IP, a popular browser), plus long-window volume, where one address may be an entire office behind a SASE gateway. These are only ever added to a score convicting evidence has already opened.

Five rules deserve their own note:

- **Site flood** (`site_flood_oneshot_cohort_10m`, `site_flood_actor_1d`) is the only site-relative logic in the layer. Every other threshold is absolute, so a fleet of disposable identities — one event each, a fresh address per hit, a real browser — can push a four-events-an-hour site to four thousand and trip nothing (measured: 14% caught in such hours versus 48% at rest). The gate is the site's 10-minute volume against its own padded weekly median, computed every 15 minutes from ClickHouse by `siteBaseline.ts` and shared through Redis; a site with no baseline or under a week old is never in flood. The gate alone never convicts. Inside a flood, a device cohort convicts when it is at least a quarter of the site's traffic, at least 60% distinct actors, and at least 95% direct — a launch is many devices, several events per visitor and referrers set, and a campaign spreads over real devices so no cohort reaches a quarter. An actor convicts inside a flood at 200 events a day from a hosting address only — a residential address never convicts on volume, because a person working in a small internal tool all day is that site's whole flood (two were blocked this way on the rule's first day).
- **Hosting actor volume** (`hosting_actor_events_1d`) convicts a hosting/datacenter address at 1,000 events a day on its own. The supporting-only daily rule below exists because a residential or office address can be hundreds of people; a datacenter address is not. SASE egress (Cato, Zscaler, Netskope) is exempt by ASN, on top of the many-user-agents guard.
- **Cohort version uniformity** convicts, and is the only rule that can catch a paced distributed crawler — one that stays under every per-identity threshold by design. Its key must carry the browser family: without it, Chrome, Safari and Firefox version numbers pool into one distribution, which inflates the distinct-version count and depresses the modal share, i.e. manufactures exactly the two conditions the rule fires on. Its bucket is an hour: the crawler paces itself, and in a one-minute bucket its busiest cohort never came near the volume gate, so the rule did not fire once in two weeks of production.
- **Events per actor per day** is supporting-only and scores 1. Its actor is the exact request IP, deliberately *not* the /24 identity bucket the per-visitor rules use — bucketing merges a datacenter range or a SASE egress pool into one actor, and a day is long enough for that to reach any threshold on legitimate traffic. It is additionally dropped outright for an address showing more than three user agents in five minutes, which is what a shared gateway looks like.
- **Enumeration** (`enumerationObserver.ts`) is in shadow mode: it measures path novelty, events per actor, and direct share per cohort, requires two consecutive qualifying buckets, and **never scores**. It logs. Promoting it should follow from reading those logs, not from a threshold nudge. Its direct share is measured on the raw referrer, before self-referrers are cleared for storage — a stored empty referrer means "direct *or* internal navigation", which most ordinary browsing satisfies.

## Trust Boundaries

Bot blocking assumes the resolved IP is meaningful. The tracker resolves IPs from `X-Real-IP`, then `X-Forwarded-For`, then `CF-Connecting-IP`, then the Fastify request IP. The forwarded headers rank above `CF-Connecting-IP` so that first-party proxies (CloudFront, Fastly, nginx, ...) are attributed to the original visitor rather than the proxy's edge node. Public tracking requests ignore client-supplied `ip_address` and `user_agent`; those overrides are only honored for trusted server-side ingestion.

Client-supplied `_bs` and `_bsm` are useful inputs but are not secure proof.
