import { AgentConsole } from "@/components/Cards/AgentConsole";
import { FAQAccordion } from "@/components/FAQAccordion";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { Marquee } from "@/components/magicui/marquee";
import { TweetCard } from "@/components/Tweet";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  DemoEmbed,
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
 * Variant C — "The Ledger".
 *
 * The bet: the engineered look is Rybbit's identity, and the problem is only
 * that it is currently expressed six ways at once. So keep exactly one
 * structural device — a full-bleed hairline between bands, with a mono label in
 * the left gutter naming what each band is — and delete the rest: vertical
 * container rules, corner crosses, graph-paper plates, dot grids, and the
 * window chrome nested inside every feature card.
 *
 * Consequences for anyone editing this file: the gutter label is the only
 * eyebrow this page gets, and the hairline is the only rule. Adding a second
 * structural device is the thing this variant is testing against. Density is
 * intentional and higher than variant A.
 *
 * See lp-variants/shared.tsx for why the copy is untranslated literals.
 */

const SHELL = "mx-auto w-full max-w-[1200px] px-5 sm:px-8 lg:px-10";

/** One ledger band: gutter label on the left, content on the right, one rule above. */
function Row({
  label,
  children,
  className,
  first = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <section className={cn(!first && "border-t border-neutral-200 dark:border-neutral-800")}>
      <div className={cn(SHELL, "grid gap-4 py-12 lg:grid-cols-[136px_minmax(0,1fr)] lg:gap-12 lg:py-16", className)}>
        <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.11em] text-neutral-400 dark:text-neutral-600">
          {label}
        </p>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function RowHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="max-w-[20ch] text-2xl font-semibold leading-[1.1] tracking-[-0.03em] text-balance md:text-[1.875rem]">
      {children}
    </h2>
  );
}

const figures = [
  { value: "18 KB", label: "script, against GA4's 371 KB" },
  { value: "1", label: "dashboard, not 150+ reports" },
  { value: "0", label: "cookies, so no consent banner" },
  { value: "5 min", label: "from script tag to first data" },
];

export function VariantC() {
  return (
    <div data-lp-bare-chrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <Row label="Rybbit" first>
        <GitHubStar />
        <h1 className="mt-7 max-w-[15ch] text-[clamp(2.5rem,5.4vw,4.25rem)] font-semibold leading-[0.99] tracking-[-0.04em] text-neutral-950 text-balance dark:text-neutral-50">
          {LP_TITLE}
        </h1>
        <p className="mt-6 max-w-[56ch] text-lg leading-8 text-neutral-600 dark:text-neutral-300 text-pretty">
          {LP_SUBTITLE}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <HeroCtas variant="c" />
          <EuNote />
        </div>
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">7-day free trial. Cancel anytime.</p>
      </Row>

      <Row label="The product">
        <div className="h-[380px] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 sm:h-[480px] lg:h-[580px]">
          <DemoEmbed loading="eager" />
        </div>
      </Row>

      <Row label="In numbers">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
          {figures.map(figure => (
            <div key={figure.value}>
              <dt className="font-mono text-[1.75rem] tabular-nums tracking-[-0.03em] text-neutral-950 dark:text-neutral-50">
                {figure.value}
              </dt>
              <dd className="mt-1.5 max-w-[22ch] text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                {figure.label}
              </dd>
            </div>
          ))}
        </dl>
      </Row>

      <Row label="Capabilities">
        <RowHeading>Everything behind one script tag.</RowHeading>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
          Replay, funnels, goals, vitals, exports — everything Google Analytics made complicated, one click deeper.
        </p>
        <nav aria-label="Feature index" className="mt-8">
          {capabilityIndex.map((group, index) => (
            <div
              key={group.title}
              className={cn(
                "grid gap-2 py-3.5 sm:grid-cols-[152px_minmax(0,1fr)] sm:gap-6",
                index > 0 && "border-t border-neutral-200 dark:border-neutral-800"
              )}
            >
              <h3 className="text-sm font-medium tracking-tight">{group.title}</h3>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
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
      </Row>

      <Row label="For agents">
        <RowHeading>Analytics your AI can operate.</RowHeading>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
          A hosted MCP server on top of Rybbit&apos;s full REST API. Your agent reads live traffic, debugs errors, and
          manages goals, with the same permissions as a teammate.
        </p>
        <div className="mt-8">
          <AgentConsole />
        </div>
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
      </Row>

      <Row label="Install">
        <RowHeading>Made to meet your stack.</RowHeading>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
          Install Rybbit on the platform you already use. Most sites are collecting data in under five minutes.
        </p>
        <TrackingSnippet className="mt-8 max-w-md" />
        <div className="mt-10">
          <IntegrationsGrid bare />
        </div>
      </Row>

      <Row label="Trusted by">
        <LogoRow align="start" />
      </Row>

      <Row label="From the community">
        <RowHeading>Real posts from people who switched.</RowHeading>
        <div className="relative mt-8 grid h-[500px] grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent dark:from-neutral-950" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent dark:from-neutral-950" />
        </div>
      </Row>

      <Row label="Questions">
        <RowHeading>Questions, answered plainly.</RowHeading>
        <div className="mt-6">
          <FAQAccordion />
        </div>
      </Row>

      <Row label="Pricing">
        <RowHeading>Set your traffic. See your price.</RowHeading>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
          Start your 7-day free trial. No credit card charges until the trial ends.
        </p>
        <div className="mt-8">
          <LandingPricing chrome="bare" />
        </div>
      </Row>

      <Row label="Start" className="lg:pb-28">
        <RowHeading>Start seeing your traffic today.</RowHeading>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
          Cookieless, open source, and live in minutes. Or run it yourself with one Docker command, free forever.
        </p>
        <HeroCtas variant="c" placement="bottom_cta" className="mt-8" />
      </Row>
    </div>
  );
}
