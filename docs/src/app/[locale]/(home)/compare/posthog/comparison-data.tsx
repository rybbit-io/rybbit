import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const posthogComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: "With properties" },
      { name: "Funnels", rybbitValue: true, competitorValue: true },
      { name: "User journeys (Sankey)", rybbitValue: true, competitorValue: true },
      { name: "Conversion goals", rybbitValue: true, competitorValue: true },
      { name: "UTM tracking", rybbitValue: true, competitorValue: true },
      { name: "Public dashboards", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      { name: "Session Replay", rybbitValue: true, competitorValue: true },
      { name: "User profiles", rybbitValue: true, competitorValue: true },
      { name: "Web Vitals monitoring", rybbitValue: true, competitorValue: true },
      { name: "Error tracking", rybbitValue: true, competitorValue: true },
      { name: "Real-time globe view", rybbitValue: true, competitorValue: false },
      { name: "Autocapture", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      { name: "Cookie-free tracking", rybbitValue: true, competitorValue: "Optional" },
      { name: "No personal data collection", rybbitValue: true, competitorValue: false },
      { name: "Daily rotating salt", rybbitValue: true, competitorValue: false },
      { name: "Open source", rybbitValue: true, competitorValue: true },
      { name: "Self-hostable", rybbitValue: true, competitorValue: "Very difficult" },
    ],
  },
  {
    title: "Technical & Pricing",
    features: [
      { name: "Script size", rybbitValue: "18KB", competitorValue: "~60KB" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: "With proxy" },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "Free" },
    ],
  },
];

