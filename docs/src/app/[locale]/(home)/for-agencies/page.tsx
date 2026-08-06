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
  "Run every client site from one workspace. Dashboards clients can read without a training call, teams and roles that keep each client in their lane, history imports from Plausible and Umami, and unlimited websites on Pro.";

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
      "Yes. Share any dashboard with a secret link or make it fully public. People with the link see that site's dashboard and nothing else. No account required.",
  },
  {
    question: "Can a client accidentally see another client's numbers?",
    answer:
      "No. Members can be restricted to specific sites, so a client you invite sees only their own site. Share links are scoped to one site each. Only your own admins and owners see the whole workspace.",
  },
  {
    question: "How many websites can I add?",
    answer:
      "The Standard plan includes up to 5 websites. Pro includes unlimited websites, so every client site fits under one subscription.",
  },
  {
    question: "Can I import a client's analytics history?",
    answer:
      "Yes. Rybbit imports historical data from Plausible, Umami, and Simple Analytics: up to 36 months on Standard and 60 months on Pro, with no limits when self-hosting. Clients switching to you don't lose their history.",
  },
  {
    question: "Can I give a client or teammate limited access?",
    answer:
      "Yes. Organizations support owner, admin, and member roles. Members can be limited to specific sites, and teams let you group sites (one team per client, for example) so access follows the roster automatically.",
  },
  {
    question: "Can clients change settings or break anything?",
    answer:
      "No. Members can view analytics for their assigned sites but can't manage settings, sites, or other members. Configuration stays with your admins and owners.",
  },
  {
    question: "Do client sites need a cookie consent banner for Rybbit?",
    answer:
      "No. Rybbit doesn't use cookies or collect personal data, so it's GDPR and CCPA compliant without a consent banner.",
  },
  {
    question: "Do clients get reports automatically?",
    answer:
      "Yes. Rybbit sends automatic weekly email reports summarizing analytics performance, so clients get their numbers in the inbox without you exporting anything.",
  },
  {
    question: "Can I white-label Rybbit for my clients?",
    answer:
      "You can embed read-only dashboards in your own portal on any plan, and full white-labeling (rebranding, custom domain, dedicated instance) is available on Enterprise. See the white-label page for the full range.",
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

const teamRows = [
  { team: "Acme Cycles", detail: "3 sites · 2 members" },
  { team: "Harbor Dental", detail: "1 site · 1 member" },
  { team: "Retainer clients", detail: "9 sites · 4 members" },
];

const onboardingSteps = [
  {
    step: "01",
    title: "Add the site",
    body: "One script tag, or a plugin for WordPress, Webflow, Shopify, and the rest of the stack you build on. Live data in minutes.",
  },
  {
    step: "02",
    title: "Bring the history",
    body: "Import up to five years of data from Plausible, Umami, or Simple Analytics, so the first dashboard the client sees isn't empty.",
  },
  {
    step: "03",
    title: "Set the access",
    body: "Invite the client as a member scoped to their site, or skip accounts entirely and send a share link.",
  },
  {
    step: "04",
    title: "Turn on reports",
    body: "Automatic weekly email reports put the numbers in the client's inbox before they think to ask for them.",
  },
];

// Feature rows: the depth pitch, each linking into the feature pages.
const depthRows = [
  {
    href: "/features/funnels",
    title: "Funnels",
    fact: "Show which step of a client's checkout or signup flow loses people, and how many",
  },
  {
    href: "/features/goals",
    title: "Goals",
    fact: "Track the conversions each client actually cares about: purchases, bookings, form fills",
  },
  {
    href: "/features/session-replay",
    title: "Session replay",
    fact: "Watch the session behind a complaint instead of guessing what went wrong",
  },
  {
    href: "/features/error-tracking",
    title: "Error tracking",
    fact: "Catch the JavaScript error breaking a client's form before the client does",
  },
  {
    href: "/features/web-vitals",
    title: "Web vitals",
    fact: "Prove the site you shipped is fast, and catch regressions after every release",
  },
  {
    href: "/features/user-journeys",
    title: "User journeys",
    fact: "Show clients how visitors actually move through the site you built for them",
  },
];

const tierFacts = [
  { tier: "Standard", fact: "Up to 5 websites and 3 team members" },
  { tier: "Pro", fact: "Unlimited websites, unlimited team members" },
  { tier: "Enterprise", fact: "White-labeling, SSO, dedicated instance" },
];

const tocItems = [
  { href: "#agency-problem-title", label: "The problem" },
  { href: "#agency-onboarding-title", label: "Client onboarding" },
  { href: "#agency-toolkit", label: "The toolkit" },
  { href: "#agency-migration-title", label: "Migrating clients" },
  { href: "#agency-depth-title", label: "Beyond pageviews" },
  { href: "#agency-pricing-title", label: "Pricing" },
  { href: "#agency-faq", label: "FAQ" },
];

export default function ForAgenciesPage() {
  return (
    <div className="overflow-x-clip">
        <InteriorPageHero
          eyebrow="Rybbit for agencies"
          title="Client reporting without the training call."
          description="Run every client site from one workspace. Hand clients a dashboard they can read in thirty seconds: no GA4 walkthroughs, no cookie-banner liability on their sites, no per-site fees eating your margin."
          eventLocation="for_agencies_hero"
        />

        <nav
          aria-label="On this page"
          className="border-b border-neutral-200 dark:border-neutral-800"
        >
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

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agency-problem-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>The client problem</SectionKicker>
                  <h2
                    id="agency-problem-title"
                    className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
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
            <div className="border-t border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:px-10">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  The hidden cost of GA4 on a client roster is the explaining, not the price. Every
                  report needs a translation layer, every dashboard needs a walkthrough, and every walkthrough is
                  unbilled time. An analytics tool a client can read on their own takes the walkthrough off the
                  calendar.
                </p>
                <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  There&apos;s a compliance angle too. Every GA-instrumented site you hand over ships with a cookie
                  banner and a consent-declined blind spot in its numbers. Rybbit is cookieless, so the sites you
                  build need neither, and the traffic you report is the traffic that actually happened.{" "}
                  <Link
                    href="/compare/google-analytics"
                    className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    See the full GA4 comparison
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-b border-neutral-200 dark:border-neutral-800"
          aria-labelledby="agency-onboarding-title"
        >
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>The first afternoon</SectionKicker>
                  <h2
                    id="agency-onboarding-title"
                    className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                  >
                    New client to first report, in four steps.
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  Onboarding a client onto analytics shouldn&apos;t be a project with a kickoff meeting. This is the
                  whole workflow. Most of it is done before the coffee goes cold.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px border-t border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
              {onboardingSteps.map(item => (
                <article key={item.step} className="bg-white px-5 py-8 dark:bg-neutral-950 sm:px-6">
                  <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{item.step}</span>
                  <h3 className="mt-3 text-base font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="agency-toolkit"
          className="scroll-mt-24 border-b border-neutral-200 dark:border-neutral-800"
          aria-label="Agency workflow"
        >
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 lg:grid-cols-12">
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
                <h3 className="text-lg font-semibold tracking-tight">One team per client</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Teams group sites and the people responsible for them. Set up a team per client, or per retainer
                  tier, and access follows the roster instead of being managed site by site.
                </p>
                <ul className="mt-6 max-w-sm divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {teamRows.map(row => (
                    <li key={row.team} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <span className="font-medium">{row.team}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{row.detail}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">Clients stay in their lane</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Invite a client as a member restricted to their own site: they see their numbers, and only their
                  numbers. Settings, billing, and the rest of the roster stay with your admins.
                </p>
                <div className="mt-6 max-w-sm rounded-md border border-neutral-200 px-3.5 py-3 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-mono text-xs text-neutral-700 dark:text-neutral-300">
                      dana@acme-cycles.com
                    </span>
                    <span className="shrink-0 rounded-sm border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      Member
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Access: acme-cycles.com only</p>
                </div>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">Share a dashboard, not a login</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Any dashboard can be shared with a secret link or made fully public, and read-only dashboards can be
                  embedded straight into your own client portal. Clients see their site&apos;s numbers without creating
                  an account, and never anyone else&apos;s.{" "}
                  <Link
                    href="/features/dashboard-sharing"
                    className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    More on dashboard sharing
                  </Link>
                  .
                </p>
                <div className="mt-6 flex max-w-sm items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                  <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    app.rybbit.io/share/acme-cycles…
                  </span>
                </div>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">Reports that send themselves</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Automatic weekly email reports summarize performance and land in the inbox. Clients get their numbers
                  without you exporting a PDF on the last Friday of the month.
                </p>
                <div className="mt-6 flex max-w-sm items-center gap-3 rounded-md border border-neutral-200 px-3.5 py-3 dark:border-neutral-800">
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  <div className="min-w-0 text-xs leading-5">
                    <p className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                      Weekly report: acme-cycles.com
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400">Arrives Monday, 9:00</p>
                  </div>
                </div>
              </article>

              <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
                <h3 className="text-lg font-semibold tracking-tight">No cookie banner on any client site</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  Rybbit is cookieless and compliant with GDPR and CCPA out of the box, so the sites you build
                  don&apos;t need a consent banner for analytics. One less awkward conversation per launch, and no
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

        <section
          className="border-b border-neutral-200 dark:border-neutral-800"
          aria-labelledby="agency-migration-title"
        >
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>Switching a roster</SectionKicker>
                  <h2
                    id="agency-migration-title"
                    className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                  >
                    Move clients over without losing their history.
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  The worst part of switching analytics for a whole roster is the empty dashboards on day one. Rybbit
                  imports the history, so year-over-year comparisons survive the migration.
                </p>
              </div>
            </div>
            <div className="border-t border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:px-10">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Clients coming from <span className="font-medium text-neutral-800 dark:text-neutral-200">Plausible</span>,{" "}
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">Umami</span>, or{" "}
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">Simple Analytics</span> bring
                  their data with them: up to 36 months of history on Standard, 60 months on Pro, and no limits if you
                  self-host. Upload the export, and the past shows up in the same dashboard as the present.{" "}
                  <Link
                    href="/docs/data-import"
                    className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    How data import works
                  </Link>
                  .
                </p>
                <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Moving clients off Google Analytics? GA4 history can&apos;t be imported (no tool maps its event
                  model honestly), so those clients start fresh with numbers they can finally read. The comparison
                  pages cover how the metrics line up, and answer &ldquo;why don&apos;t these match GA?&rdquo;
                  before a client asks:{" "}
                  <Link
                    href="/compare/google-analytics"
                    className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    vs. Google Analytics
                  </Link>
                  ,{" "}
                  <Link
                    href="/compare/plausible"
                    className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    vs. Plausible
                  </Link>
                  ,{" "}
                  <Link
                    href="/compare/matomo"
                    className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    vs. Matomo
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agency-depth-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>Beyond pageviews</SectionKicker>
                  <h2
                    id="agency-depth-title"
                    className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                  >
                    When the client asks &ldquo;why?&rdquo;, have more than traffic.
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  Simple to read doesn&apos;t mean shallow. The same script that counts visitors powers the tools that
                  justify a retainer: one layer down, never in the way.
                </p>
              </div>
            </div>
            <div>
              {depthRows.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group grid border-b border-neutral-200 px-5 py-6 transition-colors last:border-b-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[190px_1fr_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
                >
                  <span className="font-semibold tracking-tight">{item.title}</span>
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

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agency-pricing-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid grid-cols-1 border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>Pricing for a roster</SectionKicker>
                  <h2
                    id="agency-pricing-title"
                    className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                  >
                    Unlimited client websites on Pro.
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  No per-site packs, no per-seat surprises. One subscription covers the whole roster, priced by
                  traffic. Referrals pay 50% through the affiliate program.
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
                <span>Want your own brand on the dashboards?</span>
                <Link
                  href="/white-label"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  White-label options
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
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
                locked in to begin with. That&apos;s an easier pitch to put in front of a client than a contract.
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

        <div id="agency-faq" className="scroll-mt-24">
          <PersonaFaqSection heading="Agency questions, answered plainly." items={faqItems} />
        </div>
        <PersonaCrossLinks current="for-agencies" />

        <CTASection
          title="Put every client on analytics they'll actually open."
          description="One workspace, unlimited client websites on Pro, and dashboards you can hand to anyone."
          eventLocation="for_agencies_bottom_cta"
        />
      </div>
  );
}
