import { CTASection } from "@/components/CTASection";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { comparedCompetitors } from "./data/competitors";
import { vsPairName, vsPairs } from "./data/vsPairs";

export const metadata: Metadata = {
  title: "Rybbit vs The Competition: Analytics Alternatives Compared",
  description:
    "See how Rybbit compares to Google Analytics, Plausible, PostHog, Umami, Fathom, Simple Analytics, Matomo, and Cloudflare Analytics. Privacy-first, open-source web analytics.",
  openGraph: {
    title: "Rybbit vs The Competition: Analytics Alternatives Compared",
    description:
      "Side-by-side comparisons of Rybbit with every major analytics platform. Find the right tool for your team.",
    type: "website",
    url: "https://rybbit.com/compare",
    images: [
      createOGImageUrl(
        "Rybbit vs The Competition",
        "Side-by-side comparisons with every major analytics platform.",
        "Compare"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs The Competition",
    description:
      "Compare Rybbit with Google Analytics, Plausible, PostHog, and more.",
    images: [
      createOGImageUrl(
        "Rybbit vs The Competition",
        "Compare Rybbit with Google Analytics, Plausible, PostHog, and more.",
        "Compare"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/compare",
  },
};

// Names, card text, and order come from the competitor registry (data/competitors.ts).
const competitors = comparedCompetitors.flatMap((competitor) =>
  competitor.hubDescription
    ? [{ name: competitor.name, href: competitor.comparePath, description: competitor.hubDescription }]
    : []
);

const guides = [
  {
    title: "Best Google Analytics alternatives",
    href: "/blog/best-google-analytics-alternatives",
    description: "Nine GA4 alternatives compared on price, privacy, and features",
  },
  {
    title: "Best web analytics tools",
    href: "/blog/best-web-analytics-tools",
    description: "Ten tools compared by use case",
  },
  {
    title: "Best session replay tools",
    href: "/blog/best-session-replay-tools",
    description: "Ten replay tools, including free and open-source options",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Rybbit Analytics Comparisons",
  description: "Compare Rybbit with popular analytics platforms",
  numberOfItems: competitors.length,
  itemListElement: competitors.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: `Rybbit vs ${c.name}`,
    url: `https://rybbit.com${c.href}`,
  })),
};

export default function ComparePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="overflow-x-clip">
        <InteriorPageHero
          eyebrow="Platform comparisons"
          title="Rybbit vs The Competition"
          description="See how Rybbit stacks up against every major analytics platform. Privacy-first, open source, and built for modern teams."
          eventLocation="comparison_hub_hero"
        />

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="comparison-directory-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <div className="lg:sticky lg:top-24">
                <h2 id="comparison-directory-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                  Compare the field
                </h2>
                <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Direct comparisons across product scope, privacy, ownership, and pricing.
                </p>
              </div>
            </div>
            <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 lg:col-span-8 md:grid-cols-2">
            {competitors.map((competitor) => (
              <Link
                key={competitor.href}
                href={competitor.href}
                className="group flex min-h-48 flex-col justify-between bg-white px-5 py-9 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:px-8 lg:px-10"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">Rybbit vs</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{competitor.name}</h3>
                </div>
                <div className="mt-8 flex items-end justify-between gap-4">
                  <p className="max-w-xs text-sm leading-6 text-neutral-600 dark:text-neutral-400">{competitor.description}</p>
                  <ArrowRight className="mb-1 size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" aria-hidden="true" />
                </div>
              </Link>
            ))}
            </div>
          </div>
        </section>

        {vsPairs.length > 0 && (
          <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="comparison-pairs-title">
            <div className="mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
              <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
                <div className="lg:sticky lg:top-24">
                  <h2 id="comparison-pairs-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                    Head-to-head comparisons
                  </h2>
                  <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                    Choosing between two other tools? These pages compare them directly, with a source for every claim.
                  </p>
                </div>
              </div>
              <div className="lg:col-span-8">
                {vsPairs.map((pair) => (
                  <Link
                    key={pair.slug}
                    href={`/compare/${pair.slug}`}
                    className="group grid border-b border-neutral-200 px-5 py-7 last:border-b-0 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
                  >
                    <span className="font-semibold">{vsPairName(pair)}</span>
                    <span className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:mt-0">{pair.hubDescription}</span>
                    <ArrowRight className="mt-4 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 sm:mt-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="comparison-guides-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <div className="lg:sticky lg:top-24">
                <h2 id="comparison-guides-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                  Buying guides
                </h2>
                <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Weighing more than two tools? These roundups compare the wider field, Rybbit included.
                </p>
              </div>
            </div>
            <div className="lg:col-span-8">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group grid border-b border-neutral-200 px-5 py-7 last:border-b-0 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
                >
                  <span className="font-semibold">{guide.title}</span>
                  <span className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:mt-0">{guide.description}</span>
                  <ArrowRight className="mt-4 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 sm:mt-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <CTASection
          title="Switch to analytics that's made for you"
          eventLocation="comparison_hub_cta"
        />
      </div>
    </>
  );
}
