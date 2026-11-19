# Bot Blocking

This directory owns tracker-side bot detection for public `/track` ingestion. `trackEvent.ts` validates the payload, resolves the request IP, and calls `checkBotBlocking()`.

## Detection and enforcement are separate

Detection runs for **every** site. Only trusted server-side ingestion skips it, because it is authenticated first-party traffic reporting its own IP and user agent, which several layers would convict outright.

Site-level `blockBots` decides what happens to a detection, not whether one is looked for. `checkBotBlocking()` returns `enforced` alongside the detection, and ingestion routes on it:

| detection | `blockBots` | event lands in | audit row |
| --- | --- | --- | --- |
| yes | on | — (kept out of `events`) | `bot_events` |
| yes | off | `events`, as normal | `bot_observations` |
| shadow rule only | either | `events`, as normal | `bot_observations` |
| no | either | `events`, as normal | — |

Enforced detections are still not inserted into `events`, so dashboard, report, replay-list, and usage queries need no bot filter.

A site that has turned blocking off previously returned before any layer ran, which left it with neither protection nor any record of what it was receiving. `bot_observations` is that record — a forensic sample of the traffic each layer would have acted on, collected without changing a single number the site owner sees today.

It is a sample and not a ledger, so do not treat a count from it as "what blocking would have removed". The queue drops a batch on ClickHouse failure rather than retrying (the same as `bot_events` — an audit row must never cost an ingest), and it is written after the event itself, so a crash between the two loses the row and keeps the event. Compare shapes and ratios in it; do not reconcile its count against `events`.

## Shadow rules

A rule under evaluation runs in production without being allowed to act. When one fires on a hit no layer convicted, `checkBotBlocking()` returns a shadow observation: never enforced whatever `blockBots` says, tracked as normal, and written to `bot_observations` with **every layer column false** and the rule in `anomaly_reasons` as `shadow:<rule>`. On a hit a live layer did convict, the shadow rule is appended to that row's `anomaly_reasons` the same way, so its overlap with the live layers can be measured too.

That gives a promotion what a backtest cannot. A backtest reads end-of-day totals over stored rows; a live rule fires on the hit that crosses the threshold, with the raw referrer and the exact address, and counts traffic other layers already diverted. A shadow row *is* that live decision: the first row for a cohort or range on a day is the moment the rule would have started diverting, and every row after it is a hit it would have taken.

```sql
-- Per shadow rule and site: what promotion would divert, and what it would cost.
-- Only rows no live layer convicted, on sites where blocking is on, count as marginal catch.
WITH obs AS (
  SELECT site_id, session_id, anomaly_reasons,
         arrayFilter(r -> startsWith(r, 'shadow:'), splitByChar(',', anomaly_reasons)) AS rules
  FROM bot_observations
  WHERE timestamp >= now() - INTERVAL 7 DAY AND anomaly_reasons LIKE '%shadow:%'
    AND NOT (detected_ua_pattern OR detected_header_heuristics OR detected_client_signals
             OR detected_bot_asn OR detected_rate_anomaly)
    -- a site with a live-layer row here has blocking off: promotion would divert nothing there
    AND site_id NOT IN (
      SELECT DISTINCT site_id FROM bot_observations
      WHERE timestamp >= now() - INTERVAL 7 DAY
        AND (detected_ua_pattern OR detected_header_heuristics OR detected_client_signals
             OR detected_bot_asn OR detected_rate_anomaly))
)
SELECT arrayJoin(rules) AS rule, o.site_id,
       count() AS hits,
       countIf(length(rules) = 1) AS hits_only_this_rule,
       uniq(o.session_id) AS sessions,
       uniqIf(o.session_id, e.session_id != '') AS interacting_sessions
FROM obs o
LEFT JOIN (SELECT DISTINCT site_id, session_id FROM events
           WHERE timestamp >= now() - INTERVAL 7 DAY
             AND type IN ('button_click', 'input_change', 'copy', 'form_submit', 'outbound')) e
  ON o.site_id = e.site_id AND o.session_id = e.session_id
GROUP BY rule, o.site_id
ORDER BY hits DESC
```

Read it per site, worst site first: a rule that is right on the platform and wrong on one customer is still wrong. `hits_only_this_rule` is the honest incremental figure — adding per-rule `hits` together double-counts rows two shadow rules share. The interaction list is the one the rules themselves use (`sharedSignals.ts`); a different list here would understate collateral. Custom events and conversions are not in it, so check those separately before promoting anything.

Any query over `bot_observations` that means "detected on a site with blocking off" must filter on the layer columns, since shadow-only rows share the table. `anomaly_reasons != ''` no longer implies `detected_rate_anomaly`.

