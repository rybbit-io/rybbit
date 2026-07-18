import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight, Globe } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for Creators & Publishers | Know What Resonates";
const pageDescription =
  "See which posts land, where readers come from, and which searches bring them in — without putting cookies or a consent banner on your audience. Share your dashboard publicly if you build in public.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-creators",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-creators",
    images: [createOGImageUrl("Rybbit for Creators", "Know what resonates. Skip the surveillance.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for Creators", "Know what resonates. Skip the surveillance.", "Solutions")],
  },
});

const faqItems = [
  {
    question: "Do I need a cookie banner on my blog?",
    answer:
      "No. Rybbit doesn't use cookies or collect personal data about your readers, so it's GDPR and CCPA compliant without a consent banner cluttering your site.",
  },
  {
    question: "Will analytics slow my site down?",
    answer:
      "The script loads async, so it doesn't block your pages from rendering. Rybbit also measures web vitals from real visits, so you can see your site's actual speed instead of guessing.",
  },
  {
    question: "Can I share my stats publicly?",
    answer:
      "Yes. Any dashboard can be made fully public or shared with a secret link — useful if you build in public, or if a sponsor asks for your numbers.",
  },
  {
    question: "Does Rybbit work with my platform?",
    answer:
      "Rybbit works anywhere you can add a script tag: WordPress, Ghost, Webflow, Squarespace, Wix, Framer, Hugo, Astro, Jekyll, and every major framework. Most setups take a few minutes.",
  },
  {
    question: "Can I see which search queries bring readers in?",
    answer:
      "Yes. Connect Google Search Console and the queries that bring searchers to your site appear alongside your other traffic sources.",
  },
  {
    question: "What does it cost for a personal site?",
    answer:
      "Standard starts at $13/month billed annually for 100K pageviews, with a 7-day free trial. Rybbit is also open source — self-hosting on your own server is free.",
  },
];

const topPosts = [
  { title: "The build-vs-buy essay", views: "4,812" },
  { title: "How I set up my writing pipeline", views: "3,940" },
  { title: "Notes on a year of self-hosting", views: "2,377" },
];

const readerSources = [
  { source: "Newsletter", share: "34%" },
  { source: "Google", share: "27%" },
  { source: "X / Twitter", share: "17%" },
  { source: "Hacker News", share: "11%" },
];

export default function ForCreatorsPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for creators & publishers"
        title="Know what resonates. Skip the surveillance."
        description="See which posts land, where readers come from, and which searches bring them in — without putting cookies, fingerprinting, or a consent banner on the people who read you."
        eventLocation="for_creators_hero"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="creators-ethics-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              />
              <div className="relative">
                <SectionKicker>Your audience, not your product</SectionKicker>
                <h2
                  id="creators-ethics-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Your readers came for the writing. Don&apos;t make them the product.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Free analytics is paid for with your audience's data. Rybbit's answer is structural: no cookies, no
                personal data, daily-salted IDs that can't fingerprint anyone — and a subscription instead of an ad
                machine behind the numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="Creator workflow">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 lg:grid-cols-12">
            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Which posts actually land</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Top pages in realtime, so on publish day you watch a post find its readers — and over months you learn
                which topics deserve the sequel.
              </p>
              <ul className="mt-6 max-w-lg divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
                {topPosts.map(post => (
                  <li key={post.title} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="truncate text-neutral-700 dark:text-neutral-300">{post.title}</span>
                    <span className="shrink-0 font-medium tabular-nums">{post.views}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Where readers come from</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Referrers and UTM tags separate the newsletter from the socials from the search traffic — so you know
                which channel is worth the effort.
              </p>
              <ul className="mt-6 max-w-sm space-y-2 text-sm">
                {readerSources.map(row => (
                  <li key={row.source} className="flex items-center justify-between gap-3">
                    <span className="text-neutral-600 dark:text-neutral-400">{row.source}</span>
                    <span className="font-medium tabular-nums">{row.share}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-5 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">The searches that find you</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Connect Google Search Console and see the queries that bring searchers in, next to the rest of your
                traffic — no second tab, no export.
              </p>
            </article>

            <article className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:col-span-7 lg:px-10">
              <h3 className="text-lg font-semibold tracking-tight">Goals for the numbers that pay</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Set a goal on newsletter signups or a product page, and see which posts convert readers into
                subscribers — the difference between traffic and an audience.
              </p>
              <Link
                href="/features/goals"
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Goals
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="creators-public-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <h2
              id="creators-public-title"
              className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              Build in public. Literally.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Make your dashboard fully public and put the link in your bio, or share it privately with a secret link
              when a sponsor asks for real numbers. Your stats become something you can point at instead of a
              screenshot you have to crop.
            </p>
          </div>
          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <div className="flex max-w-sm items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
              <Globe aria-hidden="true" className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                app.rybbit.io/share/your-blog
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Public, secret-link, or private — per dashboard, switchable any time.
            </p>
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="Creator questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="for-creators" />

      <CTASection
        title="Publish. Then watch it land."
        description="Top pages, reader sources, and search queries — on analytics your audience never has to click 'accept' for."
        eventLocation="for_creators_bottom_cta"
      />
    </div>
  );
}
