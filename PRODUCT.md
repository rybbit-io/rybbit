# Product

## Register

product

> Primary surface is the authenticated analytics product (dashboards, session replay, settings). A marketing/landing surface also exists; treat individual marketing tasks as `brand` per-task, but the project default is `product`.

## Users

Rybbit serves people who run websites and products and want to understand their traffic without the weight or privacy cost of Google Analytics. Three audiences, in priority order:

- **Indie devs & self-hosters** — technical solo builders running their own site. Comfortable with config and SQL, deploy on their own VPS, value speed, control, and sane defaults.
- **Small teams & startups** — founders, marketers, and PMs checking growth, sharing dashboards, and collaborating inside organizations.
- **Agencies & consultants** — managing many client sites, leaning on public/shared dashboards and multi-site overviews.

Shared context: they open Rybbit to answer a specific question (what's trending, where traffic comes from, why a funnel drops off, what an error is) and want the answer in seconds, not after a configuration project. The job is "tell me what's happening on my site, accurately, without tracking my visitors."

## Product Purpose

Rybbit is an open-source, privacy-friendly, cookieless web and product analytics platform: the modern alternative to Google Analytics. It covers the full analytics surface (sessions, users, pageviews, bounce rate, funnels, journeys, retention, goals, custom events, session replay, error tracking, uptime, and 3-level location maps) while staying fast to set up and intuitive to read.

Success looks like: a user installs the script in minutes, lands on a dashboard that's immediately legible, and trusts the numbers. Depth is available (advanced filters across 15+ dimensions, custom SQL queries, replays) but never blocks the first answer. Privacy is a feature, not a compromise.

## Brand Personality

**Friendly, precise, trustworthy.** Approachable without being toy-like. Rybbit has personality (the frog mascot, a privacy-first conviction, plain-language copy) but the data is always the star. The voice is direct and unpretentious: it explains, it doesn't sell. Warmth comes from clarity and good defaults, not decoration. When in doubt, choose the option that makes the numbers easier to trust.

Emotional goal: relief and confidence. "This just makes sense" beats "this is impressive."

## Anti-references

- **Generic SaaS template.** No indistinct dashboard-kit look: no purple gradients, no hero-metric template (big number + tiny label + gradient accent), no endless identical icon+heading+text card grids. Rybbit should look like itself, not a Tailwind starter.
- **Over-playful / toy-like.** The frog and the friendly tone must never undermine trust in the data. No cartoonish UI, no whimsy that gets between the user and the numbers.
- **Cluttered like GA4** (the product it replaces). No overwhelming navigation, no metrics buried three clicks deep, no configuration required before any value appears.
- **Cold enterprise BI.** Not Tableau/Looker heaviness: no analyst-only jargon, no intimidating density-for-its-own-sake.

## Design Principles

1. **Answer first, depth on demand.** Every screen should surface the likely question's answer immediately; advanced filtering, SQL, and replays are one layer down, never a gate.
2. **Earned familiarity.** Use standard, trustworthy affordances (Linear/Vercel/Stripe-grade). The tool should disappear into the task; novelty must win a real UX argument before it ships.
3. **Trust through precision.** Accurate numbers, honest empty/loading/error states, consistent component vocabulary screen to screen. Craft is how we signal the data is reliable.
4. **Privacy is the point.** Reinforce the cookieless, privacy-friendly stance through the experience, not just the marketing.
5. **Personality at the edges.** Warmth and the frog live in moments (empty states, small touches), not on top of the data.

## Accessibility & Inclusion

No formal WCAG bar mandated; apply strong defaults as table stakes:

- Body text ≥4.5:1 contrast (watch muted-gray-on-tinted-surface in both light and dark themes; dark mode is default).
- Visible keyboard focus and full keyboard navigation on interactive components.
- Honor `prefers-reduced-motion` on every animation (crossfade or instant fallback).
- Prefer color-blind-distinguishable data viz (don't rely on hue alone to separate series).

## Visual System

Captured separately in DESIGN.md when generated. Quick orientation: dark-mode-default, HSL CSS variables (not OKLCH; identity-preserving), emerald accent ramp for primary actions/success, a periwinkle `--dataviz` blue for charts, grayscale-heavy neutral ramp, `--radius: 0.3rem`, Shadcn UI (New York) on Tailwind v4, Nivo + D3 + Mapbox for visualization.
