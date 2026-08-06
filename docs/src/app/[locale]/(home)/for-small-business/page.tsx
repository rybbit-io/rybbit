import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { Activity, ArrowRight, ExternalLink, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

const pageTitle = "Web Analytics for Small Businesses | Rybbit";
const pageDescription =
  "The handful of numbers your business actually needs (visitors, sources, top pages, and goals) on one screen you can read in thirty seconds. No GA4 setup, no cookie banner, and a free trial to start.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-small-business",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-small-business",
    images: [
      createOGImageUrl(
        "Web analytics for small businesses",
        "The handful of numbers that matter, on one screen you can read in thirty seconds.",
        "Solutions"
      ),
    ],
  },
  twitter: {
    images: [
      createOGImageUrl(
        "Web analytics for small businesses",
        "The handful of numbers that matter, on one screen you can read in thirty seconds.",
        "Solutions"
      ),
    ],
  },
});

// Rendered in the accordion AND emitted as FAQPage JSON-LD from the same
// array, so the schema can never drift from the visible answers.
const faqItems = [
  {
    question: "Can I try Rybbit before paying?",
    answer:
      "Yes. Every plan starts with a 7-day free trial with all features included, and you won't be charged until the trial ends. Rybbit is also open source, so self-hosting it yourself is always free.",
  },
  {
    question: "Do I need a cookie consent banner?",
    answer:
      "No. Rybbit is cookieless and doesn't collect personal data, so it's GDPR and CCPA compliant without a consent banner on your site.",
  },
  {
    question: "How hard is it to set up?",
    answer:
      "One script tag in your site's header, or a one-click plugin for WordPress, Webflow, Shopify, Squarespace, and more. Most people are seeing live data within a couple of minutes.",
  },
  {
    question: "Will I actually understand the dashboard?",
    answer:
      "That's the whole idea. Rybbit shows visitors, where they came from, your top pages, and your goals on a single screen you can read at a glance. No analyst and no GA4 walkthrough needed.",
  },
  {
    question: "Can I track sales, bookings, or signups?",
    answer:
      "Yes. Set up goals and custom events to see how many people bought, booked, or signed up, and which sources actually drive them. No complex tagging setup needed.",
  },
  {
    question: "What happens when my site grows?",
    answer:
      "You move up a plan when you're ready. Standard covers up to 5 websites and 3 team members and is priced by traffic, and Pro removes the limits. Same simple dashboard the whole way up.",
  },
];

// Fake-but-concrete "numbers that matter" rows, in the landing page's mock-data idiom.
const numberRows = [
  { label: "Visitors this week", value: "1,284", delta: "+12%" },
  { label: "Top source", value: "Google", delta: "41%" },
  { label: "Top page", value: "/menu", delta: "3.2k" },
  { label: "Bookings (goal)", value: "38", delta: "+6" },
];

const planFacts = [
  { tier: "Trial", fact: "7 days free, every feature included, cancel anytime" },
  { tier: "Standard", fact: "Up to 5 websites and 3 team members, priced by traffic" },
  { tier: "Pro", fact: "Unlimited websites and team members" },
];

export default function ForSmallBusinessPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for small businesses"
        title="The numbers your business needs. Nothing you don't."
        description="You don't need a data team to know if your website is working. Rybbit puts visitors, sources, top pages, and goals on one screen you can read in thirty seconds. No GA4 maze, no cookie banner, and a free trial to start."
        eventLocation="for_small_business_hero"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="smb-problem-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>The everyday problem</SectionKicker>
                <h2
                  id="smb-problem-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  You opened Google Analytics once. You closed it just as fast.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                GA4 was built for analysts with time to configure it. When you run the business, you have one question
                (is the website bringing people in?) and no interest in learning a reporting tool to answer it. Rybbit
                answers it on the first screen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="What you get">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 lg:grid-cols-12">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">The four numbers that matter</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Visitors, where they came from, what they looked at, and whether they did the thing you care about.
                That&apos;s the dashboard: no report-building, no forty tabs to get lost in.
              </p>
              <ul className="mt-6 max-w-md divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {numberRows.map(row => (
                  <li key={row.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">{row.label}</span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-sm font-medium">{row.value}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{row.delta}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <Zap aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                One line to install
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Paste one script tag, or use a one-click plugin for WordPress, Webflow, Shopify, and Squarespace. Live
                data in a couple of minutes, no developer required.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                <code>{`<script
  src="app.rybbit.io/api/script.js"
  data-site-id="42"
></script>`}</code>
              </pre>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <ShieldCheck aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                No cookie banner
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Rybbit is cookieless and GDPR- and CCPA-compliant out of the box, so your site doesn&apos;t need a
                consent pop-up, and you don&apos;t lose visitors who decline one.
              </p>
              <Link
                href="/privacy"
                className="group mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                How Rybbit handles privacy
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <Activity aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                See it working in real time
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Run a promotion, post to social, or send a newsletter and watch visitors arrive live. It&apos;s the
                fastest way to know a campaign landed, without waiting a day for a report to catch up.
              </p>
              <div className="mt-6 inline-flex items-center gap-2.5 rounded-md border border-neutral-200 px-3.5 py-2.5 text-sm dark:border-neutral-800">
                <span aria-hidden="true" className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
                  <span className="font-medium">27</span> visitors online now
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="smb-pricing-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>Pricing that fits</SectionKicker>
                <h2
                  id="smb-pricing-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Start small. Upgrade when you grow.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                No enterprise sales call, no per-seat surprises. Every plan starts with a 7-day free trial, and
                pricing scales by traffic. You only pay more once your site is actually busier.
              </p>
            </div>
          </div>
          <div>
            {planFacts.map(item => (
              <Link
                key={item.tier}
                href="/pricing"
                className="group grid border-b border-neutral-200 px-5 py-6 transition-colors last:border-b-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[160px_1fr_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
              >
                <span className="font-semibold tracking-tight">{item.tier}</span>
                <span className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:mt-0">
                  {item.fact}
                </span>
                <ArrowRight
                  className="mt-3 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 motion-reduce:transition-none sm:mt-0"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="smb-own-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <h2
              id="smb-own-title"
              className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              No analyst required.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Rybbit is built so the owner of the business can read it, no marketing hire needed. And because it&apos;s
              open source with data export on every plan, the numbers are yours. Nothing is locked away behind a tool
              you&apos;d have to pay an expert to operate.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <Link
              href="/docs/script"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Install guide
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <a
              href="https://github.com/rybbit-io/rybbit"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              Open source on GitHub
              <ExternalLink
                className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="Small-business questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="for-small-business" />

      <CTASection
        title="Know if your website is working in thirty seconds."
        description="A 7-day free trial, no cookie banner, and a dashboard you'll actually open."
        eventLocation="for_small_business_bottom_cta"
      />
    </div>
  );
}
