import Link from "next/link";
import { ComparisonSection, DeepDive, FAQItem, PricingInfo, RelatedResource } from "../components/ComparisonPage";

export const cloudflareAnalyticsComparisonData: ComparisonSection[] = [
  {
    title: "Analytics Features",
    features: [
      { name: "Real-time analytics", rybbitValue: true, competitorValue: true },
      { name: "Custom events", rybbitValue: "With attributes", competitorValue: false },
      { name: "Funnels", rybbitValue: true, competitorValue: false },
      { name: "User journeys (Sankey)", rybbitValue: true, competitorValue: false },
      { name: "Conversion goals", rybbitValue: true, competitorValue: false },
      { name: "UTM tracking", rybbitValue: true, competitorValue: false },
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
      { name: "Script size", rybbitValue: "18KB", competitorValue: "N/A" },
      { name: "Bypasses ad blockers", rybbitValue: true, competitorValue: false },
      { name: "API access", rybbitValue: true, competitorValue: false },
      { name: "Starting price", rybbitValue: "$19/mo", competitorValue: "Free" },
    ],
  },
];

export const cloudflareAnalyticsExtendedData = {
  subtitle: "Cloudflare Analytics is free but samples your traffic. Rybbit counts every event and adds the features Cloudflare leaves out.",

  introHeading: "Why consider Rybbit over Cloudflare Analytics?",
  introParagraphs: [
    "Cloudflare Web Analytics is free and requires no setup if you're already using Cloudflare's CDN. But free comes with serious limitations. Cloudflare only samples about 10% of your traffic and extrapolates the rest, which means your visitor counts are estimates, not facts. Data is retained for just 6 months, and there's no support for custom events, conversion goals, UTM tracking, or even basic metrics like bounce rate and visit duration.",
    "Rybbit processes 100% of your events with zero sampling, so every number in your dashboard is accurate. You get the full analytics toolkit: custom events with attributes, conversion goals, funnel analysis, session replay, user journey visualization, and 3-5+ years of data retention. Plus, Rybbit works with any website regardless of hosting provider, so you're not locked into Cloudflare's CDN.",
    "Think of Cloudflare Analytics as a basic traffic counter and Rybbit as a complete analytics platform. If you just need to know roughly how many people visited your site, Cloudflare is fine. But if you want to understand user behavior, improve conversions, debug issues with session replay, or just work from numbers you can trust, Rybbit is what you need.",
  ],

  chooseRybbit: [
    "You need 100% accurate data without sampling (Cloudflare uses 10% samples)",
    "You want full analytics features: UTM tracking, custom events, goals, funnels",
    "You need session replay and user journey visualization",
    "You want 3-5+ years of data retention instead of 6 months",
    "You need analytics that works without Cloudflare CDN lock-in",
    "You want open-source software you can self-host",
  ],

  chooseCompetitor: [
    "You already use Cloudflare CDN and want zero-cost basic analytics",
    "You only need a high-level traffic overview",
    "You don't need custom events, goals, or conversion tracking",
    "You want analytics with absolutely no setup beyond DNS",
    "Basic Web Vitals monitoring is all you need",
  ],

  rybbitPricing: {
    name: "Rybbit",
    model: "Events-based pricing",
    startingPrice: "$19/mo",
    highlights: [
      "7-day free trial, card charged after the trial",
      "All features included on every plan",
      "100% unsampled, accurate data",
      "3-5+ years data retention",
    ],
  } satisfies PricingInfo,

  competitorPricing: {
    name: "Cloudflare Analytics",
    model: "Free (bundled with CDN)",
    startingPrice: "Free",
    highlights: [
      "Included free with Cloudflare CDN",
      "Only 10% sampled data (not accurate)",
      "6-month data retention limit",
      "No custom events, goals, or funnels",
    ],
  } satisfies PricingInfo,

  deepDive: {
    title: "Cloudflare Analytics vs Rybbit, in depth",
    sections: [
      {
        heading: "What “free” costs you here",
        paragraphs: [
          <>
            Cloudflare Web Analytics is genuinely free, and it&apos;s honest about how it manages that. Per
            Cloudflare&apos;s developer docs, the dashboard is built on a roughly 10% sample of page-load events:
            unsampled data is kept for about seven days before being aggregated, and retention is limited to around 30
            days, even though the UI exposes date ranges up to six months. For a high-traffic site a 10% sample still
            traces the broad shape of things. For a small or medium site it means noisy, incomplete numbers: a
            page that got 40 visits yesterday might show 20 or 70, and thin segments like a single campaign or country
            can disappear entirely.
          </>,
          <>
            The retention window is the quieter limitation. With unsampled data measured in days and aggregates in
            weeks, there is no year-over-year comparison, no &ldquo;how did this launch compare to the last one,&rdquo;
            and no long baseline to judge a slow trend against. Rybbit stores every event unsampled at any traffic
            level, so the number on the dashboard is the number that happened, this month and long after.
          </>,
        ],
      },
      {
        heading: "A signal vs something you can act on",
        paragraphs: [
          <>
            The deeper difference isn&apos;t accuracy, it&apos;s the kind of question each tool can answer. Cloudflare
            Web Analytics answers &ldquo;is traffic roughly up or down?&rdquo; For that, it&apos;s fine.
            But it has no custom events, no goals, and no funnels, so it can&apos;t tell you whether visitors signed
            up, where they dropped out of checkout, or which campaign actually converted.
          </>,
          <>
            Rybbit is built for the follow-up question: &ldquo;what should we change?&rdquo; Custom events with
            attributes and conversion goals tell you what visitors did;{" "}
            <Link href="/features/funnels">funnels</Link> and user journeys show where they stalled; session replay and
            error tracking show why; <Link href="/features/web-vitals">Web Vitals monitoring</Link> and user profiles
            round out the picture. All of it ships on every plan, from a ~18KB script that stays cookieless with a
            daily-rotating salt, so you keep the privacy posture that likely drew you to Cloudflare in the first
            place.
          </>,
        ],
      },
      {
        heading: "The actually-free alternative",
        paragraphs: [
          <>
            If free is the requirement rather than a nice-to-have, the honest comparison point isn&apos;t
            Rybbit&apos;s cloud plans: it&apos;s{" "}
            <Link href="/docs/self-hosting">self-hosting the open-source version</Link>. Rybbit&apos;s code is open
            source and self-hosting costs $0 in licenses: you pay only for your own server, and you get unsampled
            data, full retention under your control, and the complete feature set, with events never leaving your
            infrastructure. If you&apos;d rather not run it yourself, cloud{" "}
            <Link href="/pricing">starts at $19/mo for 100k events</Link> with a 7-day trial and every feature on
            every plan.
          </>,
        ],
      },
      {
        heading: "When Cloudflare Analytics is enough",
        paragraphs: [
          <>
            Plenty of sites only need a pulse, and Cloudflare Web Analytics is a good pulse. It fits
            when the budget is zero and self-hosting isn&apos;t on the table, when your tolerance for setup is a
            single copy-pasted beacon (or none at all, if your DNS is already proxied through Cloudflare), and when a
            rough sense of traffic direction is all anyone will ever ask of it. It also runs happily alongside any
            other analytics tool, so there&apos;s no cost to keeping it while you evaluate something deeper. If
            you&apos;re weighing more options, our{" "}
            <Link href="/blog/best-web-analytics-tools">guide to the best web analytics tools</Link> covers the wider
            field.
          </>,
        ],
      },
    ],
  } satisfies DeepDive,

  faqItems: [
    {
      question: "Why is Cloudflare Analytics data inaccurate?",
      answer: "Cloudflare Analytics samples only about 10% of your traffic and extrapolates the rest. This means visitor counts are often significantly overcounted and you can't trust the exact numbers. Rybbit processes 100% of your events with no sampling.",
    },
    {
      question: "Do I need Cloudflare CDN to use Cloudflare Analytics?",
      answer: "Yes. Cloudflare Analytics requires routing your DNS through Cloudflare. Rybbit works with any website regardless of CDN or hosting provider. Just add a single script tag.",
    },
    {
      question: "What features does Cloudflare Analytics lack?",
      answer: "Cloudflare Analytics doesn't support custom events, conversion goals, UTM campaign tracking, session replay, funnels, user journeys, bounce rate, visit duration, entry/exit pages, or an API. It only provides basic traffic metrics with sampled data.",
    },
    {
      question: "How long does Cloudflare keep my data?",
      answer: "Cloudflare retains analytics data for only 6 months. Rybbit retains data for 3-5+ years depending on your plan, and you can export your data at any time.",
    },
    {
      question: "Can I use Rybbit alongside Cloudflare Analytics?",
      answer: "Yes. Many teams add Rybbit for detailed analytics while keeping Cloudflare for basic CDN-level traffic monitoring. Just add Rybbit's script tag to your site, and it works alongside any other analytics tool.",
    },
  ] satisfies FAQItem[],

  relatedResources: [
    {
      title: "Rybbit vs Google Analytics",
      href: "/compare/google-analytics",
      description: "The privacy-first alternative to GA4",
    },
    {
      title: "Rybbit vs Matomo",
      href: "/compare/matomo",
      description: "Modern analytics vs the legacy GA alternative",
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
