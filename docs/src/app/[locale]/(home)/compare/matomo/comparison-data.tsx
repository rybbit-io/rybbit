import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const matomoComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: true },
      { name: "Funnels", rybbitValue: true, competitorValue: true },
      { name: "User journeys (Sankey)", rybbitValue: true, competitorValue: false },
      { name: "Conversion goals", rybbitValue: true, competitorValue: true },
      { name: "UTM tracking", rybbitValue: true, competitorValue: true },
      { name: "Public dashboards", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      { name: "Session Replay", rybbitValue: true, competitorValue: true },
      { name: "User profiles", rybbitValue: true, competitorValue: true },
      { name: "Web Vitals monitoring", rybbitValue: true, competitorValue: false },
      { name: "Error tracking", rybbitValue: true, competitorValue: false },
      { name: "Real-time globe view", rybbitValue: true, competitorValue: false },
      { name: "Autocapture", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      { name: "Cookie-free tracking", rybbitValue: true, competitorValue: "Optional" },
      { name: "No personal data collection", rybbitValue: true, competitorValue: false },
      { name: "Daily rotating salt", rybbitValue: true, competitorValue: false },
      { name: "Open source", rybbitValue: true, competitorValue: true },
      { name: "Self-hostable", rybbitValue: true, competitorValue: true },
    ],
  },
  {
    title: "Technical & Pricing",
    features: [
      { name: "Script size", rybbitValue: "18KB", competitorValue: "20-50KB" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: false },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "\u20AC29/mo (50k hits)" },
    ],
  },
];

