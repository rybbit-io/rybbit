# How Rybbit writes

> Used by /blog-post: read this before drafting, and check the finished draft against "Never write" before running `npm run lint:blog`.
> Facts come from [stats.md](stats.md), positions from [opinions.md](opinions.md), anecdotes from [stories.md](stories.md). This file covers how to say things, not what is true.

Drawn on 2026-09-28 from the homepage (`docs/src/components/LandingPageTemplate.tsx`, `docs/src/app/[locale]/(home)/page.tsx`), `PRODUCT.md`, and five blog posts. The blog earned 2 organic clicks in the 90 days to 26 Sep 2026 (GSC via Ahrefs, project 9053952), so clicks can't pick the models. These five were chosen for impressions and for passing the September fact-check:

| Post | Why it's a model |
| --- | --- |
| `best-google-analytics-alternatives.mdx` | Most impressions on the blog (3,628). Per-tool sections, honest limits in the Rybbit section. |
| `best-web-analytics-tools.mdx` | "What we'd actually do" verdicts that sometimes pick a competitor. |
| `track-chatgpt-traffic.mdx` | Opens with the answer, explains the mechanism, cites every external claim inline. |
| `posthog-pricing.mdx` | Numbers first, disclosure line, sources and dates stated up front. |
| `hotjar-alternatives.mdx` | Rybbit section leads with what Rybbit lacks and says who should pick something else. |

For build-in-public posts, `5k-stars.mdx` is the model for the founder's first-person voice.

## Who reads this

People who run a website or product and want to know what's happening on it without Google Analytics' weight or cookie banner (PRODUCT.md, "Users"). In order: indie developers and self-hosters, small teams and startups, agencies managing many client sites. They're technical enough to paste a script tag and often comfortable with Docker and SQL. Write for someone who will check your numbers.

## Tone

- **Explain, don't sell.** PRODUCT.md: "it explains, it doesn't sell." A post earns trust by being the most accurate page on the topic, then mentions Rybbit where it genuinely fits.
- **Friendly, precise, trustworthy.** Warmth comes from clarity. No jokes that cost precision; no mascot whimsy in articles.
- **Relief over impressive.** "This just makes sense" beats "this is impressive." Describe what a person sees and does, not how amazing it is.
- **Plainly confident.** State facts without hedging stacks ("may potentially help"). When something is uncertain, say what's unknown once.

## Voices

- **Default: "we", byline "Rybbit Team".** Guides, comparisons, pricing breakdowns, explainers. "We build Rybbit" in disclosures; "we checked" for verification.
- **Founder: "I", byline Bill.** Only for build-in-public posts (launch stories, growth numbers, lessons). Casual is fine here: `5k-stars.mdx` says "Literally nobody reads these." Never mix the two voices in one post.

## Sentence habits

- **Open with the answer.** The first two sentences define the thing or give the number. `posthog-pricing.mdx` opens with how billing works; `track-chatgpt-traffic.mdx` opens with the two meanings of "AI traffic". No scene-setting intro, no "In this post we'll cover".
- **Explain the mechanism.** "It records the DOM, not pixels" and "Referral attribution rests on one HTTP header" are the house style. Readers are technical; show how it works, then what it means.
- **Plain copulas.** "is" and "has", not "serves as", "boasts", "offers".
- **Numbers with units and a date.** "$39/month for 100k events", "30 days", "as of September 2026". Round only when the exact figure adds nothing ("about 11 KB gzipped").
- **Source next to the claim.** Link the vendor page or spec in the same sentence as the fact, the way `track-chatgpt-traffic.mdx` cites MDN and OpenAI inline. No "studies show".
- **Short paragraphs.** Two to four sentences. Vary sentence length; let some sentences be short and flat.
- **Sentence-case headings.** Question headings for explainers ("How does session replay work?"), plain nouns for sections ("Pricing at a glance").
- **Name the product.** Say "Rybbit" every time, not "the platform", "the tool", "the solution".

## Product vocabulary

| Use | Avoid | Note |
| --- | --- | --- |
| Rybbit, Rybbit Cloud, self-hosted Rybbit | "the platform", "our solution" | Cloud and self-hosted differ (replay plan gating, Search Console UI is cloud-only). Say which. |
| cookieless | "cookie-free tracking solution" | Pair with the concrete result: no consent banner for analytics. |
| events | hits, "data points" | Events are the billing unit. List which count from stats.md. |
| sites | properties, domains | "Properties" is GA vocabulary. |
| session replay | "session recording" in prose | Use "session recording" only where the keyword needs it. |
| Standard, Pro, Enterprise | "free plan", "free tier" | Rybbit Cloud has a 7-day trial and free self-hosting. Never write "free tier". |
| MCP server | "AI integration" | Name the clients (Claude Code, Cursor, Codex...) and the fact it can read and write. |
| Web Vitals, funnels, goals, user journeys, retention, user profiles, error tracking | capitalized feature names mid-sentence | Link each to `/features/*` on first mention. |
| visitor ID | "fingerprint" | Rybbit hashes IP and user agent; the daily salt is opt-in. See stats.md before describing it. |

## Trade-offs and competitors

