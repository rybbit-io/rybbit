# Verified numbers

> Used by /blog-post: every Rybbit number in a draft must appear in the verified tables here, quoted as written. A number that isn't here gets verified in code (and added) or cut.
> Re-verify any row older than a month before quoting it; the "Known drift" and "Unverified" lists are things never to repeat until resolved.

All rows checked 2026-09-28 against `origin/master` at `63e8198c` unless the source is a URL. Paths are relative to the repo root.

## Tracking script

| Fact | Value | Source | Checked |
| --- | --- | --- | --- |
| Script size, as served | 11,177 bytes gzipped (about 11 KB); 34,006 bytes uncompressed | `curl https://app.rybbit.io/api/script.js` with and without `Accept-Encoding: gzip` | 2026-09-28 |
| On by default | Initial pageview, SPA navigations, URL parameters, outbound link clicks | `server/src/db/postgres/schema.ts:96-99` | 2026-09-28 |
| Off by default | Web Vitals, error tracking, button clicks, copy events, form interactions, session replay, storing IP addresses | `server/src/db/postgres/schema.ts:93-95,100-103` | 2026-09-28 |
| Visitor ID | SHA-256 of IP address + user agent (version numbers stripped), first 12 hex characters. Datacenter egress IPs are bucketed so rotating proxies don't split one visitor | `server/src/services/userId/userIdService.ts:96-116` | 2026-09-28 |
| Daily salt | Optional per-site setting (`saltUserIds`), **off by default**. When on, visitors can't be linked across days | `server/src/db/postgres/schema.ts:80`, `server/src/lib/siteConfig.ts:111` | 2026-09-28 |
| AI referral sources mapped | 11 AI operators (OpenAI, Anthropic, Google, Microsoft, Perplexity, Meta, Mistral, xAI, You.com, Cursor, Cohere) | `shared/src/aiOperators.ts:20-35` | 2026-09-28 |

## Plans and pricing (Rybbit Cloud)

| Fact | Value | Source | Checked |
| --- | --- | --- | --- |
| Standard | From $19/month for 100k events; $249 at 10M; $849 at 50M | `docs/src/components/PricingSection.tsx:42,48,52` | 2026-09-28 |
| Pro | From $39/month for 100k events; $499 at 10M; $1,699 at 50M | `docs/src/components/PricingSection.tsx:56,62,66` | 2026-09-28 |
| Event tiers on the slider | 100k, 250k, 500k, 1M, 2M, 5M, 10M, 20M, 30M, 40M, 50M, then Custom | `docs/src/components/PricingSection.tsx:15-28` | 2026-09-28 |
| Annual billing | 8 times the monthly price (4 months free): $13/month and $26/month at 100k | `docs/src/components/PricingSection.tsx:71`, `docs/src/app/[locale]/(home)/pricing/components/ComparisonSection.tsx:267,273` | 2026-09-28 |
| Standard limits | 5 sites, 3 team members, 3-year data retention | `docs/src/lib/const.ts:6-7`, `server/src/lib/const.ts:36-37`, `docs/src/components/PricingSection.tsx:122` | 2026-09-28 |
| Pro limits | Unlimited sites and team members, session replay, 5-year data retention | `docs/src/components/PricingSection.tsx:129-132` | 2026-09-28 |
| Enterprise | Custom price; pricing copy lists "Infinite data retention" | `docs/src/components/PricingSection.tsx:140,203` | 2026-09-28 |
| Trial | 7 days; card collected at checkout, no charge until the trial ends | `server/src/api/stripe/createCheckoutSession.ts:109`, `docs/src/components/PricingSection.tsx:256` | 2026-09-28 |
| Over the monthly limit | New events are skipped ("over_limit"), not billed as overage; the owner gets an email | `server/src/services/tracker/ingestEvent.ts:64-67`, `server/src/services/usageService.ts:358-366` | 2026-09-28 |
| Events that count toward the limit | pageview, custom_event, performance (Web Vitals), outbound, button_click, copy, form_submit, input_change. Errors, replays and identify calls don't count | `server/src/lib/const.ts:21-30` | 2026-09-28 |
| Self-hosting | Free, AGPL-3.0, all features including replay | `LICENSE.md`; GitHub API `license.spdx_id` = AGPL-3.0 | 2026-09-28 |

## Session replay