Current shadow rules, in the order they look promotable:

- `asn_low_engagement` (`asnEngagement.ts`) — the hit's network is on a learned list of networks whose sessions almost never include a human interaction, measured against each site's own rate. Refreshed from ClickHouse every six hours; the list is logged on each refresh, and stops applying when it expires rather than outliving its data. The strongest evidence of the four (learned on one week, held on the next, twice), but that evidence is a share of the platform's engaged sessions — before promoting, measure the engaged fraction inside each listed network and each affected site, shared clouds such as AWS especially.
- `asn_country_only_slice` (`asnEngagement.ts`) — the hit's address geolocates only to a country (no city or region) and its network is on a learned list of networks whose country-only slice is a proxy fleet: far less engaged than the rest of the same network (under 0.35 of its lift) and dominated by one OS and screen (at least 0.6). Catches proxy resellers renting blocks inside residential ISPs, which the whole-network list cannot see because the ISP's real subscribers dilute it. Learned in the same refresh and query as `asn_low_engagement`; hosting networks are left to that list. Also requires the slice's own lift under 0.5, a known OS and non-zero screen for the dominant device, and leaves sessions that changed network or slice mid-visit out of both slices. Its list has its own Redis key (`bot:ae:co`) and expiry. Calibration, prod 2026-11 with the shipped query: learned on 11-04..10 it lists AS22773 (Cox) and AS201341 (already on the whole-network list); AS9009 (M247) also passes the thresholds but is hosting, so it is left out. Applied per hit to the next week's kept events, the list labels ~83k hits / 63k sessions on ~2,500 sites; 1,068 of those sessions have a click, all on the fleet's own Linux 1920x1080 device at about one event per session (crawled filter URLs, so most likely banner clicks), and 3 on any other device. A listed network's other country-only devices are labelled too, so before promoting, split its `bot_observations` rows by device and site. Validated on one fleet only.
- `hosting_range_events_1d` — see the anomaly layer below.
- `cohort_oneshot_flat_versions_1d` and `cohort_oneshot_direct_1d` — see the anomaly layer below.
- Enumeration (`enumerationObserver.ts`) predates this mechanism and still only logs.

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

- `ua_pattern`: classifies the user-agent using vendored `isbot` patterns plus local AI, social, SEO, framework, headless, and monitoring patterns. A short explicit list of upstream patterns that are ordinary words or brand names — "news", "google", "download", "tools" (`AMBIGUOUS_ON_BROWSER`) — is **supporting-only** when the user agent is a full browser frame carrying no structural self-identification (`compatible`, a URL, a contact address): in-app browsers append their host app's name, and the name is not evidence about the visitor. Such a match attaches once another layer convicts and never convicts alone. Product identifiers and crawler words (`httrack`, `bot`, `crawl`, `spider`) are not on the list and convict wherever they appear.
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

`datacenterAsns.ts` is generated from ipverse `as-metadata` where `metadata.category === "hosting"`. It feeds this layer, the hosting rules in the anomaly layer, and identity bucketing (hosting egress is bucketed to /24), so regenerating it gives visitors on reclassified networks a new anonymous id once.

It does **not** decide which forwarded headers ingestion trusts. `resolveClientIp` reads its own list, `tracker/proxyEdgeAsns.ts`, which only ever grows (`npm run update:proxy-edge-asns`): dropping a network a customer's proxy runs on would turn every visitor to their site into the proxy's address, and a wholesale regeneration drops thousands.

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
- events, human interactions and distinct screens per hosting range (/24 or /48, plus the version-stripped user agent) per day
- pageviews, distinct actors, direct pageviews, distinct networks and browser-version spread per desktop cohort per day
- site volume and distinct actors, and per-cohort volume, distinct actors and direct hits, in 10-minute buckets (the site-flood rules)
- enumeration shape per cohort, in 15-minute buckets

Reasons come back in two lists, and the distinction is structural rather than a matter of how the scores happen to add up:

- **convicting** — keyed on a single actor, or on a distribution no organic population produces. These can open a conviction.
- **supporting** — keyed on dimensions real visitors share (an IP, a popular browser), plus long-window volume, where one address may be an entire office behind a SASE gateway. These are only ever added to a score convicting evidence has already opened.

Some counters are read without being added to: the hosting-range interaction count is consulted on every hit and incremented only by an interaction, and the day cohort is built from pageviews but judged on every event type. The Redis script has a read-only form of each fixed-bucket kind for this.

Seven rules deserve their own note (two of them shadow-only):

