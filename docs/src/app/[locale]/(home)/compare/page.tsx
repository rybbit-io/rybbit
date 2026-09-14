import { CTASection } from "@/components/CTASection";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

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

const competitors = [
  {
    name: "Google Analytics",
    slug: "google-analytics",
    description: "Privacy-first alternative to the most popular analytics platform",
  },
  {
    name: "Plausible",
    slug: "plausible",
    description: "More features with the same privacy-first approach",
  },
  {
    name: "PostHog",
    slug: "posthog",
    description: "Focused web analytics vs a full product suite",
  },
  {
    name: "Umami",
    slug: "umami",
    description: "Advanced features on top of open-source simplicity",
  },
  {
    name: "Fathom",
    slug: "fathom",
    description: "Open-source transparency with deeper analytics",
  },
  {
    name: "Simple Analytics",
    slug: "simpleanalytics",
    description: "Feature-rich analytics without sacrificing privacy",
  },
  {
    name: "Matomo",
    slug: "matomo",
    description: "Modern alternative to the legacy PHP analytics platform",
  },
  {
    name: "Cloudflare Analytics",
    slug: "cloudflare-analytics",
    description: "Full-featured analytics beyond basic traffic metrics",
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
    url: `https://rybbit.com/compare/${c.slug}`,
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
                key={competitor.slug}
                href={`/compare/${competitor.slug}`}
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

        <CTASection
          title="Switch to analytics that's made for you"
          eventLocation="comparison_hub_cta"
        />
      </div>
    </>
  );
}