| Fact | Value | Source | Checked |
| --- | --- | --- | --- |
| Plan on Rybbit Cloud | Pro only (Standard doesn't list it) | `docs/src/components/PricingSection.tsx:131` | 2026-09-28 |
| Monthly quota | 10% of the event allowance: 10,000 replays at 100k events, 1,000,000 at 10M | `server/src/lib/const.ts:358-363,466-471` | 2026-09-28 |
| Retention | 30 days (ClickHouse TTL, so self-hosted too unless changed) | `server/src/db/clickhouse/schema/core.ts:298,348,432` | 2026-09-28 |
| Input masking | All inputs masked by default; password and email always masked | `server/src/analytics-script/sessionReplay.ts:164-165` | 2026-09-28 |
| Console and network capture | None. The rrweb recorder is started without plugins | `server/src/analytics-script/sessionReplay.ts:147-176` | 2026-09-28 |
| Mobile replay | None. The React Native SDK (`@rybbit/react-native` 0.1.1) tracks screens, events, errors and users | `react-native/package.json:2-3` | 2026-09-28 |

## API and MCP

| Fact | Value | Source | Checked |
| --- | --- | --- | --- |
| API daily request limit | Standard 5,000; Pro 25,000 (5x) | `server/src/lib/const.ts:52-53` | 2026-09-28 |
| API burst limit | 50 requests per 10 seconds on every plan | `server/src/lib/const.ts:50-51` | 2026-09-28 |
| API keys per owner | Standard 5, Pro 20, self-hosted 50 | `server/src/lib/const.ts:62-64` | 2026-09-28 |
| MCP tools | 44 tools, read and write, including Search Console | `server/src/mcp/tools/*.ts` (count of `registerTool(`), `server/src/mcp/tools/searchConsole.ts:46-60` | 2026-09-28 |
| MCP clients with setup docs | Claude Code, Claude Desktop, Codex, Cursor, VS Code, opencode | `docs/src/components/LandingPageTemplate.tsx:25-32` | 2026-09-28 |

## Data, hosting, integrations

| Fact | Value | Source | Checked |
| --- | --- | --- | --- |
| Importers | Umami, Simple Analytics, Plausible. No Google Analytics, Fathom or Matomo importer | `server/src/db/postgres/schema.ts:850` | 2026-09-28 |
| Cloud hosting | Hetzner, Germany and Finland (EU); analytics data stored in the EU | `docs/src/app/[locale]/(home)/subprocessors/page.tsx:30-34,174` | 2026-09-28 |
| Search Console panel | Rybbit Cloud only (hidden on self-hosted) | `client/src/app/[site]/main/page.tsx:92-94` | 2026-09-28 |
| Heatmaps | None (click or scroll). The only "heatmap" in the client is a calendar chart type in custom dashboards | `client/src/app/[site]/dashboards/utils.ts:341` | 2026-09-28 |
| Feature flags and experiments | Code exists but the dashboard entries are commented out. Treat as unreleased; don't claim them | `client/src/app/[site]/components/Sidebar/Sidebar.tsx:164-179` | 2026-09-28 |

## Open source and community

| Fact | Value | Source | Checked |
| --- | --- | --- | --- |
| GitHub stars | 13,070 | `gh api repos/rybbit-io/rybbit` | 2026-09-28 |
| GitHub forks | 753 | `gh api repos/rybbit-io/rybbit` | 2026-09-28 |
| License | AGPL-3.0 | `LICENSE.md`, GitHub API | 2026-09-28 |

## Historical, as published

Numbers Rybbit already published in `docs/content/blog/5k-stars.mdx` (2025-05-26). Quote them as "at launch in May 2025", never as current.

- About 110 days of work before launch (started January 2025).
- 5,000 GitHub stars in 9 days; 5.8k three weeks after launch.
- Around 700 signups and $900 total revenue in the first three weeks.
- Around 150k impressions from about four Reddit posts (r/SideProject, r/selfhosted and smaller subs).
- Built because the founder's gaming stats site got around 1.5 million visits a month.

That post calls the hosted version "freemium". That's no longer accurate; don't repeat it.

## Known drift on the site

Claims live on rybbit.com that the code contradicts. Don't copy them into posts; fix the pages separately.

- **"18 KB" script.** The real figure is about 11 KB gzipped (see above). Appears in `docs/src/app/[locale]/(home)/page.tsx:7` (homepage meta), the homepage FAQ JSON-LD (`docs/src/components/LandingPageTemplate.tsx:51`), web-analytics feature page, seven compare pages, `compare/data/competitors.ts`, `docs/src/lib/agent-markdown.ts` and `proxy-guide/get-started.mdx`.
- **Daily salt described as the default.** The code default is off. Wrong on: homepage FAQ (`LandingPageTemplate.tsx:43`, "We salt user IDs daily"), `features/page.tsx:293`, `for-european-companies/page.tsx:40,77`, compare pages for Plausible (`comparison-data.tsx:123`), Simple Analytics (`:137`) and Cloudflare (`:139`), and `blog/best-google-analytics-alternatives.mdx:46`. Stated correctly on `compare/umami/comparison-data.tsx:288` and `features/retention/feature-data.tsx:136`.
- **"Capture every interaction automatically"** (`LandingPageTemplate.tsx:219`). Button, copy and form capture are off by default.
- **AI operator table** in `blog/track-chatgpt-traffic.mdx` lists 10 operators; the registry now has 11 (Cohere).

## Unverified: ask Bill

Claims used on the site that couldn't be verified from the repo. Don't use them in posts until Bill confirms and a source is added above.

- "Trusted by 10,000+ organizations worldwide" (`docs/src/app/[locale]/(home)/enterprise/page.tsx:133`).
- Naming logo-bar customers (Bosch, GOV.UK, Royal Caribbean, OP.GG and others) in articles: is there permission beyond the logo bar?
- "Most sites are collecting data in under 5 minutes" (`LandingPageTemplate.tsx:67`).
- GA4's script is "371KB" (`LandingPageTemplate.tsx:51`): needs a fresh measurement with a date.
- "No sampling at any traffic level" (`blog/best-google-analytics-alternatives.mdx:46`): plausible given raw ClickHouse queries, but no code or doc states it.
- "Fully compliant with GDPR, CCPA" (`LandingPageTemplate.tsx:43`): a legal claim. Safer wording until confirmed: "designed so analytics runs without cookies or a consent banner".
- The dashboard's unpaid 3,000-event state (`DEFAULT_EVENT_LIMIT`, `server/src/lib/const.ts:17`) is labeled "Free plan" in the app, while marketing says there is no free tier. Until Bill decides, posts say "7-day trial" and "free to self-host", never "free plan".
