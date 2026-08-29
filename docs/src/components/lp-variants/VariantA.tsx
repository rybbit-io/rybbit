import { AgentConsole } from "@/components/Cards/AgentConsole";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { FAQAccordion } from "@/components/FAQAccordion";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { Marquee } from "@/components/magicui/marquee";
import { TweetCard } from "@/components/Tweet";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  DemoEmbedFading,
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
 * Variant A — "Quiet Instrument".
 *
 * The bet: the page has no frame. Every container border, corner cross,
 * graph-paper plate, dot grid and nested window chrome is gone; the column is
 * centered and vertical space does all the separating. One idea and one visual
 * per band.
 *
 * Consequences for anyone editing this file: there is nowhere to hide, so the
 * spacing scale is the design. Bands are `py-24 md:py-32`, the gap between a
 * heading and its supporting sentence is always `mt-5`, and between that and
 * the band's single visual always `mt-14`. Don't introduce a border to solve a
 * spacing problem here — that is the pattern this variant exists to test against.
 *
 * See lp-variants/shared.tsx for why the copy is untranslated literals.
 */

const SHELL = "mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10";
const BAND = "py-24 md:py-32";
/** Running text never exceeds ~62 characters at the centered measure. */
const MEASURE = "mx-auto max-w-[54ch]";

function BandHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="text-center">
      <h2 className="mx-auto max-w-[19ch] text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-balance md:text-[2.75rem]">
        {title}
      </h2>
      {children && (
        <p className={cn(MEASURE, "mt-5 text-base leading-7 text-neutral-600 dark:text-neutral-400 text-pretty md:text-lg md:leading-8")}>
          {children}
        </p>
      )}
    </div>
  );
}

export function VariantA() {
  return (
    <div data-lp-bare-chrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero — badge, headline, one sentence, two buttons. Nothing else. */}
      <section className={cn(SHELL, "pb-4 pt-16 text-center md:pt-24")}>
        <div className="flex justify-center">
          <GitHubStar />
        </div>
        <h1 className="mx-auto mt-9 max-w-[15ch] text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-neutral-950 text-balance dark:text-neutral-50">
          {LP_TITLE}
        </h1>
        <p className={cn(MEASURE, "mt-6 text-lg leading-8 text-neutral-600 dark:text-neutral-300 text-pretty")}>
          {LP_SUBTITLE}
        </p>
        <HeroCtas variant="a" className="mt-9 items-center justify-center" />
        <p className="mt-5 text-sm text-neutral-500 dark:text-neutral-400">7-day free trial. Cancel anytime.</p>
      </section>

      {/* The product, unframed: no browser chrome, no mat, fading into the page. */}
      <section className="mt-14 md:mt-20">
        <div className="mx-auto w-full max-w-[1320px] px-0 sm:px-8">
          <DemoEmbedFading
            heightClassName="h-[380px] sm:h-[460px] lg:h-[560px]"
            scrimHeightClassName="h-56 sm:h-64"
            sideScrim
            loading="eager"
          />
        </div>
      </section>

      <section className={cn(SHELL, "pb-8 pt-6")}>
        <LogoRow />
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Go from signal to explanation without changing tools.">
          Capture every interaction automatically, watch the sessions behind it, then measure what converts and how fast
          it feels.
        </BandHeading>
        <div className="mx-auto mt-14 max-w-3xl">
          <SessionReplay />
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Everything behind one script tag.">
          Replay, funnels, goals, vitals, exports — everything Google Analytics made complicated, one click deeper.
        </BandHeading>
        <nav
          aria-label="Feature index"
          className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-10 text-left sm:grid-cols-4"
        >
          {capabilityIndex.map(group => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold tracking-tight">{group.title}</h3>
              <ul className="mt-3 space-y-1">
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="rounded-sm text-sm text-neutral-500 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-400 dark:hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Analytics your AI can operate.">
          A hosted MCP server on top of Rybbit&apos;s full REST API. Your agent reads live traffic, debugs errors, and
          manages goals, with the same permissions as a teammate.
        </BandHeading>
        <div className="mx-auto mt-14 max-w-4xl">
          <AgentConsole />
        </div>
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2">
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
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Made to meet your stack.">
          Install Rybbit on the platform you already use. Most integrations take only a few minutes.
        </BandHeading>
        <div className="mx-auto mt-14 max-w-md">
          <TrackingSnippet />
        </div>
        <div className="mx-auto mt-12 max-w-5xl">
          <IntegrationsGrid bare />
        </div>
      </section>

      <section className={cn(SHELL, BAND)}>
        <BandHeading title="Real posts from people who switched.">
          What teams say after replacing heavier analytics products with Rybbit.
        </BandHeading>
        <div className="relative mx-auto mt-14 grid h-[520px] max-w-5xl grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
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
        <BandHeading title="Questions, answered plainly.">
          The questions people ask before adding Rybbit to their site.
        </BandHeading>
        <div className="mx-auto mt-12 max-w-2xl text-left">
          <FAQAccordion />
        </div>
      </section>

      <div className={cn(SHELL, "pb-4")}>
        <LandingPricing chrome="bare" />
      </div>

      {/* Closing CTA — the second and last emerald on the page. */}
      <section className={cn(SHELL, "pb-32 pt-24 text-center md:pb-40 md:pt-32")}>
        <h2 className="mx-auto max-w-[16ch] text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-balance md:text-[2.75rem]">
          Start seeing your traffic today.
        </h2>
        <p className={cn(MEASURE, "mt-5 text-base leading-7 text-neutral-600 dark:text-neutral-400")}>
          Cookieless, open source, and live in minutes. Or run it yourself with one Docker command, free forever.
        </p>
        <HeroCtas variant="a" placement="bottom_cta" className="mt-9 items-center justify-center" />
      </section>
    </div>
  );
}