- **Site flood** (`site_flood_oneshot_cohort_10m`, `site_flood_actor_1d`) is the only site-relative logic in the layer. Every other threshold is absolute, so a fleet of disposable identities — one event each, a fresh address per hit, a real browser — can push a four-events-an-hour site to four thousand and trip nothing (measured: 14% caught in such hours versus 48% at rest). The gate is the site's 10-minute volume against its own padded weekly median, computed every 15 minutes from ClickHouse by `siteBaseline.ts` and shared through Redis; a site with no baseline or under a week old is never in flood. The gate alone never convicts. Inside a flood, a device cohort convicts when it is at least a quarter of the site's traffic, at least 60% distinct actors, and at least 95% direct — a launch is many devices, several events per visitor and referrers set, and a campaign spreads over real devices so no cohort reaches a quarter. An actor convicts inside a flood at 200 events a day from a hosting address only — a residential address never convicts on volume, because a person working in a small internal tool all day is that site's whole flood (two were blocked this way on the rule's first day).
- **Hosting actor volume** (`hosting_actor_events_1d`) convicts a hosting/datacenter address at 1,000 events a day on its own. The supporting-only daily rule below exists because a residential or office address can be hundreds of people; a datacenter address is not. SASE egress (Cato, Zscaler, Netskope) is exempt by ASN, on top of the many-user-agents guard.
- **Hosting range volume** (`hosting_range_events_1d`, shadow) is the same test on the range rather than the address, for a scraper that rotates inside a rented block and so never accumulates on any one address. A range is a wider net — a company on cloud virtual desktops is one range, one browser build, one display — so it also requires that the site captures some human interaction, that the actor has produced none all day (clicks, inputs, copies, form submits, outbound clicks), that it has shown one or two known screen sizes, and that the day's counters are whole (after any Redis fallback it is silent until the next UTC day). Relay networks (Cloudflare, Akamai, Fastly) and SASE are neither judged nor counted.
- **One-shot cohort, by day** (shadow) describes the fleet the flood rule cannot see: one that arrives every day, and is therefore the site's baseline, or that paces itself under the flood gate. The shape — a desktop cohort with 200+ pageviews in a day, at least 80% of them from distinct actors, at least 95% direct, across 20+ networks — is recorded as `cohort_oneshot_direct_1d`; with a flat browser-version distribution (eight or more versions, the commonest under 40%) it is also recorded as `cohort_oneshot_flat_versions_1d`. Neither convicts, because the verdict is on the cohort and would be inherited by everyone in it: once a fleet has qualified a site's cohort for the day, a returning customer opening a bookmark on the same screen matches every conjunct, and so would their checkout. Promotion needs evidence about the arriving actor as well.
- **Cohort version uniformity** convicts, and is the only rule that can catch a paced distributed crawler — one that stays under every per-identity threshold by design. Its key must carry the browser family: without it, Chrome, Safari and Firefox version numbers pool into one distribution, which inflates the distinct-version count and depresses the modal share, i.e. manufactures exactly the two conditions the rule fires on. Its bucket is an hour: the crawler paces itself, and in a one-minute bucket its busiest cohort never came near the volume gate, so the rule did not fire once in two weeks of production.
- **Events per actor per day** is supporting-only and scores 1. Its actor is the exact request IP, deliberately *not* the /24 identity bucket the per-visitor rules use — bucketing merges a datacenter range or a SASE egress pool into one actor, and a day is long enough for that to reach any threshold on legitimate traffic. It is additionally dropped outright for an address showing more than three user agents in five minutes, which is what a shared gateway looks like.
- **Enumeration** (`enumerationObserver.ts`) is in shadow mode: it measures path novelty, events per actor, and direct share per cohort, requires two consecutive qualifying buckets, and **never scores**. It logs. Promoting it should follow from reading those logs, not from a threshold nudge. Its direct share is measured on the raw referrer, before self-referrers are cleared for storage — a stored empty referrer means "direct *or* internal navigation", which most ordinary browsing satisfies.

## Trust Boundaries

Bot blocking assumes the resolved IP is meaningful. The tracker resolves IPs from `X-Real-IP`, then `X-Forwarded-For`, then `CF-Connecting-IP`, then the Fastify request IP. The forwarded headers rank above `CF-Connecting-IP` so that first-party proxies (CloudFront, Fastly, nginx, ...) are attributed to the original visitor rather than the proxy's edge node. Public tracking requests ignore client-supplied `ip_address` and `user_agent`; those overrides are only honored for trusted server-side ingestion.

Client-supplied `_bs` and `_bsm` are useful inputs but are not secure proof.
