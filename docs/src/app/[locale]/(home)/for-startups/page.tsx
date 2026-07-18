import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for Startups | Growth Answers Without a Data Team";
const pageDescription =
  "See where signups come from, watch where trials stall, and catch errors early — on one cookieless dashboard your whole team reads without training. Set up in minutes.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-startups",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-startups",
    images: [createOGImageUrl("Rybbit for Startups", "Growth answers without a data team.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for Startups", "Growth answers without a data team.", "Solutions")],
  },
});

const faqItems = [
  {
    question: "How long does setup actually take?",
    answer:
      "Most teams are live in under five minutes: add one script tag or install @rybbit/js from npm, and pageviews, clicks, and sessions start flowing immediately. Funnels and goals are configured in the dashboard, not in code.",
  },
  {
    question: "What happens to the price as our traffic grows?",
    answer:
      "Pricing is a slider over monthly pageviews, so you always see the number before you hit it. Plans start at 100K pageviews and scale in steps — no surprise invoices, and you can change plans at any time.",
  },
  {
    question: "Can I import my Google Analytics history?",
    answer:
      "Not yet. Most teams run Rybbit alongside their old analytics for a few weeks, then switch once they trust the numbers. Your Rybbit history builds from the day you install.",
  },
  {
    question: "When do I need Pro instead of Standard?",
    answer:
      "Standard covers up to 5 websites and 3 team members with funnels, goals, journeys, error tracking, and web vitals. Pro adds session replays, unlimited websites, and unlimited team members.",
  },
  {
    question: "Do we need a cookie consent banner?",
    answer:
      "No. Rybbit doesn't use cookies or collect personal data, so it's GDPR and CCPA compliant without a consent banner — and you see all of your traffic, not just the visitors who click accept.",
  },
  {
    question: "Is our data locked in?",
    answer:
      "No. Every plan includes API access and data export, and the whole product is open source under AGPL v3 — you can self-host the same stack whenever you want.",
  },
];

const firstWeek = [
  {
    step: 1,
    title: "Install in minutes",
    description:
      "One script tag on your marketing site and app, or @rybbit/js from npm. Pageviews, clicks, outbound links, and errors are captured automatically — no instrumentation plan required.",
  },
  {
    step: 2,
    title: "Wire the moments that matter",
    description:
      "Define goals for signups and upgrades, and build a funnel from landing page to activated trial. Both are configured in the dashboard in a few clicks, on data you're already collecting.",
  },
  {
    step: 3,
    title: "Watch the sessions behind the numbers",
    description:
      "When the funnel shows a drop-off, open the sessions that hit it. Session replay on Pro shows exactly what a stuck trial saw — including the error they never reported.",
  },
];

export default function ForStartupsPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for startups"
        title="Growth answers without a data team."
        description="See where signups come from, watch where trials stall, and catch errors before your users tweet about them — on one dashboard your whole team reads without training."
        eventLocation="for_startups_hero"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="startup-problem-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              />
              <div className="relative">
                <SectionKicker>Small team, every hat</SectionKicker>
                <h2
                  id="startup-problem-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  You have ten minutes, not a GA4 certification.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Analytics at a startup is a Tuesday-morning question — did the launch work, where did those signups
                come from — not a discipline someone owns. Rybbit is built for the person answering that question
                between two other jobs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="startup-week-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <h2
                id="startup-week-title"
                className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Your first week with Rybbit.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                An honest sequence, not a setup project. Each step works on the data the previous one already
                collected.
              </p>
            </div>
          </div>
          <ol className="lg:col-span-8">
            {firstWeek.map(item => (
              <li
                key={item.step}
                className="grid border-b border-neutral-200 px-5 py-9 last:border-b-0 dark:border-neutral-800 sm:grid-cols-[64px_1fr] sm:px-8 lg:px-10"
              >
                <span className="mb-4 font-mono text-sm text-emerald-600 dark:text-emerald-400 sm:mb-0">
                  {String(item.step).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="Startup workflow">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 lg:grid-cols-12">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Launch-day realtime</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                On the morning you hit the front page, watch visitors, referrers, and signups move in realtime —
                and because Rybbit is cookieless, the Hacker News crowd running ad blockers still shows up in your
                numbers.
              </p>
              <div className="mt-6 flex max-w-md items-center justify-between rounded-md border border-neutral-200 px-3.5 py-3 text-sm dark:border-neutral-800">
                <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <span className="relative flex size-2" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  Visitors on site now
                </span>
                <span className="text-lg font-semibold tabular-nums">318</span>
              </div>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Errors before bug reports</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Error tracking is on the same dashboard as traffic, so a broken signup page shows up as both a
                falling funnel and a rising error — usually before the first support email lands.
              </p>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">One workspace for the team</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Invite your cofounder and first hires into an organization with member roles. Standard includes 3
                team members; Pro removes the limit.
              </p>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Speed you can defend</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Web vitals from real visits show where your pages feel slow, by route and device — so performance
                arguments in standup end with a number instead of a feeling.
              </p>
              <Link
                href="/features/web-vitals"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Web vitals
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="startup-pricing-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <h2
              id="startup-pricing-title"
              className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              Starts small. Priced by traffic, not by seat.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Standard starts at $13/month billed annually for 100K pageviews, and the pricing slider shows exactly
              what the next stage of growth costs before you get there. Every plan starts with a 7-day free trial.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <Link
              href="/pricing"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              See the pricing slider
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/docs/self-hosting"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              Or self-host free
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="Startup questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="for-startups" />

      <CTASection
        title="Spend the week shipping, not configuring analytics."
        description="Install in minutes, wire your funnel in clicks, and read the answers on one screen."
        eventLocation="for_startups_bottom_cta"
      />
    </div>
  );
}
