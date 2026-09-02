import { CTASection } from "@/components/CTASection";
import { FAQAccordion } from "@/components/FAQAccordion";
import { AgentConsole } from "@/components/Cards/AgentConsole";
import { Autocapture } from "@/components/Cards/Autocapture";
import { Funnels } from "@/components/Cards/Funnels";
import { Journeys } from "@/components/Cards/Journeys";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { UserSessions } from "@/components/Cards/UserSessions";
import { WebVitals } from "@/components/Cards/WebVitals";
import { GridCrosses } from "@/components/GridCrosses";
import { ConsoleGreeting } from "@/components/deco/ConsoleGreeting";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { Marquee } from "@/components/magicui/marquee";
import { TweetCard } from "@/components/Tweet";
import { customerLogos } from "@/components/customerLogos";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const mcpClients = [
  { name: "Claude Code", path: "/docs/mcp/claude-code" },
  { name: "Claude Desktop", path: "/docs/mcp/claude-desktop" },
  { name: "Codex", path: "/docs/mcp/codex" },
  { name: "Cursor", path: "/docs/mcp/cursor" },
  { name: "VS Code", path: "/docs/mcp/vscode" },
  { name: "opencode", path: "/docs/mcp/opencode" },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Rybbit GDPR and CCPA compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.",
      },
    },
    {
      "@type": "Question",
      name: "How does Rybbit compare to Google Analytics?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit is far less bloated than Google Analytics, both in the tracking script and the dashboard. It's one dashboard instead of 150+ reports, and the script is 18KB against GA4's 371KB.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can run Rybbit on your own server with Docker and keep full control of your data, or use the managed cloud if you'd rather not host it yourself.",
      },
    },
    {
      "@type": "Question",
      name: "How easy is it to set up Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Add one script tag to your site, or install @rybbit/js from npm. Most sites are collecting data in under 5 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Rybbit support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The script tag works anywhere you can add HTML: WordPress, Shopify, Next.js, React, Vue, and the rest. For apps, install @rybbit/js from npm.",
      },
    },
    {
      "@type": "Question",
      name: "Is Rybbit truly open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is 100% open source. Every single line of code, including for our cloud/enterprise offerings, is available on GitHub under the AGPL 3.0 license.",
      },
    },
  ],
};

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  // The feature index band: every label links to its feature or docs page, so
  // the band doubles as the evaluator's checklist and the page's internal-link hub.
  const capabilityIndex = [
    {
      title: t("Understand"),
      dotClassName: "bg-emerald-600 dark:bg-emerald-400",
      links: [
        { label: t("Realtime data"), href: "/features/web-analytics" },
        { label: t("Web vitals"), href: "/features/web-vitals" },
        { label: t("Globe views"), href: "/docs/feature-guides/globe" },
        { label: t("Email reports"), href: "/docs/account-settings" },
        { label: t("Setup in minutes"), href: "/docs/script" },
      ],
    },
    {
      title: t("Investigate"),
      dotClassName: "bg-blue-600 dark:bg-blue-400",
      links: [
        { label: t("Session replay"), href: "/features/session-replay" },
        { label: t("User journeys"), href: "/features/user-journeys" },
        { label: t("User profiles"), href: "/features/user-profiles" },
        { label: t("Error tracking"), href: "/features/error-tracking" },
        { label: t("Organizations"), href: "/docs/teams" },
      ],
    },
    {
      title: t("Measure"),
      dotClassName: "bg-amber-600 dark:bg-amber-400",
      links: [
        { label: t("Funnels"), href: "/features/funnels" },
        { label: t("Goals"), href: "/features/goals" },
        { label: t("Retention"), href: "/features/retention" },
        { label: t("Custom events"), href: "/features/custom-events" },
        { label: t("API & data export"), href: "/docs/api/getting-started" },
      ],
    },
    {
      title: t("Stay private"),
      dotClassName: "bg-violet-600 dark:bg-violet-400",
      links: [
        { label: t("No cookies"), href: "/privacy" },
        { label: t("GDPR & CCPA"), href: "/dpa" },
        { label: t("Bot blocking"), href: "/docs/bot-detection" },
        { label: t("Self-hosting"), href: "/docs/self-hosting" },
        { label: t("Open source"), href: "https://github.com/rybbit-io/rybbit", external: true },
      ],
    },
  ];

  // Note: only include tweets whose claims about the product are accurate
  // (e.g. no "free plan/tier" tweets — Rybbit has a trial, not a free tier).
  const tweetColumns = [
    ["1991296442611184125", "1921928423284629758", "2000974573005889706", "1927817460993884321"],
    ["1920899082253434950", "2000788904778326334", "1976495558480232672", "1977471983278535071"],
    ["1982378431166963982", "2009548405488615871", "1920470706761929048", "1979830490006974510", "1970265809122705759"],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ConsoleGreeting />
      <div className="overflow-clip">
        <HeroSection
          title={title}
          subtitle={subtitle}
          showEUFlag={showEUFlag}
          logoBand={
            <div className="relative grid grid-cols-2 gap-px border-t border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-4 lg:grid-cols-8">
              <GridCrosses />
              {customerLogos.map(logo => {
                const image = (
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width}
                    height={40}
                    className={`max-h-7 w-auto max-w-[112px] transition-opacity duration-200 ${logo.className}`}
                  />
                );

                return (
                  <div
                    key={logo.alt}
                    className="flex min-h-24 items-center justify-center bg-white dark:bg-neutral-950"
                  >
                    {logo.href ? (
                      <Link href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt}>
                        {image}
                      </Link>
                    ) : (
                      image
                    )}
                  </div>
                );
              })}
            </div>
          }
        />

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="product-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 md:py-20 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>{t("One connected workspace")}</SectionKicker>
                  <h2
                    id="product-title"
                    className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
                  >
                    {t("Go from signal to explanation without changing tools.")}
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-400 text-pretty">
                  {t(
                    "Capture every interaction automatically, watch the sessions behind it, then measure what converts and how fast it feels."
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 lg:grid-cols-12">
              <div className="bg-white dark:bg-neutral-950 lg:col-span-7 [&>div]:h-full">
                <Autocapture />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-5 [&>div]:h-full">
                <SessionReplay />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-5 [&>div]:h-full">
                <UserSessions />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-7 [&>div]:h-full">
                <Funnels />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-7 [&>div]:h-full">
                <Journeys />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-5 [&>div]:h-full">
                <WebVitals />
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-b border-neutral-200 dark:border-neutral-800"
          aria-labelledby="capability-index-title"
        >
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 md:flex-row md:items-baseline md:justify-between md:gap-8 lg:px-10">
              <h2 id="capability-index-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
                {t("Everything behind one script tag.")}
              </h2>
              <p className="max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {t(
                  "Replay, funnels, goals, vitals, exports: everything Google Analytics made complicated, one click deeper."
                )}
              </p>
            </div>
            <nav
              aria-label={t("Feature index")}
              className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-4"
            >
              {capabilityIndex.map(group => (
                <div key={group.title} className="bg-white px-5 py-6 dark:bg-neutral-950 sm:px-8 lg:px-6 xl:px-8">
                  <h3 className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
                    <span aria-hidden="true" className={`size-2 rounded-[1px] ${group.dotClassName}`} />
                    {group.title}
                  </h3>
                  <ul className="-mx-1.5 mt-3">
                    {group.links.map(link => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="group/link flex items-center justify-between gap-2 rounded-sm px-1.5 py-1.5 text-sm text-neutral-600 transition-colors duration-200 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                        >
                          {link.label}
                          <ArrowRight
                            className="size-3.5 shrink-0 text-neutral-400 transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transition-none dark:text-neutral-600"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agents-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="agents-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  {t("Analytics your AI can operate.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t(
                    "A hosted MCP server on top of Rybbit's full REST API. Your agent reads live traffic, debugs errors, and manages goals, with the same permissions as a teammate."
                  )}
                </p>
                <div className="mt-10 max-w-sm">
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("Works with")}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {mcpClients.map(client => (
                      <li key={client.name}>
                        <Link
                          href={client.path}
                          className="inline-flex rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                        >
                          {client.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href="/docs/mcp"
                    className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-neutral-950"
                  >
                    {t("Set up MCP")}
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href="/docs/api/getting-started"
                    className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-neutral-400 dark:hover:text-white dark:focus-visible:ring-offset-neutral-950"
                  >
                    {t("API reference")}
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-8">
              <div className="relative flex h-full items-center bg-neutral-100 p-5 [background-image:radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:14px_14px] dark:bg-neutral-900 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] sm:p-8 lg:p-12">
                <div className="w-full min-w-0">
                  <AgentConsole />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="integrations-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="integrations-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  {t("Made to meet your stack.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t("Install Rybbit on the platform you already use. Most integrations take only a few minutes.")}
                </p>
                <TrackingSnippet className="mt-10 max-w-sm" />
              </div>
            </div>
            <div className="lg:col-span-8">
              <IntegrationsGrid />
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="testimonials-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid border-b border-neutral-200 dark:border-neutral-800 md:grid-cols-3">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 md:col-span-2 md:border-b-0 md:border-r md:py-20 lg:px-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                />
                <div className="relative">
                  <SectionKicker>{t("From the community")}</SectionKicker>
                  <h2
                    id="testimonials-title"
                    className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
                  >
                    {t("Real posts from people who switched.")}
                  </h2>
                </div>
              </div>
              <div className="flex flex-col justify-between px-5 py-10 sm:px-8 md:py-20 lg:px-10">
                <p className="max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400 text-pretty">
                  {t("What teams say after replacing heavier analytics products with Rybbit.")}
                </p>
                <div className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 md:text-xs">
                  <span>{t("Customer notes")}</span>
                  <span className="hidden md:inline">{t("Pause on hover")}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-neutral-200 dark:border-neutral-800">
              <div className="relative grid h-[560px] grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-3">
                {tweetColumns.map((ids, columnIndex) => (
                  <Marquee
                    key={ids[0]}
                    vertical
                    pauseOnHover
                    reverse={columnIndex === 1}
                    className={`${columnIndex > 0 ? "hidden md:flex" : ""} [--duration:60s] motion-reduce:[animation-play-state:paused]`}
                    repeat={2}
                  >
                    {ids.map(id => (
                      <TweetCard key={id} id={id} />
                    ))}
                  </Marquee>
                ))}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent dark:from-neutral-950" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-neutral-950" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="faq-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="faq-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  {t("Questions, answered plainly.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t("The questions people ask before adding Rybbit to their site.")}
                </p>
              </div>
            </div>
            <div className="px-5 py-8 sm:px-8 md:py-12 lg:col-span-8 lg:px-10">
              <FAQAccordion />
            </div>
          </div>
        </section>

        <LandingPricing />
        <CTASection />
      </div>
    </>
  );
}
