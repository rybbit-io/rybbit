import { ComparisonSection, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const plausibleComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: "Basic" },
      { name: "Funnels", rybbitValue: true, competitorValue: false },
      { name: "User journeys (Sankey)", rybbitValue: true, competitorValue: false },
      { name: "Conversion goals", rybbitValue: true, competitorValue: true },
      { name: "UTM tracking", rybbitValue: true, competitorValue: true },
      { name: "Public dashboards", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      { name: "Session Replay", rybbitValue: true, competitorValue: false },
      { name: "User profiles", rybbitValue: true, competitorValue: false },
      { name: "Web Vitals monitoring", rybbitValue: true, competitorValue: false },
      { name: "Error tracking", rybbitValue: true, competitorValue: false },
      { name: "Real-time globe view", rybbitValue: true, competitorValue: false },
      { name: "Autocapture", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      { name: "Cookie-free tracking", rybbitValue: true, competitorValue: true },
      { name: "No personal data collection", rybbitValue: true, competitorValue: true },
      { name: "Daily rotating salt", rybbitValue: true, competitorValue: false },
      { name: "Open source", rybbitValue: true, competitorValue: true },
      { name: "Self-hostable", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Technical & Pricing",
    features: [
      { name: "Script size", rybbitValue: "18KB", competitorValue: "~5KB" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: true },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "$9/mo" },
    ],
  },
];

export const plausibleExtendedData = {
  subtitle: "Both are privacy-first, but Rybbit offers session replay, funnels, and user journeys that Plausible doesn't.",

  introHeading: "Why consider Rybbit over Plausible?",
  introParagraphs: [
    "Plausible is a well-respected privacy-first analytics tool known for its clean dashboard and lightweight script. It's a great choice for websites that want simple traffic metrics without cookies or consent banners. But Plausible is intentionally limited to basic web analytics: no session replay, no funnel analysis, no user journey visualization, and no error tracking.",
    "Rybbit shares Plausible's commitment to privacy and simplicity but goes significantly further. You get advanced analytics features including session replay, funnel analysis, user journey visualization with Sankey diagrams, Web Vitals monitoring, and error tracking. This means you can understand not just how many visitors you get, but how they navigate your site, where they drop off, and what errors they encounter.",
    "Both platforms are open source and self-hostable, but Rybbit uses ClickHouse for superior query performance at scale while Plausible relies on Elixir/ClickHouse. Pricing starts at the same $19/month, but Rybbit uses events-based pricing which includes all interaction types, while Plausible charges by pageviews only. If you love Plausible's privacy-first approach but need deeper analytics to grow your product, Rybbit gives you that depth without sacrificing simplicity.",
  ],

  chooseRybbit: [
    "You need advanced features like session replay and funnels",
    "You want user journey visualization (Sankey diagrams)",
    "You need error tracking and Web Vitals monitoring",
    "You want events-based pricing instead of pageview-based",
    "You need organization support with team roles",
    "You want a daily rotating salt option for extra privacy",
  ],

  chooseCompetitor: [
    "You want the simplest possible analytics dashboard",
    "You prefer a more established product with a longer track record",
    "You only need basic pageview and source tracking",
    "You want unlimited data retention on all plans",
    "You prefer Elixir/Phoenix over TypeScript for self-hosting",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, no credit card required",
      "Session replay available on Pro plan",
      "Funnels, user journeys, and error tracking included",
      "Unlimited team members and websites",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "Plausible",
    model: "Pageview-based pricing",
    startingPrice: "$9/mo",
    highlights: [
      "30-day free trial available",
      "Starts at 10k monthly pageviews",
      "All features included on every plan",
      "Self-hosted Community Edition is free",
    ],
  } satisfies PricingInfo,

  faqItems: [
    {
      question: "How is Rybbit different from Plausible?",
      answer: "Both are privacy-first and open source, but Rybbit includes advanced features that Plausible doesn't offer: session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, and user profiles.",
    },
    {
      question: "Is Rybbit as easy to use as Plausible?",
      answer: "Yes. Rybbit is designed to be just as simple for basic analytics, with a clean single-page dashboard. The advanced features like funnels and session replay are there when you need them but don't add complexity to the core experience.",
    },
    {
      question: "How does pricing compare between Rybbit and Plausible?",
      answer: "Plausible starts at $9/month for 10k pageviews, while Rybbit starts at $19/month. The key difference is that Rybbit uses events-based pricing (which includes pageviews, custom events, and more) and includes advanced features like session replay, funnels, and error tracking that Plausible doesn't offer at any price.",
    },
    {
      question: "Can I self-host Rybbit like Plausible?",
      answer: "Yes, Rybbit is fully self-hostable under the AGPL v3 license. Both use ClickHouse for fast analytics queries. Rybbit's stack is TypeScript-based, while Plausible uses Elixir.",
    },
    {
      question: "Does Rybbit have session replay?",
      answer: "Yes, session replay is one of the biggest differentiators. Rybbit offers session replay on the Pro plan, allowing you to watch how users interact with your site. Plausible does not offer this feature at any price point.",
    },
  ] satisfies FAQItem[],

  relatedResources: [
    {
      title: "Rybbit vs Google Analytics",
      href: "/compare/google-analytics",
      description: "The privacy-first alternative to GA4",
    },
    {
      title: "Rybbit vs PostHog",
      href: "/compare/posthog",
      description: "Focused analytics vs all-in-one product suite",
    },
    {
      title: "Rybbit vs Fathom",
      href: "/compare/fathom",
      description: "Compare two privacy-focused analytics tools",
    },
    {
      title: "Rybbit vs Simple Analytics",
      href: "/compare/simpleanalytics",
      description: "Feature-rich vs minimal analytics",
    },
    {
      title: "Getting started with Rybbit",
      href: "/docs",
      description: "Set up Rybbit in under 5 minutes",
    },
    {
      title: "Pricing",
      href: "/pricing",
      description: "Simple, transparent pricing for every team size",
    },
  ] satisfies RelatedResource[],
};
