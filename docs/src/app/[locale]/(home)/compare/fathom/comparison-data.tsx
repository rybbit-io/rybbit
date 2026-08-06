import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const fathomComparisonData: ComparisonSection[] = [
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
      { name: "Open source", rybbitValue: true, competitorValue: false },
      { name: "Self-hostable", rybbitValue: true, competitorValue: false },
    ],
  },
  {
    title: "Technical & Pricing",
    features: [
      { name: "Script size", rybbitValue: "18KB", competitorValue: "~2KB" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: true },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "$15/mo" },
    ],
  },
];

export const fathomExtendedData = {
  subtitle: "Both are privacy-first, but Rybbit is open source with session replay, funnels, and self-hosting that Fathom doesn't offer.",

  introHeading: "Why consider Rybbit over Fathom?",
  introParagraphs: [
    "Fathom Analytics is a well-respected privacy-first analytics tool known for its clean interface and cookie-free tracking. It's a solid choice for websites that need simple traffic metrics without the complexity of Google Analytics. But Fathom is intentionally limited to basic web analytics: no session replay, no funnel analysis, no user journey visualization, and it's entirely closed-source with no self-hosting option.",
    "Rybbit shares Fathom's commitment to privacy and simplicity but extends far beyond basic web metrics. You get session replay to see exactly how users interact with your site, funnel analysis to identify conversion bottlenecks, user journey visualization with Sankey diagrams, Web Vitals monitoring, and error tracking. This means you can see how visitors convert, where they drop off, and what issues they encounter, on top of the raw visit counts.",
    "Transparency is another major difference. Rybbit is fully open source under the AGPL v3 license: you can inspect every line of code and self-host on your own infrastructure. Fathom is proprietary and cloud-only, so you're trusting their claims about data handling without the ability to verify. If you love Fathom's privacy-first approach but need deeper analytics, code transparency, and the freedom to self-host, Rybbit gives you all of that.",
  ],

  chooseRybbit: [
    "You want open-source software you can audit and self-host",
    "You need session replay, funnels, and user journey visualization",
    "You want a 7-day free trial to evaluate before committing",
    "You need error tracking and Web Vitals monitoring",
    "You prefer events-based pricing over pageview-based",
    "You want full code transparency (AGPL v3)",
  ],

  chooseCompetitor: [
    "You want the smallest possible tracking script (2KB)",
    "You prefer a more established product with a longer track record",
    "You only need basic pageview and conversion tracking",
    "You don't want to worry about self-hosting or infrastructure",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, card charged after the trial",
      "Session replay available on Pro plan",
      "Funnels, user journeys, and error tracking included",
      "Self-hosting option available (free)",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "Fathom",
    model: "Pageview-based pricing",
    startingPrice: "$15/mo",
    highlights: [
      "Starts at 100k pageviews/month",
      "No free tier available",
      "All features included on every plan",
      "Cloud-only, no self-hosting option",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "Fathom vs Rybbit, in depth",
    sections: [
      {
        heading: "Two privacy-first tools, two philosophies",
        paragraphs: [
          <>
            Fathom deserves real credit: it&apos;s one of the founders of the privacy-analytics category, and it has
            run as a profitable, independent company for years while bigger players came and went. If you&apos;re
            leaving Google Analytics for something cookieless and simple, Fathom is a legitimate destination.
            We&apos;ve said as much in our roundup of{" "}
            <Link href="/blog/best-google-analytics-alternatives">the best Google Analytics alternatives</Link>.
          </>,
          <>
            The two products just make different bets. Fathom bets that most site owners want one clean page of
            traffic numbers from the most stable, boring vendor possible, and deliberately stops there. Rybbit
            starts from the same privacy foundation (cookieless tracking, no personal data, visitor hashes rotated
            daily) but bets that once you see the numbers move, you&apos;ll want to know <em>why</em>. Which bet is
            right depends on you, not on either product being wrong.
          </>,
        ],
      },
      {
        heading: "Deliberate simplicity vs. behavioral depth",
        paragraphs: [
          <>
            Fathom&apos;s simplicity is a feature, not a gap: pageviews, referrers, UTM tracking, and
            conversion goals on a single screen, with a tracking script around 2KB. If that&apos;s the whole job,
            Fathom does it very well.
          </>,
          <>
            Rybbit covers the same dashboard basics, then adds the layer Fathom deliberately leaves out:{" "}
            <Link href="/features/session-replay">session replay</Link> to watch real sessions, funnels to find where
            signups stall, user journey (Sankey) visualization, <Link href="/features/error-tracking">error
            tracking</Link>, Web Vitals monitoring, and user profiles. Rybbit&apos;s script is bigger (~18KB) because
            it does more. That&apos;s the honest trade. There&apos;s also an ownership difference with no
            trade-off attached: Rybbit is open source and can be{" "}
            <Link href="/docs/self-hosting">self-hosted for free</Link>, while Fathom is closed-source and
            SaaS-only: there is no way to run it on your own infrastructure.
          </>,
        ],
      },
      {
        heading: "Pricing shape: a pageview slider vs. events with everything included",
        paragraphs: [
          <>
            Fathom prices on a pageview slider: you pick a monthly pageview tier and pay more as traffic grows.
            At 500k pageviews it&apos;s $45/month. There&apos;s a 7-day trial but explicitly no free tier
            (&ldquo;Do you have a lower/free option? Nope&rdquo; is a real answer on their FAQ). The generous parts are
            real, too: every plan includes at least 50 sites (extra sites are $10/month per 50), data is retained
            forever, and paying annually gets you two months free. For an agency running dozens of low-traffic sites,
            that 50-site allowance is genuinely hard to beat.
          </>,
          <>
            Rybbit prices on events instead, starting at{" "}
            <Link href="/pricing">$19/month for 100k events</Link> with a 7-day trial. Every feature,
            including session replay, funnels, and error tracking, is on every plan, so you never move up a tier to
            get a capability. And if the subscription ever stops making sense, the open-source version is a real
            exit: self-host it and pay nothing. Fathom, being closed-source, can&apos;t offer that pressure valve.
          </>,
        ],
      },
      {
        heading: "Switching from Fathom to Rybbit",
        paragraphs: [
          <>
            Rybbit&apos;s historical-data importers currently cover Plausible, Umami, and Simple Analytics;
            there is no Fathom importer yet. So the switch is the classic parallel run:
          </>,
          <ol>
            <li>
              Add the Rybbit <Link href="/docs/script">tracking script</Link> alongside Fathom&apos;s. The two
              don&apos;t conflict, and data appears in minutes.
            </li>
            <li>
              Recreate your Fathom events and conversions as Rybbit <Link href="/docs/goals">goals</Link> and{" "}
              <Link href="/docs/track-events">custom events</Link>.
            </li>
            <li>
              Compare a few weeks of numbers. Since both tools are cookieless and resistant to ad blockers, expect
              them to track closely. This is mostly a sanity check, not a reconciliation project.
            </li>
            <li>
              Remove the Fathom script when you&apos;re confident. Your history stays in your Fathom account for
              reference as long as you keep it.
            </li>
          </ol>,
        ],
      },
    ],
  } satisfies DeepDive,

  faqItems: [
    {
      question: "Is Rybbit open source while Fathom is not?",
      answer: "Yes. Rybbit is fully open source under the AGPL v3 license, meaning you can inspect the code, self-host it, and verify exactly how your data is handled. Fathom is proprietary and closed-source, so you have to trust their claims about data handling.",
    },
    {
      question: "What features does Rybbit have that Fathom doesn't?",
      answer: "Rybbit includes session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, user profiles, and sessions tracking. Fathom focuses on basic pageview and conversion analytics.",
    },
    {
      question: "How does pricing compare between Rybbit and Fathom?",
      answer: "Rybbit starts at $19/month with events-based pricing and a 7-day free trial. Fathom starts at $15/month with pageview-based pricing. Rybbit includes significantly more features at a comparable price point, including session replay, funnels, and error tracking.",
    },
    {
      question: "Can I self-host Rybbit like I can with other tools?",
      answer: "Yes, Rybbit is fully self-hostable. Fathom does not offer self-hosting at all. If data sovereignty and infrastructure control matter to you, Rybbit gives you the option to run everything on your own servers.",
    },
    {
      question: "Is it easy to switch from Fathom to Rybbit?",
      answer: "Yes. Just add Rybbit's script tag to your site and data starts collecting immediately. You can run both in parallel during the transition. The setup takes less than 5 minutes.",
    },
  ] satisfies FAQItem[],

  relatedResources: [
    {
      title: "Rybbit vs Plausible",
      href: "/compare/plausible",
      description: "Compare two privacy-first analytics platforms",
    },
    {
      title: "Rybbit vs Simple Analytics",
      href: "/compare/simpleanalytics",
      description: "Feature-rich vs minimal analytics",
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