- **Disclose.** Any post that ranks or prices competitors carries a line like `posthog-pricing.mdx`'s: "Disclosure: we build Rybbit, an open-source analytics tool that appears in the comparison near the end."
- **Say what Rybbit lacks, in the Rybbit section.** No click or scroll heatmaps, no surveys, no GA4 importer, no mobile session replay, no console or network capture in replay, replay needs Pro on Rybbit Cloud. Then say who should pick something else, as `hotjar-alternatives.mdx` does: "If heatmaps are why you open Hotjar, Clarity or Mouseflow will serve you better."
- **Credit competitors' strengths.** "The free tier is genuinely generous" (`posthog-pricing.mdx`). A verdict section may recommend a competitor for some readers (`best-web-analytics-tools.mdx` sends $0-budget sites to Umami).
- **Competitor facts from the vendor, dated.** Pricing, limits and features come from the vendor's own rendered page, checked the week the post ships, with "(September 2026)" next to the number. Pricing pages are often JS-rendered; render them rather than trusting a text fetch. Never from memory, a listicle, or an older Rybbit page.
- **No punching down.** State the fact ("Umami rotates its session salt monthly by default") and let the reader judge. No "clunky", "outdated", "bloated" unless you give the measurement.

## Post structure that works here

- One H1. Title under ~62 characters, primary keyword near the front.
- Comparisons: a "short version" or "at a glance" table near the top, then one section per tool.
- Per-tool fact blocks may use bold labels (`**Covers:**`, `**Missing or limited:**`, `**Pricing (September 2026):**` with a source). This is an accepted house pattern for structured facts; don't use bold-label bullets for prose arguments.
- End comparisons with a verdict in "we" ("What we'd actually do"), not a recap.
- FAQ at the end with direct answers; never restate the question.
- CTA, if any, is one plain sentence with a link ("Rybbit has a 7-day trial; self-hosting is free"). No "Ready to get started?".

## Never write

Pulled from `~/.claude/skills/humanize-copy/REFERENCE.md`. Density is the tell, but the first three rows are absolute.

- **Em dashes.** Zero, including in tables. Use a comma, colon, parentheses, or two sentences.
- **Invented facts.** No made-up numbers, customers, quotes or reviewer claims to sound specific. If the honest version is weaker, ship the honest version.
- **"Free tier" or "free plan" for Rybbit Cloud.**
- **Inflation verbs:** unlock, supercharge, elevate, empower, streamline, leverage, harness, revolutionize, transform, turbocharge, delve, foster, showcase, underscore, bolster.
- **Vague adjectives:** seamless, effortless, robust, powerful, cutting-edge, game-changing, innovative, comprehensive, holistic, pivotal, crucial, world-class, industry-leading, best-in-class, state-of-the-art.
- **Nouns of nothing:** solution(s), journey (except the feature "user journeys"), landscape, ecosystem, testament, synergy, "actionable insights", capabilities, offerings, game-changer.
- **Stock phrases:** "in today's fast-paced world", "look no further", "all-in-one", "take X to the next level", "the power of X", "peace of mind", "we've got you covered", "at your fingertips", "everything you need to", "like never before", "hassle-free".
- **Constructions:** "It's not just X, it's Y" and "isn't just about"; "Say goodbye to"; "Whether you're X or Y"; rhetorical-question openers ("Tired of...?", "Ready to...?"); benefit tails ("...so you can focus on what matters"); "From startups to enterprises" ranges.
- **Essay furniture:** intros that preview the post, "In conclusion" or "The bottom line" recaps, a summary sentence closing each section, FAQ answers that restate the question.
- **Puffery:** "trusted by thousands", "loved by teams", "experts agree". Use a verified number from stats.md with its source, or cut.
- **Exclamation marks and emoji** in article prose.

Run `node ~/.claude/skills/humanize-copy/scripts/scan.mjs <file>` before lint. It flags candidates; bold-label bullets in per-tool fact blocks are expected hits.

## Before and after

Real sentences from existing posts, rewritten to the rules above.

**1. Puffery into specifics** (`ecommerce-analytics.mdx:13`)

> Before: This is where Rybbit Analytics comes in. Unlike traditional analytics platforms that overwhelm you with data you don't need, Rybbit gives you actionable insights into your e-commerce metrics while respecting your customers' privacy and keeping your data under your control.

> After: Rybbit puts the store owner's questions on one dashboard: which channels send visitors who reach checkout, where the checkout funnel loses them, and which product pages load slowly. It sets no cookies, so analytics needs no consent banner, and you can self-host it if the data has to stay on your own servers.

What changed: "actionable insights" became three named questions, each backed by a real feature (channels, [funnels](/features/funnels), [Web Vitals](/features/web-vitals)); "respecting privacy" became the concrete consequence.

**2. Negative parallelism and a benefit tail** (`content-marketing-funnel.mdx:497`, a post removed on 2026-09-28)

> Before: Your content marketing isn't just about traffic. It's about building a machine that turns awareness into customers. Rybbit helps you see how that machine is performing and provides the data you need to improve it at every stage.

> After: Judge content by what readers do next. Set signup as a [goal](/features/goals), build a [funnel](/features/funnels) from blog post to pricing page to signup, and fix the step with the biggest drop first.

What changed: the "isn't just X, it's Y" frame and the machine metaphor are gone; the paragraph now tells the reader exactly what to set up.

**3. Em dash, audience hedging, vague payoff** (`geographic-segmentation.mdx:9`)

> Before: Geographic segmentation divides your audience by location—country, region, city, or neighborhood. For marketers, it's one of the most practical segmentation strategies because location data reveals real behavioral differences across markets. Whether you're optimizing landing pages, adjusting ad spend, or localizing content, geographic insights drive better decisions.

> After: Geographic segmentation splits your visitors by location: country, region or city. It pays off when behavior differs by market, like a landing page that converts in the US and stalls in Germany, or a page that loads slowly for visitors far from your servers. Rybbit resolves all three levels from the visitor's IP address and doesn't store the IP unless you turn that on.

What changed: the em dash became a colon, "Whether you're..." became two concrete cases, "drive better decisions" was cut, and the Rybbit line states a verified default (`trackIp` is off, see stats.md).
