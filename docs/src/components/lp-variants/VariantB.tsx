import { AgentConsole } from "@/components/Cards/AgentConsole";
import { FAQAccordion } from "@/components/FAQAccordion";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { Marquee } from "@/components/magicui/marquee";
import { TweetCard } from "@/components/Tweet";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardTour } from "./DashboardTour";
import {
  DemoEmbedFading,
  EuNote,
  GitHubStar,
  HeroCtas,
  LogoRow,
  LP_SUBTITLE,
  LP_TITLE,
  capabilityIndex,
  faqSchema,
  mcpClients,
  tweetColumns,
} from "./shared";

/**
 * Variant B — "One Dashboard".
 *
 * The bet: the strongest claim on this page is "one readable dashboard instead
 * of 150+ reports", so prove it with the dashboard rather than argue it with
 * six separate feature mockups. The feature mosaic is replaced by a single live
 * embed the visitor switches between real product views (DashboardTour).
 *
 * Consequences for anyone editing this file: the page leans on the demo site
 * being up and looking good, and it is deliberately left-aligned and quiet so
 * the product screen is the only loud thing on any given screen. If you find
 * yourself adding a second visual to a band, it belongs in the tour instead.
 *
 * See lp-variants/shared.tsx for why the copy is untranslated literals.
 */

const SHELL = "mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10";
const BAND = "py-20 md:py-28";

function BandHeading({ title, children, className }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className="max-w-[17ch] text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-balance md:text-[2.75rem]">
        {title}
      </h2>
      {children && (
        <p className="mt-5 max-w-[56ch] text-base leading-7 text-neutral-600 dark:text-neutral-400 text-pretty md:text-lg md:leading-8">
          {children}
        </p>
      )}
    </div>
  );
}

export function VariantB() {
  return (
    <div data-lp-bare-chrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className={cn(SHELL, "pt-14 md:pt-20")}>
        <GitHubStar />
        <h1 className="mt-8 max-w-[16ch] text-[clamp(2.5rem,5.4vw,4.25rem)] font-semibold leading-[0.99] tracking-[-0.04em] text-neutral-950 text-balance dark:text-neutral-50">
          {LP_TITLE}
        </h1>
        <p className="mt-6 max-w-[54ch] text-lg leading-8 text-neutral-600 dark:text-neutral-300 text-pretty">
          {LP_SUBTITLE}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <HeroCtas variant="b" />
          <EuNote />
        </div>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">7-day free trial. Cancel anytime.</p>
      </section>

      {/* The product, immediately and at size — running past the fold rather
          than being cropped by a frame. */}
      <section className={cn(SHELL, "mt-12 md:mt-16")}>
        <div className="overflow-hidden rounded-t-lg border border-b-0 border-neutral-200 dark:border-neutral-800">
          <DemoEmbedFading heightClassName="h-[360px] sm:h-[440px] lg:h-[520px]" loading="eager" />
        </div>
      </section>

      <section className={cn(SHELL, "pb-6 pt-10")}>
        <LogoRow align="start" />
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="One dashboard. Not 150 reports.">
          Everything loads at once, from an 18 KB script against GA4&apos;s 371 KB. The depth is here too — funnels,
          journeys, vitals and errors are all the same screen, one click across. This is the real demo site; click
          through it.
        </BandHeading>
        <div className="mt-12">
          <DashboardTour />
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <BandHeading title="Analytics your AI can operate.">
            A hosted MCP server on top of Rybbit&apos;s full REST API. Your agent reads live traffic, debugs errors, and
            manages goals, with the same permissions as a teammate.
          </BandHeading>
          <div className="min-w-0">
            <AgentConsole />
            <div className="mt-6 flex flex-wrap gap-2">
              {mcpClients.map(client => (
                <Link
                  key={client.name}
                  href={client.path}
                  className="inline-flex rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                >
                  {client.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <BandHeading title="One tag. Five minutes.">
              Works anywhere you can add HTML — WordPress, Shopify, Next.js, Vue. For apps, install @rybbit/js from npm.
            </BandHeading>
            <TrackingSnippet className="mt-8 max-w-md" />
          </div>
          <div className="min-w-0">
            <IntegrationsGrid bare />
          </div>
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Real posts from people who switched.">
          What teams say after replacing heavier analytics products with Rybbit.
        </BandHeading>
        <div className="relative mt-12 grid h-[520px] grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
          {tweetColumns.map((ids, columnIndex) => (
            <Marquee
              key={ids[0]}
              vertical
              pauseOnHover
              reverse={columnIndex === 1}
              className={cn(
                columnIndex > 0 && "hidden md:flex",
                "[--duration:60s] motion-reduce:[animation-play-state:paused]"
              )}
              repeat={2}
            >
              {ids.map(id => (
                <TweetCard key={id} id={id} />
              ))}
            </Marquee>
          ))}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent dark:from-neutral-950" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-neutral-950" />
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          <BandHeading title="Questions, answered plainly.">
            The questions people ask before adding Rybbit to their site.
          </BandHeading>
          <div className="min-w-0">
            <FAQAccordion />
          </div>
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Set your traffic. See your price.">
          Start your 7-day free trial. No credit card charges until the trial ends.
        </BandHeading>
        <div className="mt-12">
          <LandingPricing chrome="bare" />
        </div>
      </section>

      {/* The capability index stays: it is the page's internal-link hub as well
          as the evaluator's checklist. Compressed to a footer band here, since
          the dashboard tour is doing the feature-explaining above. */}
      <section className={cn(SHELL, "border-t border-neutral-200 py-14 dark:border-neutral-800")}>
        <nav aria-label="Feature index" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {capabilityIndex.map(group => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold tracking-tight">{group.title}</h3>
              <ul className="mt-3 space-y-1">
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group/link inline-flex items-center gap-1.5 rounded-sm text-sm text-neutral-500 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-400 dark:hover:text-white"
                    >
                      {link.label}
                      <ArrowRight
                        className="size-3 shrink-0 opacity-0 transition-opacity duration-200 group-hover/link:opacity-100 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </section>

      <section className={cn(SHELL, "pb-32 pt-20 md:pb-40")}>
        <h2 className="max-w-[16ch] text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-balance md:text-[2.75rem]">
          Start seeing your traffic today.
        </h2>
        <p className="mt-5 max-w-[54ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
          Cookieless, open source, and live in minutes. Or run it yourself with one Docker command, free forever.
        </p>
        <HeroCtas variant="b" placement="bottom_cta" className="mt-8" />
      </section>
    </div>
  );
}