export const posthogExtendedData = {
  subtitle: "Rybbit's focused web analytics vs PostHog's complex product suite. See which approach fits your team.",

  introHeading: "Why consider Rybbit over PostHog?",
  introParagraphs: [
    "PostHog is a product analytics platform that bundles analytics, session replay, feature flags, A/B testing, and surveys into a single tool. That breadth comes with significant complexity, and teams often spend more time configuring PostHog than using it. The ~60KB script can also weigh on page performance.",
    "Rybbit takes the opposite approach: do web analytics well instead of doing everything adequately. The single-page dashboard gives your whole team the metrics they need, with no training required. Non-technical team members can understand user behavior, track conversions, and watch session replays without learning a query language or navigating dozens of menus.",
    "Privacy is another key difference. Rybbit is cookie-free by default and never collects personal data, with no configuration needed. PostHog uses cookies by default and requires setup to achieve privacy compliance. Self-hosting is also dramatically simpler: Rybbit runs on TypeScript and ClickHouse, while PostHog requires Kafka, Redis, PostgreSQL, and ClickHouse. If you need focused, privacy-first web analytics that your whole team can use from day one, Rybbit is the better fit.",
  ],

  chooseRybbit: [
    "You want focused web analytics without the bloat",
    "You need a dashboard your non-technical team can use immediately",
    "You want privacy-first analytics that's cookie-free by default",
    "You prefer a lightweight script (18KB vs ~60KB)",
    "You want simple, predictable pricing without usage surprises",
    "You need fast self-hosting without complex infrastructure",
  ],

  chooseCompetitor: [
    "You need feature flags and A/B testing in your analytics tool",
    "You want heatmaps out of the box",
    "You need a SQL query interface for custom analysis",
    "You want surveys integrated with your analytics",
    "You need a mobile app for on-the-go analytics",
    "You want analytics, flags, A/B testing, and surveys in one platform",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, card charged after the trial",
      "All features included, no add-on costs",
      "Session replay available on Pro plan",
      "Predictable billing with no overages",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "PostHog",
    model: "Usage-based per product",
    startingPrice: "Free",
    highlights: [
      "Generous free tier (1M events/month for analytics)",
      "Each product (replay, flags, surveys) billed separately",
      "Costs can scale quickly with multiple products enabled",
      "Self-hosting is free but complex to operate",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "PostHog vs Rybbit, in depth",
    sections: [
      {
        heading: "Two different products in the same category",
        paragraphs: [
          <>
            Let&apos;s be clear: PostHog is genuinely excellent at what it does. It isn&apos;t really an analytics tool.
            It&apos;s a full product platform: product analytics, session replay, feature flags, experiments,
            surveys, and a SQL-queryable event warehouse, with 2026&apos;s headline push being agentic AI that works
            toward &ldquo;self-driving&rdquo; product decisions. For an engineering-led product team that wants all of
            that in one place, it&apos;s one of the best tools on the market.
          </>,
          <>
            The cost of that breadth is complexity in the same class as GA4: insights, query builders, a SQL layer, and
            a lot of menus between you and &ldquo;how much traffic did we get this week?&rdquo; Rybbit makes the
            opposite bet: web analytics your whole team actually opens. One dashboard covers traffic,{" "}
            <Link href="/features/funnels">funnels</Link>,{" "}
            <Link href="/features/session-replay">session replay</Link>, user journeys, error tracking, Web Vitals, and
            user profiles, from an ~18KB script, with nothing to configure and no query language to learn.
          </>,
        ],
      },
      {
        heading: "Flat subscription vs per-event metering",
        paragraphs: [
          <>
            PostHog&apos;s free tier is genuinely huge: 1 million events per month, no card required, one project, one
            year of data retention, unlimited team members, and the free allowance keeps applying after you
            upgrade. If you&apos;re a small site, you may pay nothing for a long time, and that&apos;s a real point in
            PostHog&apos;s favor.
          </>,
          <>
            Past the free tier, web analytics is billed together with product analytics on usage-based pricing: from
            $0.0000500 per event on the 1&ndash;2M tier, scaling down to $0.0000090 per event at 250M+. Per-event
            metering means the invoice moves with your traffic: a launch spike, a viral post, or
            autocapture-heavy pages all show up on the bill, so teams at scale end up watching billing limits alongside
            their dashboards. Rybbit&apos;s <Link href="/pricing">pricing</Link>{" "}
            is a flat subscription from $19/mo for
            100k events, every feature on every plan, with a 7-day trial. And if you&apos;d rather pay nothing,
            the open-source version is <Link href="/docs/self-hosting">free to self-host</Link>.
          </>,
        ],
      },
      {
        heading: "Privacy: defaults matter",
        paragraphs: [
          <>
            Both tools are open source, but their out-of-the-box privacy postures differ. Rybbit is cookieless by
            default: no consent banner needed, no persistent identifiers, and visitor hashes rotate with a daily salt.
            PostHog can be configured for cookieless tracking, but its default configuration generally needs a consent
            banner in the EU, and every visitor who declines is a session your product data never sees. If
            &ldquo;accurate traffic numbers without a banner&rdquo; is the goal, the tool that does it with zero
            configuration wins by default.
          </>,
        ],
      },
      {
        heading: "Running PostHog and Rybbit together",
        paragraphs: [
          <>
            This doesn&apos;t have to be an either/or decision. A setup we see often: keep PostHog for what it&apos;s
            uniquely good at (feature flags, experiments, and SQL access to raw events) and run Rybbit as
            the source of truth for traffic. Marketing, founders, and support get a dashboard they can read without
            training, with cookieless numbers that aren&apos;t gated behind consent, while the product team keeps its
            full PostHog toolkit. The two scripts don&apos;t conflict, and Rybbit&apos;s flat plan means the second
            tool doesn&apos;t add a second metered bill. For a wider look at the landscape, see our{" "}
            <Link href="/blog/best-web-analytics-tools">guide to the best web analytics tools</Link>.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

  faqItems: [
    {
      question: "How is Rybbit different from PostHog?",
      answer: "Rybbit focuses exclusively on web analytics with a clean, simple interface. PostHog is a full product suite with analytics, feature flags, A/B testing, surveys, and more. If you primarily need web analytics, Rybbit delivers a faster, simpler experience.",
    },
    {
      question: "Is Rybbit really simpler than PostHog?",
      answer: "Yes. Rybbit provides a single-page dashboard where all essential metrics are visible on one screen. PostHog's extensive feature set means more menus, more configuration, and a steeper learning curve, especially for non-technical team members.",
    },
    {
      question: "Does PostHog have features Rybbit doesn't?",
      answer: "Yes, PostHog offers feature flags, A/B testing, surveys, heatmaps, and a SQL query interface that Rybbit doesn't have. These are useful tools for product teams, but they add complexity. Rybbit intentionally focuses on doing web analytics well.",
    },
    {
      question: "How does self-hosting compare?",
      answer: "Rybbit is straightforward to self-host with a modern TypeScript/ClickHouse stack. PostHog's self-hosted version requires significantly more infrastructure (Kafka, Redis, PostgreSQL, ClickHouse, and more) and is much harder to maintain.",
    },
    {
      question: "Can I migrate from PostHog to Rybbit?",
      answer: "Yes. Just add Rybbit's script tag to your site and data starts flowing immediately. You can run both tools in parallel during the transition. Since Rybbit uses a different data model, historical PostHog data won't transfer, but new data collection begins instantly.",
    },
  ] satisfies FAQItem[],

  relatedResources: [
    {
      title: "Rybbit vs Google Analytics",
      href: "/compare/google-analytics",
      description: "The privacy-first alternative to GA4",
    },
    {
      title: "Rybbit vs Plausible",
      href: "/compare/plausible",
      description: "Compare two privacy-first analytics platforms",
    },
    {
      title: "Rybbit vs Umami",
      href: "/compare/umami",
      description: "Two open-source analytics tools compared",
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
