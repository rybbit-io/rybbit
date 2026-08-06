import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight, Code2, ExternalLink, LayoutDashboard, Link2, Server } from "lucide-react";
import Link from "next/link";

const pageTitle = "White Label Web Analytics | Rybbit";
const pageDescription =
  "Put analytics in front of your clients under your own brand. Embed read-only dashboards, build on the API, or self-host the open-source product, with full rebranding, custom domains, and dedicated instances on Enterprise.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/white-label",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/white-label",
    images: [
      createOGImageUrl(
        "White label web analytics",
        "Embed dashboards, build on the API, or self-host: analytics under your own brand.",
        "Solutions"
      ),
    ],
  },
  twitter: {
    images: [
      createOGImageUrl(
        "White label web analytics",
        "Embed dashboards, build on the API, or self-host: analytics under your own brand.",
        "Solutions"
      ),
    ],
  },
});

// Rendered in the accordion AND emitted as FAQPage JSON-LD from the same
// array, so the schema can never drift from the visible answers.
const faqItems = [
  {
    question: "Can I remove Rybbit branding from the dashboard?",
    answer:
      "In embed mode the Rybbit footer is hidden automatically and you can hide the sidebar, so a client sees a clean, read-only dashboard. Full branding removal, custom domains, and a dedicated instance are available on the Enterprise plan.",
  },
  {
    question: "Can clients see analytics without a Rybbit account?",
    answer:
      "Yes. Embed a read-only dashboard with a private-link iframe, or share a dashboard with a secret or public link. Anyone with the link sees that one site's numbers and nothing else. No login required.",
  },
  {
    question: "Can I control what the embed looks like?",
    answer:
      "Yes. Choose a light, dark, or system theme, hide the dashboard sidebar to keep viewers on the main page, and the Rybbit footer is removed automatically in embed mode.",
  },
  {
    question: "Is the embedded dashboard live?",
    answer:
      "Yes. The embed is the real read-only analytics dashboard served through a private link, so it shows the same up-to-date numbers your team sees. It isn't a static export or a cached report.",
  },
  {
    question: "What's the difference between the embed and the API?",
    answer:
      "The embed is the fastest path: the full dashboard inside your portal with one iframe. The Stats API returns the raw numbers instead, for teams that want to render their own charts in their own UI. Many start with the embed and move to the API as the product grows.",
  },
  {
    question: "Can I build my own reporting UI instead of embedding?",
    answer:
      "Yes. Every plan includes API access and a Stats API. Pull the same data Rybbit renders into your own portal or client interface and style it however you like.",
  },
  {
    question: "Can I run Rybbit entirely under my own domain?",
    answer:
      "Yes. Rybbit is open source under AGPL v3. Self-host the full product on your own infrastructure and domain. If you'd rather not run it yourself, Enterprise offers managed dedicated instances.",
  },
  {
    question: "Is there a per-client or per-site fee?",
    answer:
      "No. The Pro plan includes unlimited websites under a single subscription, priced by traffic, so adding another client site doesn't add another bill.",
  },
  {
    question: "Can I charge my clients for analytics?",
    answer:
      "That's the model. Analytics you resell under your brand is your product at your price. Rybbit charges you by traffic, not per client, so the margin math stays yours as the roster grows.",
  },
  {
    question: "What does full white-label on Enterprise include?",
    answer:
      "Complete rebranding, a custom domain, SSO, and a dedicated or on-premise instance, plus priority support. Contact us and we'll scope it to your setup.",
  },
];

// Fake-but-concrete embed snippet, in the landing page's mock-data idiom.
const embedSnippet = `<iframe
  src="app.rybbit.io/12/PRIVATE_KEY/main?embed=true"
  loading="lazy"
></iframe>`;

const statsSnippet = `GET /api/stats/12/overview
Authorization: Bearer rb_•••••••

{ "visitors": 12408, "sessions": 15230,
  "pageviews": 41902, "bounce_rate": 0.38 }`;

const workflowSteps = [
  {
    step: "01",
    title: "Add the client sites",
    body: "Every client site lives in your workspace, under one subscription. Unlimited websites on Pro, so the roster can grow without a new bill.",
  },
  {
    step: "02",
    title: "Generate private links",
    body: "Each site gets its own private-link key: a read-only, scoped route that shows that site's dashboard and nothing else.",
  },
  {
    step: "03",
    title: "Drop in the iframe",
    body: "Paste the embed snippet into your portal. Pick light, dark, or system theme, hide the sidebar, and the Rybbit footer disappears on its own.",
  },
  {
    step: "04",
    title: "Or skip the iframe",
    body: "Pull the same numbers from the Stats API and render them in your own UI: your charts, your components, your brand throughout.",
  },
];

const labelDepth = [
  {
    tier: "Embed & share",
    fact: "Read-only dashboards and share links, on every plan",
    href: "/docs/embeds/dashboard",
  },
  {
    tier: "API & self-host",
    fact: "Build your own UI on the API, or run the open-source product yourself",
    href: "/docs/api/getting-started",
  },
  {
    tier: "Full white-label",
    fact: "Rebranding, custom domain, SSO, and a dedicated instance on Enterprise",
    href: "/contact",
  },
];

const tocItems = [
  { href: "#wl-problem-title", label: "The problem" },
  { href: "#wl-workflow-title", label: "The first afternoon" },
  { href: "#wl-toolkit", label: "Four ways in" },
  { href: "#wl-depth-title", label: "How far to go" },
  { href: "#wl-own-title", label: "Owning the stack" },
  { href: "#wl-faq", label: "FAQ" },
];

