import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for SaaS | Funnels, Retention, and Sessions in One Tool";
const pageDescription =
  "Signup funnels, retention cohorts, user profiles, session replay, and error tracking — the product-analytics surface without the enterprise setup project. Cookieless and GDPR compliant.";

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

const faqItems = [
  {
    question: "Is Rybbit web analytics or product analytics?",
    answer:
      "Both, from one script. Traffic, sources, and campaigns sit next to funnels, retention, user profiles, session replay, and error tracking — you don't glue a marketing tool to a product tool.",
  },
  {
    question: "Do I need an instrumentation plan before I see anything?",
    answer:
      "No. Autocapture records pageviews, clicks, form submits, and errors from the moment the script loads. Custom events are there when you want to name specific product moments, and the Node SDK covers server-side events.",
  },
  {
    question: "Can I see what an individual user experienced?",
    answer:
      "Yes. User profiles show a visitor's sessions and events over time, and on Pro you can watch session replays — useful when a support ticket says 'it just doesn't work.'",
  },
  {
    question: "Which plan do SaaS teams usually need?",
    answer:
      "Standard includes funnels, goals, journeys, retention, user profiles, and error tracking. Pro adds session replays, unlimited websites, and unlimited team members — most product teams end up on Pro for the replays.",
  },
  {
    question: "Does the tracking script need a cookie banner in our app?",
    answer:
      "No. Rybbit is cookieless and doesn't collect personal data that could identify visitors, so it's GDPR and CCPA compliant without a consent banner — in the app and on the marketing site.",
  },
  {
    question: "Can we pull the data into our own systems?",
    answer:
      "Yes. The Stats API exposes metrics, sessions, funnels, goals, errors, and events over HTTP with bearer-key auth, and there's an API playground in the dashboard that generates ready-to-use snippets.",
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

export default function ForSaasPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for SaaS"
        title="See the funnel. Then watch the sessions inside it."
        description="Signup funnels, retention cohorts, user profiles, and error tracking on the same dashboard as your traffic — the product-analytics surface without the enterprise setup project."
        eventLocation="for_saas_hero"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="saas-problem-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              />
              <div className="relative">
                <SectionKicker>One connected surface</SectionKicker>
                <h2
                  id="saas-problem-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
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
                className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Find the step that loses trials.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Build a funnel from page paths or custom events in a few clicks — pricing page to trial to activation
                to paid — and see exactly where the numbers fall off. Then open the sessions that dropped.
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
                className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Know if this month&apos;s users stick better than last month&apos;s.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Retention cohorts show how each week&apos;s new users keep coming back — the first number a SaaS
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

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="SaaS workflow">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 lg:grid-cols-12">
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
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="SaaS questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="for-saas" />

      <CTASection
        title="Product analytics without the onboarding project."
        description="Funnels, retention, profiles, and replays — running the afternoon you install the script."
        eventLocation="for_saas_bottom_cta"
      />
    </div>
  );
}
