import Link from "next/link";
import {
  ComparisonSection,
  DeepDive,
  FAQItem,
  OtherAlternatives,
  PricingInfo,
  RelatedResource,
} from "../components/ComparisonPage";
import { pickAlternatives } from "../components/competitorSummaries";

// Umami claims were checked against umami.is/pricing and docs.umami.is on 2026-09-27 (Umami v3.4.0).
// Script sizes are compressed transfer sizes of cloud.umami.is/script.js and app.rybbit.io/api/script.js,
// measured the same day; Umami doesn't publish a figure.
export const umamiComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: "With properties" },
      { name: "Funnels", rybbitValue: true, competitorValue: true },
      { name: "User journeys", rybbitValue: true, competitorValue: true },
      { name: "Retention", rybbitValue: true, competitorValue: true },
      { name: "Conversion goals", rybbitValue: true, competitorValue: true },
      { name: "Saved segments", rybbitValue: true, competitorValue: true },
      { name: "UTM tracking", rybbitValue: true, competitorValue: true },
      { name: "Revenue and attribution reports", rybbitValue: false, competitorValue: true },
      { name: "Public dashboards", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      { name: "Session replay", rybbitValue: "Pro plan, from $39/mo", competitorValue: "Business plan, $200/mo" },
      { name: "Click and scroll heatmaps", rybbitValue: false, competitorValue: "Business plan, $200/mo" },
      { name: "Web Vitals monitoring", rybbitValue: true, competitorValue: true },
      { name: "Error tracking", rybbitValue: true, competitorValue: false },
      { name: "User profiles", rybbitValue: true, competitorValue: true },
      { name: "Autocapture (clicks, forms, copy)", rybbitValue: true, competitorValue: false },
      { name: "Bot filtering", rybbitValue: "5 layers + Bots report", competitorValue: "Excludes bots by default" },
      { name: "MCP server for AI assistants", rybbitValue: "Read and write, 44 tools", competitorValue: "Read-only" },
      { name: "Google Search Console data", rybbitValue: "Yes (Cloud)", competitorValue: false },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      { name: "Cookie-free tracking", rybbitValue: true, competitorValue: true },
      { name: "No personal data collection", rybbitValue: true, competitorValue: true },
      { name: "Visitor ID salt rotation", rybbitValue: "Daily (opt-in)", competitorValue: "Monthly (default)" },
      { name: "Open-source license", rybbitValue: "AGPL-3.0", competitorValue: "MIT" },
      { name: "Self-hostable", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Technical & Pricing",
    features: [
      { name: "Script size (compressed)", rybbitValue: "~11KB", competitorValue: "~2.4KB" },
      { name: "Self-hosted database", rybbitValue: "ClickHouse + Postgres", competitorValue: "PostgreSQL" },
      { name: "Ad-blocker bypass via proxy", rybbitValue: true, competitorValue: true },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Cloud starting price", rybbitValue: "$19/mo", competitorValue: "Free (Hobby)" },
    ],
  },
];

