import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const googleAnalyticsComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: true },
      { name: "Funnels", rybbitValue: true, competitorValue: true },
      { name: "User journeys (Sankey)", rybbitValue: true, competitorValue: true },
      { name: "Conversion goals", rybbitValue: true, competitorValue: true },
      { name: "UTM tracking", rybbitValue: true, competitorValue: true },
      { name: "Public dashboards", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      { name: "Session Replay", rybbitValue: true, competitorValue: false },
      { name: "User profiles", rybbitValue: true, competitorValue: false },
      { name: "Web Vitals monitoring", rybbitValue: true, competitorValue: true },
      { name: "Error tracking", rybbitValue: true, competitorValue: false },
      { name: "Real-time globe view", rybbitValue: true, competitorValue: false },
      { name: "Autocapture", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      { name: "Cookie-free tracking", rybbitValue: true, competitorValue: false },
      { name: "No personal data collection", rybbitValue: true, competitorValue: false },
      { name: "Daily rotating salt", rybbitValue: true, competitorValue: false },
      { name: "Open source", rybbitValue: true, competitorValue: false },
      { name: "Self-hostable", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Technical & Pricing",
    features: [
      { name: "Script size", rybbitValue: "18KB", competitorValue: "371KB" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: false },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "Free" },
    ],
  },
];