export default function WhiteLabelPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit white label"
        title="Your analytics. Your brand. Not ours."
        description="Put analytics in front of clients without sending them to a third-party login. Embed a read-only dashboard in your own portal, build on the API, or self-host the whole thing. Rebrand it end to end on Enterprise."
        eventLocation="white_label_hero"
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

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="wl-problem-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>The branding problem</SectionKicker>
                <h2
                  id="wl-problem-title"
                  className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Clients should see their numbers, not your vendor&apos;s logo.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                When the analytics you resell carries someone else&apos;s brand, every client dashboard is an ad for a
                tool they could go buy directly. Rybbit is built to disappear behind your product: as an embed, an
                API, or a copy you host yourself.
              </p>
            </div>
          </div>
          <div className="border-t border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:px-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                The build-versus-buy math on client analytics is ugly on both ends. Building it in-house is months of
                chart plumbing that isn&apos;t your product. Reselling a branded third-party tool works until every
                dashboard you deliver teaches the client which vendor to cut you out for. The missing option is an
                analytics layer that does the work and stays invisible.
              </p>
              <p className="max-w-lg text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Rybbit is priced to be that layer: unlimited websites on Pro under one traffic-priced subscription, so
                onboarding the next client doesn&apos;t open the margin conversation again. If you&apos;re running a
                client roster rather than a product, the{" "}
                <Link
                  href="/for-agencies"
                  className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  agencies page
                </Link>{" "}
                covers that workflow, and{" "}
                <Link
                  href="/features/dashboard-sharing"
                  className="font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  dashboard sharing
                </Link>{" "}
                shows everything a link or embed can do.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="wl-workflow-title">
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
                  id="wl-workflow-title"
                  className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Branded analytics in your portal, in four steps.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                No SDK integration project, no data pipeline. The embed path is an iframe and a private link. The API
                path is one bearer key more.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px border-t border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map(item => (
              <article key={item.step} className="bg-white px-5 py-8 dark:bg-neutral-950 sm:px-6">
                <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{item.step}</span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-neutral-200 px-5 py-5 text-sm dark:border-neutral-800 sm:px-8 lg:px-10">
            <Link
              href="/docs/embeds/dashboard"
              className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Dashboard embed docs
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/docs/api/getting-started"
              className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              API getting started
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="wl-toolkit"
        className="scroll-mt-24 border-b border-neutral-200 dark:border-neutral-800"
        aria-label="White label options"
      >
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 lg:grid-cols-12">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <LayoutDashboard aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                Embed the dashboard in your portal
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Drop a read-only dashboard into your own app with a private-link iframe. Pick a theme, hide the sidebar,
                and the Rybbit footer is removed automatically in embed mode, so it reads as part of your product.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                <code>{embedSnippet}</code>
              </pre>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <Link2 aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                Share a link, not a login
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Every dashboard can be shared with a secret link or made fully public. Clients open their numbers
                without an account, and never see anyone else&apos;s site.
              </p>
              <div className="mt-6 flex max-w-sm items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  app.rybbit.io/share/acme-cycles…
                </span>
              </div>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <Code2 aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                Build on the API
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Prefer your own interface? Pull the same numbers from the Stats API and render them in your portal,
                styled entirely as your brand. Available on every plan.
              </p>
              <pre className="mt-6 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                <code>{statsSnippet}</code>
              </pre>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                <Server aria-hidden="true" className="size-4 text-neutral-400 dark:text-neutral-500" />
                Run it under your own domain
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Rybbit is 100% open source under AGPL v3. Self-host the exact same product on your own infrastructure
                and domain for a fully owned stack, or let us run a managed, dedicated instance for you on Enterprise.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <Link
                  href="/docs/self-hosting"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Self-hosting guide
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/docs/embeds/dashboard"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  Dashboard embed docs
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

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="wl-depth-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>How white is your label?</SectionKicker>
                <h2
                  id="wl-depth-title"
                  className="mt-5 max-w-2xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Go as far as your brand needs.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Most agencies start with embeds and share links on Pro, then move to full rebranding and a dedicated
                instance on Enterprise as the client roster grows. Every step is available without leaving Rybbit.
              </p>
            </div>
          </div>
          <div>
            {labelDepth.map(item => (
              <Link
                key={item.tier}
                href={item.href}
                className="group grid border-b border-neutral-200 px-5 py-6 transition-colors last:border-b-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[190px_1fr_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
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
              <span>Reselling to a roster of clients?</span>
              <Link
                href="/for-agencies"
                className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Rybbit for agencies
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="wl-own-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <h2
              id="wl-own-title"
              className="max-w-xl scroll-mt-24 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              Own the whole stack.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Because Rybbit is open source with full API access and data export on every plan, a white-label built on
              it is never a black box you&apos;re renting. You can inspect it, extend it, and, if it ever matters,
              take the entire deployment in-house without losing a single client dashboard.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <Link
              href="/docs/api/getting-started"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
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

      <div id="wl-faq" className="scroll-mt-24">
        <PersonaFaqSection heading="White-label questions, answered plainly." items={faqItems} />
      </div>
      <PersonaCrossLinks current="white-label" />

      <CTASection
        title="Ship analytics that looks like yours."
        description="Embed a dashboard, build on the API, or self-host the open-source product. Rebrand it end to end on Enterprise."
        eventLocation="white_label_bottom_cta"
      />
    </div>
  );
}
