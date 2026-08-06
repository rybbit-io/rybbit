import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for SaaS | Funnels, Retention, and Sessions in One Tool";
const pageDescription =
  "Signup funnels, retention cohorts, user profiles, session replay, feature flags, and A/B experiments: the product-analytics surface without the enterprise setup project. Cookieless and GDPR compliant.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-saas",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-saas",
    images: [createOGImageUrl("Rybbit for SaaS", "See the funnel. Then watch the sessions inside it.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for SaaS", "See the funnel. Then watch the sessions inside it.", "Solutions")],
  },
});

// Rendered in the accordion AND emitted as FAQPage JSON-LD from the same
// array, so the schema can never drift from the visible answers.
const faqItems = [
  {
    question: "Is Rybbit web analytics or product analytics?",
    answer:
      "Both, from one script. Traffic, sources, and campaigns sit next to funnels, retention, user profiles, session replay, and error tracking. You don't glue a marketing tool to a product tool.",
  },
  {
    question: "Do I need an instrumentation plan before I see anything?",
    answer:
      "No. Autocapture records pageviews, clicks, form submits, and errors from the moment the script loads. Custom events are there when you want to name specific product moments, and the Node SDK covers server-side events.",
  },
  {
    question: "Can I tie sessions to actual user accounts?",
    answer:
      "Yes. Identify logged-in users with your own user IDs, and their sessions, events, and errors roll up into one profile, so 'what did this customer experience' has an answer.",
  },
  {
    question: "Does Rybbit do feature flags and A/B tests?",
    answer:
      "Yes. Feature flags handle gradual rollouts, remote config, and variant targeting, and experiments run A/B tests on flag variants and measure conversion lift, in the same tool that already tracks the conversions.",
  },
  {
    question: "Can I see what an individual user experienced?",
    answer:
      "Yes. User profiles show a visitor's sessions and events over time, and on Pro you can watch session replays. Useful when a support ticket says 'it just doesn't work.'",
  },
  {
    question: "Which plan do SaaS teams usually need?",
    answer:
      "Standard includes funnels, goals, journeys, retention, user profiles, and error tracking. Pro adds session replays, unlimited websites, and unlimited team members. Most product teams end up on Pro for the replays.",
  },
  {
    question: "Does the tracking script need a cookie banner in our app?",
    answer:
      "No. Rybbit is cookieless and doesn't collect personal data that could identify visitors, so it's GDPR and CCPA compliant without a consent banner, in the app and on the marketing site.",
  },
  {
    question: "We're on Plausible or Umami. Do we lose our history?",
    answer:
      "No. Rybbit imports historical data from Plausible, Umami, and Simple Analytics (up to 36 months on Standard and 60 months on Pro), so your growth charts keep their past.",
  },
  {
    question: "Can we pull the data into our own systems?",
    answer:
      "Yes. The Stats API exposes metrics, sessions, funnels, goals, errors, and events over HTTP with bearer-key auth, and there's an API playground in the dashboard that generates ready-to-use snippets.",
  },
  {
    question: "Can we self-host it?",
    answer:
      "Yes. Rybbit is open source under AGPL v3: self-host the full product on your own infrastructure with unlimited events, or start on cloud and move later. The workflow is identical either way.",
  },
];

const funnelSteps = [
  { label: "Visited /pricing", value: "6,720", width: "100%" },
  { label: "Started trial", value: "1,804", width: "27%" },
  { label: "Invited a teammate", value: "1,102", width: "16%" },
  { label: "Upgraded to paid", value: "918", width: "13.7%" },
];

// Fake-but-plausible weekly retention cohort, rendered in the periwinkle
// data hue per DESIGN.md (data is the only surface periwinkle may paint).
const cohortRows = [
  { cohort: "Jun 1", cells: [100, 62, 48, 41, 37, 34] },
  { cohort: "Jun 8", cells: [100, 58, 45, 39, 35] },
  { cohort: "Jun 15", cells: [100, 64, 51, 44] },
  { cohort: "Jun 22", cells: [100, 61, 47] },
];

const setupSteps = [
  {
    step: "01",
    title: "Install the script",
    body: "One tag in your app and marketing site. Autocapture starts recording pageviews, clicks, form submits, and errors immediately.",
  },
  {
    step: "02",
    title: "Identify your users",
    body: "Pass your own user IDs for logged-in users, and sessions, events, and errors roll up into per-user profiles.",
  },
  {
    step: "03",
    title: "Name the moments",
    body: "Add custom events for the steps that define activation, from the browser or server-side with the Node SDK.",
  },
  {
    step: "04",
    title: "Build the funnel",
    body: "Assemble signup and activation funnels from pages and events in a few clicks, and set goals for the conversions that matter.",
  },
];

