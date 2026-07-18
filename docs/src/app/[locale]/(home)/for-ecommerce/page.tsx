import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for Ecommerce | See Every Step From Ad Click to Checkout";
const pageDescription =
  "Checkout funnels, campaign tracking, and custom events with properties — cookieless, so there's no consent banner between a visitor and your store and no consent gap in your numbers.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-ecommerce",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-ecommerce",
    images: [createOGImageUrl("Rybbit for Ecommerce", "See every step between ad click and checkout.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for Ecommerce", "See every step between ad click and checkout.", "Solutions")],
  },
});

const faqItems = [
  {
    question: "Does Rybbit work with Shopify and WooCommerce?",
    answer:
      "Yes. Rybbit works with Shopify, WooCommerce, BigCommerce, PrestaShop, Squarespace, Wix, and any platform that lets you add a script tag. Most store platforms take a few minutes to set up.",
  },
  {
    question: "Can I track purchases and cart events?",
    answer:
      "Yes. Track add-to-cart, checkout steps, and purchases as custom events with properties like SKU or order value, then build funnels and goals on top of them.",
  },
  {
    question: "Does Rybbit have a revenue report?",
    answer:
      "Not a dedicated one yet. Purchases and order values live in custom events and funnels today, so you can see which sources and campaigns convert — but there's no revenue-attribution dashboard.",
  },
  {
    question: "Why do my current analytics undercount my traffic?",
    answer:
      "Consent banners and ad blockers stop cookie-based analytics from seeing a large share of visitors. Rybbit doesn't use cookies or collect personal data, so it isn't gated behind a consent choice — you see the whole audience.",
  },
  {
    question: "Will the tracking script slow my store down?",
    answer:
      "The script loads async, so it doesn't block your pages from rendering. Rybbit also measures web vitals from real visits, so you can watch your store's speed by page and device.",
  },
  {
    question: "Do I need a cookie consent banner for Rybbit?",
    answer:
      "No. Rybbit is GDPR and CCPA compliant without a consent banner, because it doesn't use cookies or collect personal data that could identify your shoppers.",
  },
];

const checkoutFunnel = [
  { label: "Product page", value: "8,412", width: "100%" },
  { label: "Added to cart", value: "2,306", width: "27%" },
  { label: "Started checkout", value: "1,177", width: "14%" },
  { label: "Purchased", value: "604", width: "7.2%" },
];

const campaignRows = [
  { source: "newsletter / summer-drop", visitors: "1,982", conv: "4.8%" },
  { source: "instagram / july-reels", visitors: "3,410", conv: "1.9%" },
  { source: "google / brand", visitors: "2,144", conv: "6.2%" },
];

export default function ForEcommercePage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for ecommerce"
        title="See every step between ad click and checkout."
        description="Campaign tracking, checkout funnels, and custom events with order properties — cookieless, so there's no consent banner between a visitor and your store, and no consent gap in your numbers."
        eventLocation="for_ecommerce_hero"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="ecommerce-problem-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              />
              <div className="relative">
                <SectionKicker>The attribution problem</SectionKicker>
                <h2
                  id="ecommerce-problem-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Attribution breaks when half your visitors decline tracking.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Cookie-based analytics only measures shoppers who click accept, so campaign numbers drift further from
                reality as consent rates fall. Rybbit doesn&apos;t sit behind that choice — the campaign you&apos;re
                judging gets judged on all of its traffic.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="ecommerce-funnel-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <div className="lg:sticky lg:top-24">
              <SectionKicker>Checkout funnels</SectionKicker>
              <h2
                id="ecommerce-funnel-title"
                className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Find out where carts stall.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Build the product-to-purchase funnel from page paths or cart events, and see which step bleeds. Web
                vitals sit on the same dashboard, so a slow step and a leaky step get diagnosed together.
              </p>
              <Link
                href="/features/funnels"
                className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Funnels
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 md:py-14 lg:col-span-8 lg:px-10">
            <div className="max-w-2xl rounded-md border border-neutral-200 p-4 dark:border-neutral-800 sm:p-5">
              <ul className="space-y-3.5">
                {checkoutFunnel.map(step => (
                  <li key={step.label}>
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-neutral-700 dark:text-neutral-300">{step.label}</span>
                      <span className="font-medium tabular-nums">{step.value}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-[1px] bg-neutral-100 dark:bg-neutral-900">
                      <div className="h-full rounded-[1px] bg-(--dataviz)" style={{ width: step.width }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                Product page to purchase <span className="font-medium tabular-nums">7.2%</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="Ecommerce workflow">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 lg:grid-cols-12">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Judge campaigns on conversions, not clicks</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                UTM parameters work out of the box, so every source, campaign, and creative gets its own line — with
                conversion rates from your goals, not just visit counts.
              </p>
              <ul className="mt-6 max-w-lg divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
                {campaignRows.map(row => (
                  <li key={row.source} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="truncate font-mono text-xs text-neutral-700 dark:text-neutral-300">
                      {row.source}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
                      <span className="text-neutral-500 dark:text-neutral-400">{row.visitors}</span>
                      <span className="font-medium">{row.conv}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Events that carry the order</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Track add-to-cart, checkout steps, and purchases as custom events with properties like SKU and order
                value — then build goals and funnels on exactly those moments.
              </p>
              <Link
                href="/features/custom-events"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Custom events
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Launch-drop realtime</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                When the drop goes live, watch traffic, sources, and purchases move in realtime — and let bot
                blocking keep the scrapers out of your conversion math.
              </p>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">A slow store is a silent discount</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Web vitals from real shopper visits show which pages feel slow, by route, country, and device — so
                you fix the product page that's quietly costing conversions instead of guessing.
              </p>
              <Link
                href="/features/web-vitals"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Web vitals
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="Ecommerce questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="for-ecommerce" />

      <CTASection
        title="Know which campaigns sell, not just which ones click."
        description="Checkout funnels, campaign conversion, and full traffic — with no consent banner in the way."
        eventLocation="for_ecommerce_bottom_cta"
      />
    </div>
  );
}