export const matomoExtendedData = {
  subtitle: "Rybbit is the modern, simple alternative to Matomo: no PHP, no complex setup, and privacy-first by default.",

  introHeading: "Why consider Rybbit over Matomo?",
  introParagraphs: [
    "Matomo (formerly Piwik) has been around since 2007 and positions itself as the open-source Google Analytics alternative. It's feature-rich with 70+ reports, heatmaps, A/B testing, and form analytics. But that breadth comes with Google Analytics-level complexity, and most teams need training just to find the metrics they care about, and the PHP/MySQL stack feels increasingly dated.",
    "Rybbit is built the way a modern analytics tool should be. A single-page dashboard shows all essential metrics on one screen, with no training required. Privacy works by default: no cookies, no consent banners, no configuration needed. The stack (TypeScript, ClickHouse) is built for performance, and the managed cloud option means zero server maintenance. You get session replay, user journeys, Web Vitals, and error tracking without installing plugins.",
    "Matomo's cloud pricing starts at €29/month for just 50k hits, and many useful features require paid plugins on top of that. Rybbit starts at $19/month with all features included. If you're tired of Matomo's complexity, maintenance burden, or plugin costs, Rybbit is a much simpler path to the analytics your team actually needs.",
  ],

  chooseRybbit: [
    "You want a simple single-page dashboard with no training required",
    "You need privacy by default, with no cookie consent configuration needed",
    "You prefer a modern tech stack (Next.js/ClickHouse) over legacy PHP",
    "You want cloud hosting with zero maintenance",
    "You need session replay, user journeys, and Web Vitals built in",
    "You want a 7-day free trial to evaluate before committing",
  ],

  chooseCompetitor: [
    "You need heatmaps, A/B testing, or form analytics",
    "You have strict on-premise requirements for compliance",
    "You rely on the WordPress plugin ecosystem",
    "You need a Google Analytics data import tool",
    "You want a custom report builder with 70+ report types",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, card charged after the trial",
      "All features included on every plan",
      "Session replay available on Pro plan",
      "Zero maintenance cloud hosting",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "Matomo Cloud",
    model: "Hit-based pricing",
    startingPrice: "\u20AC29/mo",
    highlights: [
      "Starts at 50k hits/month",
      "On-Premise edition available for free (self-host)",
      "Many features require paid plugins on top",
      "Self-hosting requires server maintenance",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "Matomo vs Rybbit, in depth",
    sections: [
      {
        heading: "Two decades of analytics, and it shows",
        paragraphs: [
          <>
            Matomo deserves respect. Launched as Piwik nearly two decades ago, it proved that self-hosted, open-source
            analytics could be a real Google Analytics alternative, and today it has the largest feature surface in the
            category: heatmaps, A/B testing, a tag manager, and hundreds of plugins. It&apos;s the tool compliance
            departments already know, with no data sampling, EU hosting in Frankfurt, 24 months of raw data retention
            on cloud, and report data kept forever. If your requirement is the broadest possible self-hosted suite with
            the longest audit trail, Matomo is a defensible default.
          </>,
          <>
            But two decades of accretion show up in the product. Matomo&apos;s interface spreads dozens of report types
            across many sections, and its architecture predates the tooling that makes modern analytics fast and
            pleasant. Rybbit is what this category looks like when it&apos;s designed in the 2020s: a single-page
            dashboard, an ~18KB script, and <Link href="/features/funnels">funnels</Link>,{" "}
            <Link href="/features/session-replay">session replay</Link>, user journeys, error tracking, Web Vitals, and
            user profiles built into the core product rather than bolted on over the years.
          </>,
        ],
      },
      {
        heading: "“Free self-hosting” and the plugin-bundle math",
        paragraphs: [
          <>
            Matomo&apos;s On-Premise Community Edition is genuinely free forever, with unlimited users and hits,
            a real point in its favor. The catch is what happens when you want the advanced features. On self-hosted
            Matomo, those come as paid plugin bundles: the Team bundle starts at &euro;275 for 4 users and 5M hits per
            month, Business runs &euro;1,450, and Enterprise &euro;3,400. &ldquo;Free&rdquo; quietly becomes a
            line-item negotiation over which capabilities your deployment is licensed for.
          </>,
          <>
            Rybbit&apos;s model is simpler on both sides. <Link href="/docs/self-hosting">Self-hosting</Link> is free,
            open source, deploys with Docker, and includes every feature: there are no plugin bundles to buy.
            Cloud <Link href="/pricing">pricing</Link> starts at $19/month for 100k events with all features on every
            plan and a 7-day trial. Matomo Cloud scales through hit-based tiers from 50k up past 10M (contact sales
            above that), with Business-tier caps of 30 websites, 30 team members, and 100 segments.
          </>,
        ],
      },
      {
        heading: "Cookieless by design vs cookieless by configuration",
        paragraphs: [
          <>
            Matomo can run without cookies. It&apos;s a supported configuration, and the company takes privacy
            seriously. But it&apos;s a configuration, not the default posture, and many real-world Matomo deployments
            (especially older ones) still set cookies and still ship a consent flow. Rybbit doesn&apos;t have a
            cookie mode to turn off: it&apos;s cookieless only, identifying visitors with a salted hash whose salt
            rotates daily, so there&apos;s no persistent identifier to consent to in the first place. That difference
            matters less for the compliance paperwork and more for the data: no consent banner means no consent-decline
            gap in your numbers.
          </>,
        ],
      },
      {
        heading: "Switching from Matomo to Rybbit",
        paragraphs: [
          <>
            Rybbit doesn&apos;t currently import Matomo data (its importers cover Plausible, Umami, and Simple
            Analytics), so the practical path is to run both in parallel:
          </>,
          <ol>
            <li>
              Add the Rybbit tracking script alongside your existing Matomo tag. The two don&apos;t conflict,
              and data appears in minutes.
            </li>
            <li>
              Recreate your Matomo goals and key events in Rybbit, and compare a few weeks of numbers side by side.
            </li>
            <li>
              When you&apos;re confident, remove the Matomo tag, but keep your Matomo instance (or a database
              archive) queryable rather than deleting it, so historical reports stay available.
            </li>
          </ol>,
          <>
            If you&apos;re evaluating the wider field before deciding, our rundown of the{" "}
            <Link href="/blog/best-google-analytics-alternatives">best Google Analytics alternatives</Link> covers how
            Matomo, Rybbit, and the rest of the category compare.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

  faqItems: [
    {
      question: "Is Rybbit really simpler than Matomo?",
      answer: "Yes. Matomo has 70+ reports across 12 sections, inheriting Google Analytics-style complexity. Rybbit shows all essential metrics on a single dashboard. Your team can start using Rybbit immediately without training.",
    },
    {
      question: "Does Rybbit require cookies like Matomo?",
      answer: "No. Rybbit is cookie-free by default and never requires consent banners. Matomo uses cookies by default and requires configuration to achieve cookieless tracking, which can reduce its accuracy.",
    },
    {
      question: "How does self-hosting compare?",
      answer: "Rybbit uses a modern stack (TypeScript, ClickHouse) and is straightforward to deploy with Docker. Matomo runs on PHP/MySQL, which is widely supported but requires ongoing maintenance, updates, and security patches. Rybbit also offers a managed cloud option.",
    },
    {
      question: "Can I migrate from Matomo to Rybbit?",
      answer: "Yes. Add Rybbit's script tag to your site and data starts flowing immediately. You can run both tools in parallel during the transition. Rybbit's simpler setup means you'll be collecting data within minutes.",
    },
    {
      question: "Does Matomo have features Rybbit doesn't?",
      answer: "Yes, Matomo offers heatmaps, A/B testing, form analytics, and a custom report builder that Rybbit doesn't have. However, many of these require paid plugins. Rybbit focuses on delivering the analytics features most teams actually need, with a much simpler experience.",
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
      description: "Focused analytics vs a full product suite",
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