export const googleAnalyticsExtendedData = {
  subtitle: "An open-source, cookie-free analytics tool that drops GA4's consent banners and data sampling.",

  introHeading: "Why consider Rybbit over Google Analytics?",
  introParagraphs: [
    "Google Analytics is the default choice for most websites, but that doesn't mean it's the best one. GA4's transition left many teams frustrated with a steep learning curve, confusing interface, and data sampling that makes reports unreliable at scale. Meanwhile, privacy regulations like GDPR have made GA4's cookie-dependent tracking a liability, and multiple EU countries have ruled it non-compliant.",
    "Rybbit works differently. Instead of harvesting user data to power an ad network, it exists only to give you accurate analytics. It's cookie-free by default, so you never need consent banners. The single-page dashboard shows what your team needs without digging through 150+ reports. And because it's open source, you can verify exactly how your data is handled.",
    "The feature gap isn't what you'd expect either. Rybbit includes session replay, funnel analysis, user journey visualization, and real-time data without sampling, all capabilities that GA4 either lacks or locks behind the $50,000/year GA360 tier. For teams that want depth without the complexity, privacy concerns, or vendor lock-in, Rybbit covers what GA4 leaves out.",
  ],

  chooseRybbit: [
    "You want privacy-first analytics without cookie banners",
    "You need a simple dashboard your whole team can understand",
    "You want to self-host and own 100% of your data",
    "You need session replay, funnels, and user journeys in one tool",
    "You want accurate data without sampling or ad-blocker issues",
    "You prefer open-source software with transparent pricing",
  ],

  chooseCompetitor: [
    "You need deep integration with Google Ads and the Google ecosystem",
    "You require highly customizable reports and dashboards",
    "You need free analytics for very high-traffic sites",
    "Your organization already has workflows built around GA4",
    "You need advanced attribution modeling for paid campaigns",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, card charged after the trial",
      "All features included on every plan",
      "Session replay available on Pro plan",
      "Unlimited team members",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "Google Analytics",
    model: "Free (ad-supported)",
    startingPrice: "Free",
    highlights: [
      "Free for most websites",
      "GA360 starts at ~$50,000/year for enterprises",
      "Data used to power Google's ad network",
      "Limited data retention (2-14 months)",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "Google Analytics vs Rybbit, in depth",
    sections: [
      {
        heading: "What “free” actually costs you",
        paragraphs: [
          <>
            GA4 is free because your visitors&apos; data feeds Google&apos;s advertising business. The practical costs
            show up elsewhere. Because GA4 relies on cookies, GDPR and ePrivacy require a consent banner in most of the
            world, and a large share of visitors decline or ignore it, so the sessions they represent never reach
            your reports. Teams switching to cookieless analytics routinely discover their real traffic is 30&ndash;60%
            higher than GA4 showed.
          </>,
          <>
            On top of consent loss, GA4 applies sampling to complex reports on busy properties, holds standard-property
            event data for at most 14 months, and locks unsampled exploration behind GA360, which starts around
            $50,000 per year. Rybbit&apos;s <Link href="/pricing">pricing</Link> is a flat, events-based subscription:
            every feature on every plan, no sampling at any traffic level, and your data is never used for anything
            except showing you your analytics.
          </>,
        ],
      },
      {
        heading: "Feature depth is closer than you'd think",
        paragraphs: [
          <>
            The common objection to leaving Google Analytics is losing capability. In 2026 the gap mostly runs the
            other way for product and marketing teams: Rybbit ships{" "}
            <Link href="/features/session-replay">session replay</Link>, <Link href="/features/funnels">funnels</Link>,{" "}
            <Link href="/features/user-journeys">user journey (Sankey) visualization</Link>,{" "}
            <Link href="/features/error-tracking">error tracking</Link>, and{" "}
            <Link href="/features/web-vitals">Web Vitals monitoring</Link> as part of the core product. GA4 offers none
            of these; Google&apos;s answer to replay and heatmaps has always been third-party tools.
          </>,
          <>
            What GA4 genuinely does better is the Google ecosystem: bidirectional Google Ads integration, BigQuery
            export, and advanced attribution modeling for paid campaigns. If your team lives in Google Ads, keeping GA4
            for ad attribution while running Rybbit as your source of truth for real traffic is a reasonable setup;
            the two scripts don&apos;t conflict.
          </>,
        ],
      },
      {
        heading: "How to switch from Google Analytics to Rybbit",
        paragraphs: [
          <>
            There is no historical-data import from GA4 (Google&apos;s export goes to BigQuery, not to other analytics
            tools), so the standard path is to run both in parallel:
          </>,
          <ol>
            <li>
              Add the Rybbit <Link href="/docs/script">tracking script</Link>: one tag, and data appears in
              minutes. Keep GA4 running alongside it.
            </li>
            <li>
              Recreate your conversions as Rybbit <Link href="/docs/goals">goals</Link> and{" "}
              <Link href="/docs/track-events">custom events</Link>. Most teams find they need far fewer events than
              GA4&apos;s model pushed them into.
            </li>
            <li>
              Compare a few weeks of numbers. Expect Rybbit to report noticeably more traffic. That&apos;s the
              consent-banner and ad-blocker loss GA4 never showed you.
            </li>
            <li>
              If you need the history, export your GA4 property to BigQuery for archival before Google&apos;s retention
              window trims it. Then remove the GA tag, and the cookie banner with it.
            </li>
          </ol>,
        ],
      },
      {
        heading: "The compliance angle",
        paragraphs: [
          <>
            Multiple EU data-protection authorities (Austria, France, and Italy among them) have ruled that Google
            Analytics transfers violated GDPR, and enforcement keeps tightening. Rybbit sidesteps the whole category of
            risk: no cookies, no persistent identifiers, no personal data collection, with visitor hashes rotated
            daily. You can run it with no consent banner at all, or go further and{" "}
            <Link href="/docs/self-hosting">self-host the open-source version</Link> so analytics data never leaves
            your own infrastructure.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

  faqItems: [
    {
      question: "Is it hard to migrate from Google Analytics to Rybbit?",
      answer: "Rybbit uses a single script tag, so add it to your site and you'll start collecting data immediately. There's no need to remove GA4 right away; you can run both in parallel to compare.",
    },
    {
      question: "Will I lose historical data if I switch?",
      answer: "Rybbit starts collecting data from the moment you install it, so there's no migration of historical GA data. Many teams run both tools in parallel for a transition period before fully switching.",
    },
    {
      question: "Does Rybbit work without cookies like GA4's consent mode?",
      answer: "Yes, but differently. Rybbit is cookie-free by default, so no consent mode is needed. You never need to show a cookie banner for Rybbit, which means you capture 100% of your visitors without any consent friction.",
    },
    {
      question: "Can Rybbit track conversions and goals like GA4?",
      answer: "Yes. Rybbit supports conversion goals, funnels, and custom events with attributes. While the setup is simpler than GA4's event configuration, you get the same core conversion tracking capabilities.",
    },
    {
      question: "Does Rybbit offer real-time analytics?",
      answer: "Yes, Rybbit provides real-time data with no sampling. Unlike GA4 which may sample data on high-traffic properties, Rybbit shows every event as it happens.",
    },
  ] satisfies FAQItem[],

  relatedResources: [
    {
      title: "The 9 Best Google Analytics Alternatives in 2026",
      href: "/blog/best-google-analytics-alternatives",
      description: "How Rybbit and 8 other GA4 alternatives compare on pricing, privacy, and features",
    },
    {
      title: "Rybbit vs Plausible",
      href: "/compare/plausible",
      description: "Compare two privacy-first analytics platforms",
    },
    {
      title: "Rybbit vs PostHog",
      href: "/compare/posthog",
      description: "Focused analytics vs a full product suite",
    },
    {
      title: "Rybbit vs Matomo",
      href: "/compare/matomo",
      description: "Modern analytics vs the legacy GA alternative",
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
