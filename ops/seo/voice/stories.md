# Stories Rybbit can tell

> Used by /blog-post: when a post needs a real example, take it from here instead of inventing one, and keep to the "Publishable" line for that story.
> Customers stay anonymous unless Bill records permission here. Anything marked "do not publish without Bill's approval" is off-limits to automated drafting.

All entries are candidates drafted 2026-09-28 from engineering notes. Numbers are from Rybbit's own production data or code at the time of each incident; re-check any number you quote against the current code or data, and give the date it was measured.

## Lead with these

### 1. The crawler that paced itself under every bot rule
- Facts (July 2026): a distributed scraper sent about 5.2M events a day to a large self-hosted Rybbit deployment. It ran a real headless browser from residential proxy IPs, so it executed the tracking script and passed four of the five detection layers. It paced each identity at roughly one event every five minutes and rotated user agents, so no per-identity rate rule fired. Its tell was a cohort fingerprint: one uncommon screen size (1280x1200), en-US language, a Shanghai timezone, and Chrome versions drawn evenly from 16 old releases, where real users cluster on the current one. A screen-size rule shipped first; a cohort-uniformity rule followed.
- Angle: "Why rate limits don't catch modern scrapers" or "What a bot fleet looks like in your analytics". Strong fit for bot-traffic and AI-crawler posts.
- Publishable: the mechanism, the fingerprint shape, the event volume, the fix. Rybbit's detection layers by name.
- Sensitivities: the deployment is a customer's self-hosted instance. Say "a large gaming site" at most; don't name it or its domains. Don't publish exact thresholds that would help a scraper tune under them.

### 2. When one browser update doubled a site's user count
- Facts (August 2026): on a desktop app built with Electron, every auto-update changed three version numbers in the user agent across the whole install base within a day or two. Because visitor IDs hash IP and user agent, every machine became a new visitor on release day: any date range spanning a release roughly doubled "users", while daily active users stayed correct. Rybbit now strips version numbers from the user agent before hashing (`normalizeUserAgentForIdentity`). Measured merge after the fix over 10 hours: 0.6% and 0.4% on two sites. A short 2-minute sample had suggested 34%, which overstated the effect about 50x.
- Angle: "How cookieless analytics counts visitors, and where it goes wrong". Also a good honest post on measuring your own fixes.
- Publishable: the mechanism, the fix, the before/after numbers, the lesson about short-window measurements.
- Sensitivities: the app belongs to a customer; keep it anonymous ("a desktop app with a large install base").

### 3. Real customers blocked as bots, and how we found it
- Facts (July 2026): an audit found the rate-anomaly layer diverting roughly 100k to 480k events a day from a motorcycle maker's site. They were real buyers clicking through a bike configurator, dozens of clicks in seconds, which crossed thresholds tuned for crawlers. Pageviews survived but engagement data was cut. Two wrong theories came first; an outside traffic estimate is what broke them. Fix: interaction events got their own beyond-human threshold (100 per 10 seconds), crowd-level rules became supporting-only, and the script collapses repeat clicks on one element within a second.
- Angle: "False positives in bot detection" or "Your bot filter might be deleting your best customers".
- Publishable: the mechanism, the event ranges, the fix, the false leads.
- Sensitivities: customer site, keep anonymous ("a vehicle configurator on a manufacturer's site").

### 4. Launch: 5,000 GitHub stars in 9 days
- Facts: already published in `blog/5k-stars.mdx` (May 2025). GitHub stars were 13,070 on 2026-09-28 (stats.md).
- Angle: a follow-up, "Rybbit at 13k stars: what happened after the launch spike", in the founder's voice.
- Publishable: everything already in the post plus current public GitHub numbers.
- Sensitivities: revenue and signup numbers beyond what's already public need Bill's approval. The old post says "freemium"; the follow-up must not.

## More candidates

### 5. The one-shot bot fleet that no per-visitor rule can see
- Facts (August 2026): across 14 days, detection caught 14.5% of traffic during spike hours against 48% at rest. One small site (normally about 4 events an hour) took 26k events in 20 hours from about 20,500 identities sending roughly one event each, from about 3,900 mostly residential networks. The fix compares each site to its own weekly baseline and convicts cohorts that are both a flood and uniform. Backtest: 22 sites flagged, all the same fleet; real product launches weren't flagged.
- Angle: "Detecting bot floods by comparing a site to itself".
- Publishable: aggregate numbers, the baseline approach, the backtest result.
- Sensitivities: no site names or domains. Note honestly that the first residential-volume rule blocked two real power users and was removed the next day.

### 6. Every ClickHouse timestamp pinned to UTC
- Facts (September 2026, issue #1205, PR #1207): a self-hoster whose ClickHouse ran on Europe/Berlin time saw events stored two hours off. Every time column is now declared `DateTime('UTC')` and writers send explicit-UTC timestamps. An automatic repair of already-shifted rows was built and then removed because it can't be made correct; the docs give a manual SQL recipe instead.
- Angle: a technical post for self-hosters and ClickHouse users: "Why your analytics timestamps drift, and why we didn't auto-fix old data".
- Publishable: all of it; the issue and PR are public.
- Sensitivities: low. The issue is public, but ask before naming the reporter.

### 7. When a proxy split one visitor into seven
- Facts (July 2026): after a change to client-IP resolution, traffic through rotating proxy egress (CloudFront, Fly.io, corporate proxies, iCloud Private Relay) resolved to the proxy's IP. Visitors split into several users, sessions ran 2 to 4 times high, and one customer's excluded IP showed up as 7 users. Fixes: IP exclusion matches every candidate IP, sites can declare a first-party proxy, datacenter egress IPs are bucketed for identity, and a short-lived re-attachment step joins a visitor whose proxy IP rotated.
- Angle: "Why your analytics counts one visitor twice" for proxy and CDN setups.
- Publishable: the mechanism and the fixes.
- Sensitivities: this was a production regression that affected paying customers, and data from that week stays split. Needs Bill's approval before publishing. Never name the customer.

### 8. The homepage redesign that lost
- Facts (September 2026): Rybbit ran an A/B test of a new homepage design against the existing one using its own tags; the existing design won and the new one was retired (PR #1180). The scaffold for future tests stayed.
- Angle: dogfooding post, "How we A/B test with Rybbit tags, and why we kept the old homepage".
- Publishable: the method and the outcome.
- Sensitivities: conversion numbers from the test aren't in these notes; get them from Bill or leave them out.

### 9. A slow dashboard that turned out to be one script
- Facts (September 2026): a large self-hosted instance (about 25M events a day) hit sustained high CPU. Sampling ClickHouse's running queries showed nearly all of it came from one internal script calling the raw overview endpoint per country over a year-to-date range, about 1,000 calls an hour, not from background aggregation.
- Angle: "Before tuning ClickHouse, look at what's actually running", practical for self-hosters.
- Publishable: the diagnostic method and the lesson.
- Sensitivities: customer deployment and their staff's script. Anonymize fully; needs Bill's approval.

## Do not publish without Bill's approval

### Custom SQL query validator bypass (fixed August 2026)
- Facts: Rybbit's custom query feature had validator bypasses via comment and string syntax that could allow cross-tenant reads; fixed 2026-08-27 with lexer fixes, a dedicated read-only ClickHouse user and read-only constraints.
- Status: security incident. Do not draft, reference or hint at this in any post unless Bill explicitly approves a disclosure write-up.

### Internal business metrics
- Onboarding funnel rates, trial-to-paid conversion, MRR, subscriber counts and referral conversion rates exist in engineering notes. None of them are public. Don't use them in posts unless Bill approves each number.