const tocItems = [
  { href: "#saas-problem-title", label: "The problem" },
  { href: "#saas-setup-title", label: "The first hour" },
  { href: "#saas-funnel-title", label: "Funnels" },
  { href: "#saas-retention-title", label: "Retention" },
  { href: "#saas-ship-title", label: "Flags & experiments" },
  { href: "#saas-toolkit", label: "Day to day" },
  { href: "#saas-faq", label: "FAQ" },
];

export default function ForSaasPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for SaaS"
        title="See the funnel. Then watch the sessions inside it."
        description="Signup funnels, retention cohorts, user profiles, and error tracking on the same dashboard as your traffic: the product-analytics surface without the enterprise setup project."
        eventLocation="for_saas_hero"
      />

      <nav aria-label="On this page" className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-baseline gap-x-6 gap-y-2 border-x border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-8 lg:px-10">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            On this page
          </span>
          {tocItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm text-sm text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-problem-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>One connected surface</SectionKicker>
                <h2
                  id="saas-problem-title"
                  className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Web analytics and product analytics were never two products.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                The question is always the same shape: this campaign brought these visitors, who became these trials,
                who did or didn&apos;t stick. Splitting that across two tools is where the answer gets lost.
              </p>
            </div>
          </div>
          <div className="border-t border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:px-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                The usual stack is GA4 for marketing plus a product-analytics suite for the app: two scripts, two event
                schemas, two logins, and an integration that quietly drifts. Rybbit covers the whole path (first visit
                to retained account) in one schema, so answering &ldquo;which channel brings users who stick?&rdquo;
                takes one filter. If you&apos;re weighing the heavier route, see how Rybbit compares to{" "}
                <Link
                  href="/compare/posthog"
                  className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  PostHog
                </Link>{" "}
                and{" "}
                <Link
                  href="/compare/google-analytics"
                  className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Google Analytics
                </Link>
                .
              </p>
              <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                There&apos;s also the banner problem. Cookie-based analytics inside a product means a consent prompt in
                your own app and a tracking gap wherever users decline. Rybbit is cookieless and collects no personal
                data by default, so it&apos;s GDPR and CCPA compliant without consent UI. Your onboarding flow stays
                clean, and the numbers cover everyone.{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  How Rybbit handles privacy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-setup-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>The first hour</SectionKicker>
                <h2
                  id="saas-setup-title"
                  className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  From script tag to signup funnel, before standup ends.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Product analytics tools fail at the instrumentation-plan stage: the meeting happens, the spreadsheet
                gets made, the events never ship. Rybbit inverts it: autocapture first, naming later.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px border-t border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
            {setupSteps.map(item => (
              <article key={item.step} className="bg-white px-5 py-8 dark:bg-neutral-950 sm:px-6">
                <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{item.step}</span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-neutral-200 px-5 py-5 text-sm dark:border-neutral-800 sm:px-8 lg:px-10">
            <Link
              href="/docs/autocapture"
              className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Autocapture docs
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/docs/identify-users"
              className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              Identifying users
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/docs/track-events"
              className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              Custom events
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-funnel-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <div className="lg:sticky lg:top-24">
              <SectionKicker>Funnels</SectionKicker>
              <h2
                id="saas-funnel-title"
                className="mt-5 max-w-sm scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Find the step that loses trials.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Build a funnel from page paths or custom events in a few clicks (pricing page to trial to activation
                to paid) and see exactly where the numbers fall off. Then open the sessions that dropped.
              </p>
              <Link
                href="/features/funnels"
                className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Funnels
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 md:py-14 lg:col-span-8 lg:px-10">
            <div className="max-w-2xl rounded-md border border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
              <ul className="space-y-3.5">
                {funnelSteps.map(step => (
                  <li key={step.label}>
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-neutral-700 dark:text-neutral-300">{step.label}</span>
                      <span className="font-medium tabular-nums">{step.value}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-[1px] bg-neutral-100 dark:bg-neutral-900">
                      <div className="h-full rounded-[1px] bg-(--dataviz)" style={{ width: step.width }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                End-to-end conversion <span className="font-medium tabular-nums">13.7%</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-retention-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="order-last min-w-0 lg:order-first lg:col-span-8">
            <div className="flex h-full flex-col justify-center px-5 py-10 sm:px-8 md:py-14 lg:px-10">
              <div className="max-w-2xl overflow-x-auto rounded-md border border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
                <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr className="text-left text-neutral-500 dark:text-neutral-400">
                      <th scope="col" className="pr-2 font-medium">
                        Cohort
                      </th>
                      {["W0", "W1", "W2", "W3", "W4", "W5"].map(week => (
                        <th scope="col" key={week} className="text-center font-medium">
                          {week}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohortRows.map(row => (
                      <tr key={row.cohort}>
                        <th scope="row" className="pr-2 text-left font-medium text-neutral-700 dark:text-neutral-300">
                          {row.cohort}
                        </th>
                        {row.cells.map((value, index) => (
                          <td
                            key={index}
                            className={`rounded-[1px] text-center tabular-nums ${
                              value >= 55 ? "text-neutral-950" : "text-neutral-700 dark:text-neutral-300"
                            }`}
                            style={{
                              backgroundColor: `color-mix(in oklab, var(--dataviz) ${Math.max(18, value * 0.85)}%, transparent)`,
                            }}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-l lg:px-10 md:py-20">
            <div className="lg:sticky lg:top-24">
              <SectionKicker>Retention</SectionKicker>
              <h2
                id="saas-retention-title"
                className="mt-5 max-w-sm scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Know if this month&apos;s users stick better than last month&apos;s.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Retention cohorts show how each week&apos;s new users keep coming back: the first number a SaaS
                should watch, and usually the last one a web-analytics tool offers.
              </p>
              <Link
                href="/features/retention"
                className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Retention
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-ship-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>Ship and measure</SectionKicker>
                <h2
                  id="saas-ship-title"
                  className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Roll it out to 10%. Then prove it worked.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                The measure-ship-measure loop usually spans three tools. In Rybbit, the flag that gates the feature and
                the funnel that judges it live on the same dashboard.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px border-t border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 lg:grid-cols-2">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Feature flags</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Gate features, roll out gradually, serve remote config, and target variants, without a separate flags
                vendor or another SDK in the bundle.
              </p>
              <Link
                href="/docs/feature-flags"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Feature flags docs
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Experiments</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Run A/B tests on flag variants and measure conversion lift against the goals you already track. No
                exporting events to a separate testing platform to find out who won.
              </p>
              <Link
                href="/docs/experiments"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Experiments docs
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section
        id="saas-toolkit"
        className="scroll-mt-24 border-b border-neutral-200 dark:border-neutral-800"
        aria-label="SaaS workflow"
      >
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 lg:grid-cols-12">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">The ticket says &quot;it doesn&apos;t work&quot;</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Pull up the user&apos;s profile, see their sessions and the error that fired, and watch the replay on
                Pro. Support conversations get shorter when you can see what the customer saw.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <Link
                  href="/features/user-profiles"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  User profiles
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/features/session-replay"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  Session replay
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Events from the backend too</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Name the product moments that matter with custom events from the browser, or send them server-side
                with the Node SDK when the moment doesn&apos;t happen in a click.
              </p>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">The release-day watch</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Errors and web vitals sit next to traffic, so a deploy that breaks a form or slows a page shows up in
                the same place you&apos;re already looking, not in a separate monitoring tab.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <Link
                  href="/features/error-tracking"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Error tracking
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/features/web-vitals"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  Web vitals
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Ask your analytics, in your editor</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                The MCP server puts your analytics in reach of your AI assistant. Ask &ldquo;what changed in signups
                this week?&rdquo; from the same place you write code, and get answers backed by the real numbers.
              </p>
              <Link
                href="/features/mcp"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                MCP server
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-own-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <h2
              id="saas-own-title"
              className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              Your product data, on your terms.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Rybbit is 100% open source under AGPL v3, with API access and data export on every plan. Start on cloud
              and self-host later, or the other way around, and the funnels, cohorts, and profiles come with you.
              For a product team, that means the analytics layer is a dependency you can read, patch, and pin.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <Link
              href="/docs/self-hosting"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Self-hosting guide
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/docs/api/getting-started"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              API documentation
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

      <div id="saas-faq" className="scroll-mt-24">
        <PersonaFaqSection heading="SaaS questions, answered plainly." items={faqItems} />
      </div>
      <PersonaCrossLinks current="for-saas" />

      <CTASection
        title="Product analytics without the onboarding project."
        description="Funnels, retention, profiles, and replays, all running the afternoon you install the script."
        eventLocation="for_saas_bottom_cta"
      />
    </div>
  );
}
