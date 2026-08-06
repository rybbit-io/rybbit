import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const plausibleComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: "Basic" },
      { name: "Funnels", rybbitValue: "All plans", competitorValue: "Business plan only" },
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
    "Rybbit shares Plausible's commitment to privacy and simplicity but goes significantly further. You get advanced analytics features including session replay, funnel analysis, user journey visualization with Sankey diagrams, Web Vitals monitoring, and error tracking. Beyond visit counts, you can see how people navigate your site, where they drop off, and what errors they encounter.",
    "Both platforms are open source and self-hostable, and both run on ClickHouse; Rybbit's stack is TypeScript, Plausible's is Elixir. Rybbit uses events-based pricing that includes all interaction types, while Plausible charges by pageviews only. If you like Plausible's privacy-first approach but need deeper analytics to grow your product, Rybbit gives you that depth without giving up simplicity.",
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
      "7-day free trial, card charged after the trial",
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

  deepDive: {
    title: "Plausible vs Rybbit, in depth",
    sections: [
      {
        heading: "Two philosophies of privacy-first analytics",
        paragraphs: [
          <>
            Plausible deserves real credit here: it pioneered the modern privacy-first analytics category and proved
            that teams would pay for cookieless traffic stats instead of tolerating Google Analytics. Its scope is
            deliberately minimal: a clean dashboard of pageviews, sources, and goals, with no session replay, no
            error tracking, and no user profiles. That restraint is a feature, not an oversight; Plausible has never
            pretended to be a product-analytics tool.
          </>,
          <>
            Rybbit starts from the same privacy foundation (cookieless tracking with a daily-rotating salt, open
            source, free to <Link href="/docs/self-hosting">self-host</Link>) but takes the opposite position on
            scope. It ships <Link href="/features/session-replay">session replay</Link>,{" "}
            <Link href="/features/funnels">funnels</Link>,{" "}
            <Link href="/features/user-journeys">user journeys</Link>, error tracking, Web Vitals, and user profiles as
            part of the core product. The honest framing: Plausible tells you how much traffic you got and where it
            came from; Rybbit also shows you what visitors did once they arrived, where they dropped off, and what
            broke.
          </>,
        ],
      },
      {
        heading: "Pageviews with per-site caps vs events with everything included",
        paragraphs: [
          <>
            Plausible prices by monthly pageviews, with plan tiers gating sites and seats: Starter is $9/month for 10k
            pageviews and a single site, Growth is $14/month for 3 sites and 3 team members, and Business is $19/month
            for 10 sites and 10 members, with 2 months free if you pay annually. It&apos;s cheap to start, but growing
            past a site or seat cap means a plan change even if your traffic hasn&apos;t moved.
          </>,
          <>
            Rybbit prices by events (from $19/month for 100k events), and every plan includes every
            feature, with session replay available on Pro. There are no per-site or per-seat tiers to outgrow; paying
            more buys volume, not features. At low traffic Plausible is the cheaper bill; once you&apos;d otherwise be
            paying for replay, funnels, and error tracking as separate tools, the math flips. Full details are on the{" "}
            <Link href="/pricing">pricing page</Link>. And both products keep an honest exit: Plausible&apos;s
            Community Edition and Rybbit&apos;s open-source version are each free to self-host.
          </>,
        ],
      },
      {
        heading: "Switching from Plausible to Rybbit",
        paragraphs: [
          <>
            This is one migration where you don&apos;t start from zero: Rybbit has a built-in data importer for
            Plausible, so your historical traffic comes with you instead of living in an old dashboard forever.
          </>,
          <ol>
            <li>
              Add the Rybbit tracking script alongside Plausible&apos;s. Both are lightweight, and running them
              in parallel for a while costs nothing but a few kilobytes.
            </li>
            <li>
              Import your Plausible history with the <Link href="/docs">data importer</Link>, so year-over-year
              comparisons keep working from day one.
            </li>
            <li>Recreate your goals as Rybbit goals and custom events; the setup is similarly simple.</li>
            <li>
              Compare a few weeks of live numbers; they should track closely, since both tools are cookieless.
              Then remove the Plausible script.
            </li>
          </ol>,
        ],
      },
      {
        heading: "When Plausible is the better choice",
        paragraphs: [
          <>
            If a traffic dashboard is genuinely all you want, Plausible is an excellent one, arguably the best
            at being exactly that. It has the longest track record in the category, an EU-owned and EU-hosted cloud, a
            famously tiny script (Plausible advertises it as 54&times; smaller than Google Analytics; Rybbit&apos;s is
            around 18KB), and a 30-day trial with no card required versus Rybbit&apos;s 7 days. Choosing it means
            deliberately not having session replay, funnels, or error tracking, and for plenty of content sites
            and blogs, that&apos;s the right call. If you&apos;re weighing more options than these two, our roundup of
            the <Link href="/blog/best-google-analytics-alternatives">best Google Analytics alternatives</Link> covers
            the wider field.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

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
      description: "Focused analytics vs a full product suite",
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
