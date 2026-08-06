import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const umamiComparisonData: ComparisonSection[] = [
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
      { name: "Session Replay", rybbitValue: true, competitorValue: false },
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
      { name: "Script size", rybbitValue: "18KB", competitorValue: "~2KB" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: true },
      { name: "API access", rybbitValue: true, competitorValue: true },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "Free (Hobby)" },
    ],
  },
];

export const umamiExtendedData = {
  subtitle: "Both are open source and privacy-first, but Rybbit offers session replay, funnels, and user journeys that Umami doesn't.",

  introHeading: "Why consider Rybbit over Umami?",
  introParagraphs: [
    "Umami is a popular open-source analytics tool known for its tiny 2KB script and simple, clean interface. It's a solid choice for personal blogs and small sites that just need basic traffic metrics. But Umami's simplicity comes at the cost of advanced features: no session replay, no error tracking, no Web Vitals monitoring, and limited organization support for teams.",
    "Rybbit shares Umami's open-source DNA and privacy-first values but offers a much deeper feature set. You get session replay to watch how users interact with your site, funnel analysis to find conversion bottlenecks, user journey visualization with Sankey diagrams, and error tracking to catch issues before your users report them, without giving up the clean dashboard that draws people to simpler tools.",
    "On the technical side, Rybbit uses ClickHouse for analytics queries, delivering fast performance even at high traffic volumes. Umami supports PostgreSQL and MySQL for self-hosting, which may be more familiar but can struggle with large datasets. Rybbit also offers a mature managed cloud service, so you don't have to maintain infrastructure if you'd rather not. If you've outgrown Umami's basic metrics and need analytics that can grow with your product, Rybbit is the natural next step.",
  ],

  chooseRybbit: [
    "You need session replay to see how users interact with your site",
    "You want error tracking and Web Vitals monitoring built in",
    "You need organization support with team roles and permissions",
    "You want a daily rotating salt option for extra privacy",
    "You need ClickHouse performance for high-traffic analytics",
    "You want a real-time globe view of your visitors",
  ],

  chooseCompetitor: [
    "You want the smallest possible tracking script (2KB)",
    "You prefer PostgreSQL or MySQL over ClickHouse for self-hosting",
    "You only need basic pageview and event tracking",
    "You want a completely free self-hosted solution with no limits",
    "You're running a personal blog or lightweight content site",
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
    name: "Umami",
    model: "Free tier + paid cloud",
    startingPrice: "Free",
    highlights: [
      "Cloud Hobby plan is free forever",
      "Pro plan at $20/mo for 1M events",
      "14-day free trial on paid plans",
      "Self-hosted version is completely free (MIT)",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "Umami vs Rybbit, in depth",
    sections: [
      {
        heading: "Both open source, built for different jobs",
        paragraphs: [
          <>
            This isn&apos;t an open-vs-proprietary comparison: both tools are open source and self-hostable, and
            that shapes what the real question is. Umami is a deliberately minimal analytics tool: a small,
            MIT-licensed Node app with a database behind it, famously easy to run yourself, with reporting that stays
            intentionally lean: pageviews, referrers, custom events, and a set of basic reports. That
            minimalism is a philosophy, not a shortcoming, and it&apos;s why Umami is so widely deployed on personal
            sites and side projects.
          </>,
          <>
            Rybbit makes the other bet: a full analytics platform that happens to also be open source. Alongside the
            traffic stats you&apos;d expect, it ships <Link href="/features/session-replay">session replay</Link>,{" "}
            <Link href="/features/funnels">funnels</Link>, user journey visualization, error tracking, Web Vitals
            monitoring, and user profiles. Both tools can show you a funnel; the difference appears when a number
            raises a question. In Umami the report is where the trail ends. In Rybbit you can open the sessions behind
            a drop-off, watch the replays, and see whether a JavaScript error or a confusing form is the culprit.
          </>,
        ],
      },
      {
        heading: "Pricing and self-hosting, honestly",
        paragraphs: [
          <>
            Umami&apos;s cloud has a Hobby plan that is free forever, and the Pro plan is $20/mo for 1M events with a
            14-day trial, though most Umami adoption is the free tier or self-hosting, and for basic traffic
            stats at $0 that is genuinely hard to beat. Rybbit starts at $19/mo for 100k events with a 7-day trial,
            and every plan includes every feature. Per event, Umami Pro is cheaper; what you&apos;re paying Rybbit for
            is depth of reporting, not the traffic counting. See the full breakdown on the{" "}
            <Link href="/pricing">pricing page</Link>.
          </>,
          <>
            Both self-host for free. Umami is the lighter operational lift: a small Node app plus a Postgres or
            MySQL database you probably already know how to run. Rybbit&apos;s{" "}
            <Link href="/docs/self-hosting">self-hosted deployment</Link> is a Docker Compose stack with more moving
            parts, because features like session replay and fast queries over large event volumes need more
            infrastructure behind them. If your goal is the smallest possible thing to maintain, Umami wins that
            trade; if you want the full platform on your own hardware, Rybbit&apos;s setup is still a single Docker
            install.
          </>,
        ],
      },
      {
        heading: "Switching from Umami to Rybbit",
        paragraphs: [
          <>
            Unlike most analytics migrations, you don&apos;t have to start from zero: Rybbit ships a data importer for
            Umami (imports are supported for Plausible, Umami, and Simple Analytics), so your historical traffic comes
            with you. A low-risk path looks like this:
          </>,
          <ol>
            <li>
              Add the Rybbit tracking script and leave Umami running. Both are lightweight and cookieless, and the two
              scripts don&apos;t conflict, so running them side by side costs you nothing.
            </li>
            <li>
              Import your Umami history with the built-in importer (see the{" "}
              <Link href="/docs">docs</Link> for the walkthrough) so your Rybbit dashboard starts with
              continuity instead of a blank chart.
            </li>
            <li>
              Recreate your custom events and goals. Umami&apos;s event model maps cleanly onto Rybbit&apos;s custom
              events with attributes.
            </li>
            <li>
              Compare the two dashboards for a week or two. Once the numbers line up, remove the Umami script,
              or keep the instance around; a self-hosted Umami costs nothing to leave running.
            </li>
          </ol>,
        ],
      },
      {
        heading: "When Umami is the better choice",
        paragraphs: [
          <>
            Plenty of sites should just use Umami. If you&apos;re running a personal blog or hobby project and your
            analytics budget is $0, Umami&apos;s free-forever cloud tier or a tiny self-hosted instance is the right
            answer; Rybbit&apos;s extra features would sit unused. The same goes if you want the lightest
            possible footprint (Umami&apos;s ~2KB script is about as small as tracking gets), or if you specifically
            want an MIT license for your stack. Where the calculus changes is when a project becomes a business:
            the moment you need to know <em>why</em> a conversion rate dropped, rather than only that it did,
            you&apos;ve outgrown minimal analytics. For a wider survey of the options, see our guide to the{" "}
            <Link href="/blog/best-web-analytics-tools">best web analytics tools</Link>.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

  faqItems: [
    {
      question: "How is Rybbit different from Umami?",
      answer: "Both are open-source and privacy-first, but Rybbit includes advanced features Umami lacks: session replay, error tracking, Web Vitals monitoring, real-time globe view, and organization support. Rybbit also uses ClickHouse for better performance at scale.",
    },
    {
      question: "Can I migrate from Umami to Rybbit?",
      answer: "Yes. Just add Rybbit's script tag to your site and data starts flowing immediately. You can run both tools in parallel during the transition. Historical Umami data won't transfer, but new data collection begins instantly.",
    },
    {
      question: "Which is easier to self-host?",
      answer: "Both are straightforward to self-host with Docker. Umami supports PostgreSQL/MySQL which may be more familiar. Rybbit uses ClickHouse which offers better analytics query performance at scale but is a less common database.",
    },
    {
      question: "Does Rybbit have a larger script than Umami?",
      answer: "Yes, Rybbit's script is 18KB compared to Umami's 2KB. The additional size enables features like session replay, error tracking, and Web Vitals monitoring. Both are small enough to have negligible impact on page load.",
    },
    {
      question: "Are both GDPR compliant?",
      answer: "Yes. Both Rybbit and Umami are cookie-free and don't collect personal data. Rybbit adds an extra privacy option with daily rotating salt for user ID hashing, ensuring visitors can't be tracked across days.",
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
      title: "Rybbit vs Fathom",
      href: "/compare/fathom",
      description: "Open source vs proprietary privacy analytics",
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