export const umamiExtendedData = {
  subtitle:
    "Both are open source and cookieless, and both now have session replay and Web Vitals. Rybbit adds error tracking, five-layer bot detection, and a read-write MCP server; Umami adds heatmaps and a free cloud tier.",

  introHeading: "Why consider Rybbit over Umami?",
  introParagraphs: [
    "Umami has grown well past pageview counts. Version 3.1.0 added session replays and Core Web Vitals, and 3.2.0 added click and scroll heatmaps. It also has funnels, journeys, retention, revenue, and attribution reports, so the two products now cover a lot of the same ground.",
    "The differences that remain are specific. Rybbit tracks JavaScript errors; Umami doesn't. Rybbit filters bots through five detection layers and keeps what it blocked in a Bots report. Its MCP server has 44 tools and can create goals, save funnels, and manage sites, while Umami's MCP server is read-only. And on Rybbit Cloud, Google Search Console clicks and impressions sit in the main dashboard.",
    "Price and setup differ too. On Umami Cloud, replays and heatmaps start with the $200/mo Business plan, while Rybbit Pro includes session replay from $39/mo. Umami is cheaper per event and has a free Hobby tier. Self-hosted, Umami is a Node.js app and one PostgreSQL database; Rybbit is a Docker Compose stack built around ClickHouse, a columnar database designed for large event tables.",
  ],

  chooseRybbit: [
    "You want JavaScript error tracking next to your traffic and sessions",
    "You want session replay without a $200/mo plan (Rybbit Pro starts at $39/mo)",
    "You want bots filtered by five detection layers, with a report of what was blocked",
    "You want an MCP server with write access (44 tools, including goals, funnels, and sites)",
    "You want Google Search Console data in your analytics dashboard (Rybbit Cloud)",
    "You want to bring your Umami history with you through the built-in importer",
    "You self-host at high volume and want your events in ClickHouse",
  ],

  chooseCompetitor: [
    "You want a free cloud tier (Hobby covers 100K events a month on one website)",
    "You need click and scroll heatmaps",
    "You want revenue and attribution reports built in",
    "You prefer the MIT license to AGPL-3.0",
    "You want the smallest tracking script (about 2.4KB compressed)",
    "You'd rather self-host a Node.js app and one PostgreSQL database",
    "You track millions of events a month and want the lowest price per event",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, card required at signup",
      "Standard: 100k events, up to 5 sites and 3 team members",
      "Pro ($39/mo) adds session replay (10,000 a month) and unlimited sites and members",
      "Error tracking, funnels, journeys, and Web Vitals on both plans",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "Umami",
    model: "Free tier + usage-based cloud",
    startingPrice: "Free",
    highlights: [
      "Hobby: $0 for 100K events a month on 1 website",
      "Pro: $20/mo for 1M events, with API and MCP access",
      "Replays and heatmaps need Business at $200/mo",
      "14-day trial on paid plans; self-hosting is free (MIT)",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "Umami vs Rybbit, in depth",
    sections: [
      {
        heading: "Two open-source tools with a lot of overlap",
        paragraphs: [
          <>
            Until Umami 3.1, the split between these two was easy to describe: both had traffic stats and reports,
            and Rybbit added session replay and Web Vitals. That&apos;s no longer accurate. Umami 3.1.0 (April 2026)
            added session replays and Core Web Vitals (LCP, INP, CLS, FCP, and TTFB), and 3.2.0 added click and
            scroll heatmaps. Its docs also cover funnels, journeys, retention, goals, segments, cohorts, revenue,
            attribution, boards, and teams.
          </>,
          <>
            Rybbit covers most of that list too, with{" "}
            <Link href="/features/session-replay">session replay</Link>,{" "}
            <Link href="/features/funnels">funnels</Link>,{" "}
            <Link href="/features/user-journeys">user journeys</Link>, retention,{" "}
            <Link href="/features/web-vitals">Web Vitals</Link>, and user profiles. Both tools are cookieless and
            free to self-host. What separates them now is a shorter list of specific features, plus price, license,
            and how much infrastructure you want to run.
          </>,
        ],
      },
      {
        heading: "Where Rybbit goes further",
        paragraphs: [
          <>
            Error tracking is the clearest gap. Rybbit captures uncaught JavaScript errors and unhandled promise
            rejections from your own domain, groups them in an{" "}
            <Link href="/features/error-tracking">Errors report</Link>, and shows each one in the session timeline
            next to the pages and events around it. Umami has no error tracking. Rybbit&apos;s replays don&apos;t
            record console output, so errors show up in the Errors report and the session timeline rather than
            inside the replay.
          </>,
          <>
            Bot filtering is the second. Umami excludes bots by default. Rybbit runs each tracking request through
            five{" "}
            <Link href="/features/bot-detection">detection layers</Link>{" "}
            (user-agent patterns, header checks, browser signals, ASN data, and rate anomalies), keeps what it
            blocked in a separate Bots report, and doesn&apos;t bill you for bot traffic.
          </>,
          <>
            Both ship an MCP server for AI assistants, and Umami&apos;s is read-only. Rybbit&apos;s{" "}
            <Link href="/features/mcp">MCP server</Link>{" "}
            has 44 tools, including ones that create goals, save funnels, manage sites and team members, and run
            read-only SQL. On Rybbit Cloud, Google Search Console clicks, impressions, and keywords also appear in
            the main dashboard.
          </>,
        ],
      },
      {
        heading: "Pricing and self-hosting, honestly",
        paragraphs: [
          <>
            Umami Cloud&apos;s Hobby plan is free for 100K events a month on one website, with six months of data
            retention. Pro is $20/mo for 1M events, 20 websites, and 10 team members, and adds API and MCP access.
            Session replays and heatmaps start at Business: $200/mo for 10M events, with 5,000 replays included.
            Paid plans have a 14-day trial.
          </>,
          <>
            Rybbit Cloud starts with a 7-day trial, and the card is collected at signup. Standard is $19/mo for
            100k events, 5 sites, and 3 team members, with error tracking, funnels, journeys, retention, and Web
            Vitals included. Pro is $39/mo at the same volume and adds session replay (10,000 replays a month) plus
            unlimited sites and members.
          </>,
          <>
            Per event, Umami is cheaper: 1M events a month costs $20 on Umami Pro and $69 on Rybbit Standard.
            Replays change the math. Rybbit Pro costs less than Umami Business up to about 2M events a month ($39/mo
            at 100k, $139/mo at 1M), and Umami Business has the lower list price beyond that. Replay volume differs
            too: Umami Business includes 5,000 replays a month and charges $0.005 for each extra one, while Rybbit
            Pro includes 10,000 replays for every 100k events in your plan. The full breakdown is on the{" "}
            <Link href="/pricing">pricing page</Link>.
          </>,
          <>
            Both self-host for free, and both include session replay when self-hosted. Umami is the lighter lift:
            a Node.js app and one PostgreSQL database. Rybbit&apos;s{" "}
            <Link href="/docs/self-hosting">self-hosted deployment</Link>{" "}
            is a Docker Compose stack with ClickHouse, Postgres, Redis, and a Caddy web server, installed by a setup
            script on a VPS (the guide recommends at least 2GB of RAM). ClickHouse is a columnar database built for
            aggregating large event tables, and that&apos;s what the extra services buy you.
          </>,
        ],
      },
      {
        heading: "Switching from Umami to Rybbit",
        paragraphs: [
          <>
            You don&apos;t have to start from zero. Rybbit&apos;s importer reads Umami&apos;s CSV export (it also
            handles Plausible and Simple Analytics), so your historical traffic comes with you. A low-risk path looks
            like this:
          </>,
          <ol key="migration-steps">
            <li>
              Add the Rybbit tracking script and leave Umami running. Both are cookieless and the two scripts
              don&apos;t conflict, so running them side by side is safe.
            </li>
            <li>
              Import your Umami history with the built-in importer (the{" "}
              <Link href="/docs/data-import">import guide</Link>{" "}
              walks through it). On Rybbit Cloud, imported events count toward your monthly event limit, and
              imports reach back 3 years on Standard and 5 on Pro.
            </li>
            <li>
              Recreate your custom events and goals. Umami&apos;s events with properties map onto Rybbit&apos;s
              custom events with attributes.
            </li>
            <li>Compare the two dashboards for a week or two. Once the numbers line up, remove the Umami script.</li>
          </ol>,
        ],
      },
      {
        heading: "When Umami is the better choice",
        paragraphs: [
          <>
            Plenty of sites should pick Umami. If your budget is $0, its Hobby tier covers 100K events a month on
            one site, while Rybbit Cloud starts at $19/mo. If you want heatmaps, Umami has click and scroll heatmaps
            and Rybbit has none. Umami also has revenue and attribution reports, which Rybbit doesn&apos;t, an MIT
            license instead of AGPL-3.0, and a smaller tracking script (about 2.4KB compressed against
            Rybbit&apos;s 11KB). Rybbit is the better fit when you want error tracking beside your analytics,
            layered bot filtering with a report of what it blocked, replays without a $200/mo plan, or an MCP server
            that can make changes. For a
            wider survey of the options, see our guide to the{" "}
            <Link href="/blog/best-web-analytics-tools">best web analytics tools</Link>.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

  otherAlternatives: {
    title: "Other Umami alternatives",
    intro:
      "Rybbit isn't the only option. These are the other Umami alternatives people weigh most often, with the main trade-off of each and a link to the full comparison.",
    items: pickAlternatives(["plausible", "posthog", "matomo", "fathom", "simpleanalytics", "cloudflare-analytics"]),
  } satisfies OtherAlternatives,

  faqItems: [
    {
      question: "How is Rybbit different from Umami?",
      answer:
        "Both are open source and cookieless, and both have funnels, journeys, retention, session replay, and Web Vitals. Rybbit adds JavaScript error tracking, five-layer bot filtering with a Bots report, an MCP server with write tools, and Google Search Console data on Rybbit Cloud. Umami has click and scroll heatmaps, revenue and attribution reports, an MIT license, and a free Hobby tier.",
    },
    {
      question: "Does Umami have session replay?",
      answer:
        "Yes. Umami added session replays in v3.1.0 and click and scroll heatmaps in v3.2.0. On Umami Cloud, both need the Business plan ($200/mo, with 5,000 replays included); self-hosted Umami includes them. Rybbit includes session replay on its Pro plan, from $39/mo with 10,000 replays a month, and on self-hosted installs. Rybbit doesn't have heatmaps.",
    },
    {
      question: "Can I migrate from Umami to Rybbit?",
      answer:
        "Yes, history included. Export your Umami data as CSV and load it with Rybbit's built-in importer, then add the Rybbit script and run both tools in parallel until the numbers line up. On Rybbit Cloud, imported events count toward your monthly event limit.",
    },
    {
      question: "Which is easier to self-host?",
      answer:
        "Umami. It's a Node.js app with one PostgreSQL database. Rybbit runs as a Docker Compose stack with ClickHouse, Postgres, and Redis, which is more to operate. ClickHouse is a columnar database built for aggregating large event tables, and that's the reason for the extra pieces.",
    },
    {
      question: "Does Rybbit have a larger script than Umami?",
      answer:
        "Yes. Rybbit's tracking script is about 11KB compressed and Umami's is about 2.4KB (measured in September 2026). Rybbit's also carries error tracking, autocapture, and the browser signals its bot detection uses. Session replay needs a separate recorder in both: Rybbit fetches its recorder only for sessions sampled for replay, and Umami's replays and heatmaps use a recorder script you add to your pages.",
    },
    {
      question: "Are both GDPR compliant?",
      answer:
        "Both are cookieless, don't collect personal data by default, and say you can run them without a cookie banner. Umami rotates its session salt monthly by default. Rybbit has an opt-in daily salt for user IDs, which stops a visitor from being linked across days. Rybbit Cloud stores analytics data in the EU; Umami says its cloud servers are in the US and EU.",
    },
  ] satisfies FAQItem[],

  relatedResources: [
    {
      title: "Rybbit vs Google Analytics",
      href: "/compare/google-analytics",
      description: "The privacy-first alternative to GA4",
    },
    {
      title: "Import your Umami data",
      href: "/docs/data-import",
      description: "Bring your Umami history over from a CSV export",
    },
    {
      title: "Best web analytics tools",
      href: "/blog/best-web-analytics-tools",
      description: "Ten tools compared by use case",
    },
    {
      title: "Getting started with Rybbit",
      href: "/docs",
      description: "Set up Rybbit in under 5 minutes",
    },
    {
      title: "Self-hosting guide",
      href: "/docs/self-hosting",
      description: "Deploy Rybbit on your own infrastructure",
    },
    {
      title: "Pricing",
      href: "/pricing",
      description: "Simple, transparent pricing for every team size",
    },
  ] satisfies RelatedResource[],
};
