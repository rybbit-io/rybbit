# Positions Rybbit takes

> Used by /blog-post: a post may argue a position only if it's listed here with `status: approved`. Candidates can be drafted into a post only after Bill flips them to approved.
> Each position must stay true to the product as described in [stats.md](stats.md); if the code changes, update or retire the position.

All entries below are `status: candidate`, drafted 2026-09-28 for Bill's review. "Where the site says it" points to existing copy, so an approved position is already consistent with live pages.

## Privacy and tracking

### Analytics shouldn't need a cookie banner
- status: candidate
- Why: a consent banner hides the visitors who decline, so cookie-based analytics undercounts exactly the traffic you're trying to measure; cookieless tracking avoids the banner for analytics.
- Where the site says it: homepage subtitle, "Rybbit is open-source, cookieless analytics. No consent banner needed." (`docs/src/app/[locale]/(home)/page.tsx:33`); `blog/best-google-analytics-alternatives.mdx:46`.
- Guardrail: don't quote a specific "% of traffic lost to banners" unless it comes from a cited study.

### Privacy defaults should be honest about their trade-offs
- status: candidate
- Why: Rybbit's daily salt is opt-in because it breaks multi-day retention and returning-visitor counts; saying so plainly beats implying maximum anonymity by default.
- Where the site says it: `features/retention/feature-data.tsx:136` and `compare/umami/comparison-data.tsx:288` describe the opt-in salt correctly. Several other pages don't (see "Known drift" in stats.md).

### Don't store what you don't need
- status: candidate
- Why: IP storage is off by default and inputs are masked in replay by default; the default should be the safe setting and the risky one should be a deliberate choice.
- Where the site says it: `blog/hotjar-alternatives.mdx` ("Input values are masked by default"). Defaults verified in stats.md.

## Product

### One dashboard should answer the first question in seconds
- status: candidate
- Why: GA4 buries simple questions under report menus; most sites need traffic, sources, pages and conversions on one screen, with depth one click down.
- Where the site says it: PRODUCT.md "Answer first, depth on demand"; homepage FAQ "one dashboard instead of 150+ reports"; `blog/best-google-analytics-alternatives.mdx:10`.

### Web analytics and product analytics belong in one tool
- status: candidate
- Why: the question "why did signups drop" crosses traffic, funnels, errors, replay and Web Vitals; switching tools loses the thread.
- Where the site says it: homepage section "One connected workspace: Go from signal to explanation without changing tools." (`LandingPageTemplate.tsx`).

### Analytics should be operable by AI agents, with the same permissions as a teammate
- status: candidate
- Why: a read-write MCP server on the same REST API lets an agent answer questions and manage goals without screenshots or exports; permission parity keeps it safe.
- Where the site says it: homepage MCP section, "A hosted MCP server on top of Rybbit's full REST API..." (`LandingPageTemplate.tsx:310`); `/features/mcp`.

### A small script is a feature
- status: candidate
- Why: the tracker loads on every page of every customer site; about 11 KB gzipped (stats.md) is part of the product's performance promise.
- Where the site says it: homepage meta, the web-analytics feature page and every compare table (about 11 KB compressed since 2026-09-28).

## Open source and business

### Open source keeps an analytics vendor honest
- status: candidate
- Why: under AGPL-3.0 anyone can read exactly what the script collects and self-host if the vendor changes terms; that's a stronger privacy promise than a policy page.
- Where the site says it: homepage FAQ "Every single line of code, including for our cloud/enterprise offerings, is available on GitHub under the AGPL 3.0 license."

### Self-hosting should be first-class, not a crippled edition
- status: candidate
- Why: self-hosted Rybbit includes session replay and the rest of the feature set; people who can run Docker shouldn't have to pay to see their own data.
- Where the site says it: `blog/hotjar-alternatives.mdx` ("self-hosting is free with replay included"); `/docs/self-hosting`.
- Guardrail: the Search Console panel is cloud-only (stats.md). Don't claim full parity without that caveat.

### Recommend a competitor when it fits better
- status: candidate
- Why: readers trust a comparison that sometimes picks someone else; Rybbit has no heatmaps or surveys, and saying so sends the right people elsewhere and keeps the rest.
- Where the site says it: `blog/hotjar-alternatives.mdx` Rybbit section; `blog/best-web-analytics-tools.mdx` "What we'd actually do".

### Price by events, with no surprise overage bills
- status: candidate
- Why: event tiers are published on a slider and ingestion pauses at the limit instead of billing overage, so a traffic spike can't produce an unexpected invoice.
- Where the site says it: pricing page "Set your traffic. See your price." (`PricingSection.tsx:245`). Over-limit behavior verified in stats.md.
- Guardrail: the flip side is lost data during a spike. If a post makes this argument, it must also say that.
