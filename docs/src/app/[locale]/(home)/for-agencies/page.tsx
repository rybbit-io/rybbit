import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight, ExternalLink, Link2, Mail } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for Agencies | Client-Friendly Web Analytics";
const pageDescription =
  "Run every client site from one workspace. Dashboards clients can read without a training call, automated email reports, share links without accounts, and unlimited websites on Pro.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-agencies",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-agencies",
    images: [createOGImageUrl("Rybbit for Agencies", "Every client site in one workspace, on dashboards clients can actually read.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for Agencies", "Every client site in one workspace, on dashboards clients can actually read.", "Solutions")],
  },
});

// Rendered in the accordion AND emitted as FAQPage JSON-LD from the same
// array, so the schema can never drift from the visible answers.
const faqItems = [
  {
    question: "Can my clients see their dashboard without a Rybbit account?",
    answer:
      "Yes. Share any dashboard with a secret link or make it fully public. People with the link see that site's dashboard and nothing else — no account required.",
  },
  {
    question: "How many websites can I add?",
    answer:
      "The Standard plan includes up to 5 websites. Pro includes unlimited websites, so every client site fits under one subscription.",
  },
  {
    question: "Can I give a client or teammate limited access?",
    answer:
      "Yes. Organizations support member roles, so you control who can view dashboards and who can manage sites and settings.",
  },
  {
    question: "Do client sites need a cookie consent banner for Rybbit?",
    answer:
      "No. Rybbit doesn't use cookies or collect personal data, so it's GDPR and CCPA compliant without a consent banner.",
  },
  {
    question: "Can I white-label Rybbit for my clients?",
    answer:
      "White-labeling is available on the Enterprise plan, along with dedicated instances and on-premise installation. Contact us to talk through your setup.",
  },
  {
    question: "What happens if a client wants to take over their analytics?",
    answer:
      "Nothing is locked in: Rybbit is open source, with API access and data export on every plan. Worst case, they can self-host the exact same product.",
  },
];

// Fake-but-concrete workspace rows, in the landing page's mock-data idiom.
const workspaceRows = [
  { domain: "acme-cycles.com", visitors: "12.4k", delta: "+8%" },
  { domain: "harbor-dental.co", visitors: "3.1k", delta: "+21%" },
  { domain: "fernwood.studio", visitors: "9.8k", delta: "+4%" },
];

const tierFacts = [
  { tier: "Standard", fact: "Up to 5 websites and 3 team members" },
  { tier: "Pro", fact: "Unlimited websites, unlimited team members" },
  { tier: "Enterprise", fact: "White-labeling, SSO, dedicated instance" },
];

export default function ForAgenciesPage() {
  return (
    <div className="overflow-x-clip">
        <InteriorPageHero
          eyebrow="Rybbit for agencies"
          title="Client reporting without the training call."
          description="Run every client site from one workspace. Hand clients a dashboard they can read in thirty seconds — no GA4 walkthroughs, no cookie-banner liability on their sites, no per-site fees eating your margin."
          eventLocation="for_agencies_hero"
        />

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agency-problem-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
                />
                <div className="relative">
                  <SectionKicker>The client problem</SectionKicker>
                  <h2
                    id="agency-problem-title"
                    className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                  >
                    Your clients don&apos;t want analytics. They want answers.
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  Every agency knows the call: a client opens GA4, can&apos;t find their own traffic, and asks you to
                  explain it. Rybbit puts sessions, sources, and conversions on one screen that stays legible to
                  someone who looks at it once a month.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="Agency workflow">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 lg:grid-cols-12">
              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">Every client in one workspace</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Organizations group your team and client sites together, with member roles for who can view and who
                  can manage. Jump between client dashboards without logging in and out.
                </p>
                <ul className="mt-6 max-w-md divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {workspaceRows.map(row => (
                    <li key={row.domain} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <span className="flex items-center gap-2.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                        {row.domain}
                      </span>
                      <span className="flex items-baseline gap-2 tabular-nums">
                        <span className="text-sm font-medium">{row.visitors}</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{row.delta}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">Reports that send themselves</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Weekly or monthly email reports per site. Clients get their numbers in the inbox without you
                  exporting a PDF on the last Friday of the month.
                </p>
                <div className="mt-6 flex max-w-sm items-center gap-3 rounded-md border border-neutral-200 px-3.5 py-3 dark:border-neutral-800">
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  <div className="min-w-0 text-xs leading-5">
                    <p className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                      Weekly report — acme-cycles.com
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400">Arrives Monday, 9:00</p>
                  </div>
                </div>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">Share a dashboard, not a login</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Any dashboard can be shared with a secret link or made fully public. Clients see their site&apos;s
                  numbers without creating an account — and never anyone else&apos;s.
                </p>
                <div className="mt-6 flex max-w-sm items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                  <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    app.rybbit.io/share/acme-cycles…
                  </span>
                </div>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">No cookie banner on any client site</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Rybbit is cookieless and compliant with GDPR and CCPA out of the box, so the sites you build
                  don&apos;t need a consent banner for analytics. One less awkward conversation per launch — and no
                  consent-declined gap in the numbers you report.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  <Link
                    href="/privacy"
                    className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    How Rybbit handles privacy
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href="/dpa"
                    className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                  >
                    Data Processing Agreement
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agency-pricing-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
                />
                <div className="relative">
                  <SectionKicker>Pricing for a roster</SectionKicker>
                  <h2
                    id="agency-pricing-title"
                    className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                  >
                    Unlimited client websites on Pro.
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  No per-site packs, no per-seat surprises. One subscription covers the whole roster, priced by
                  traffic — and referrals pay 50% through the affiliate program.
                </p>
              </div>
            </div>
            <div>
              {tierFacts.map(item => (
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-5 py-5 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:px-8 lg:px-10">
                <span>Referring clients instead of hosting them?</span>
                <Link
                  href="/affiliate"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  50% affiliate program
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agency-lockin-title">
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <h2
                id="agency-lockin-title"
                className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
              >
                Easy to leave. That&apos;s the point.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Rybbit is 100% open source under AGPL v3. If you or a client ever want out of the cloud, self-host the
                exact same product and keep the workflow. With full API access and data export, the numbers were never
                locked in to begin with — which is an easier pitch to put in front of a client than a contract.
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

        <PersonaFaqSection heading="Agency questions, answered plainly." items={faqItems} />
        <PersonaCrossLinks current="for-agencies" />

        <CTASection
          title="Put every client on analytics they'll actually open."
          description="One workspace, unlimited client websites on Pro, and dashboards you can hand to anyone."
          eventLocation="for_agencies_bottom_cta"
        />
      </div>
  );
}
