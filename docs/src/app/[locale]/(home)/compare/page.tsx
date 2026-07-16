import { BackgroundGrid } from "@/components/BackgroundGrid";
import { CTASection } from "@/components/CTASection";
import { createOGImageUrl } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Tilt_Warp } from "next/font/google";
import Link from "next/link";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

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
    description: "Focused web analytics vs all-in-one product suite",
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
      <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
        <BackgroundGrid />
        <div className="relative flex flex-col py-8">
          <h1
            className={cn(
              "relative z-10 text-4xl md:text-5xl lg:text-7xl font-medium px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-100 dark:to-gray-400",
              tilt_wrap.className
            )}
          >
            Rybbit vs The Competition
          </h1>
          <h2 className="relative z-10 text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-3xl text-center text-neutral-600 dark:text-neutral-300 font-light mx-auto">
            See how Rybbit stacks up against every major analytics platform. Privacy-first, open source, and built for modern teams.
          </h2>
        </div>

        <section className="w-full max-w-4xl mx-auto px-4 py-12 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((competitor) => (
              <Link
                key={competitor.slug}
                href={`/compare/${competitor.slug}`}
                className="group bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-colors"
              >
                <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 group-hover:border-emerald-500/20 dark:group-hover:border-emerald-500/10 p-6 h-full transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">
                      Rybbit vs {competitor.name}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {competitor.description}
                  </p>
                </div>
              </Link>
            ))}
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
