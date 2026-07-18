import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for European Companies | EU-Hosted, Cookieless Analytics";
const pageDescription =
  "EU-hosted cloud, no cookies, no consent banner, a DPA ready to sign — and a self-host option when residency has to go all the way down to the server. GDPR compliant by design.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-european-companies",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-european-companies",
    images: [createOGImageUrl("Rybbit for European Companies", "EU-hosted, cookieless, compliant by design.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for European Companies", "EU-hosted, cookieless, compliant by design.", "Solutions")],
  },
});

const faqItems = [
  {
    question: "Is Rybbit GDPR and CCPA compliant?",
    answer:
      "Yes. Rybbit doesn't use cookies or collect personal data that could identify visitors, and user IDs are salted daily so nobody can be fingerprinted. You won't need to show a cookie consent banner for analytics.",
  },
  {
    question: "Where is the cloud hosted?",
    answer:
      "Rybbit's cloud is EU-hosted. If your requirements go further than that, you can self-host the entire product on infrastructure you control, in any region you choose.",
  },
  {
    question: "Do you offer a Data Processing Agreement?",
    answer:
      "Yes. Rybbit provides a DPA — see rybbit.com/dpa. Dedicated isolated instances and on-premise installation are available on the Enterprise plan for stricter setups.",
  },
  {
    question: "Do visitors need to consent before Rybbit runs?",
    answer:
      "Analytics that doesn't collect personal data doesn't sit behind a consent choice. That's also an accuracy point: you measure all of your visitors, not the subset who click accept.",
  },
  {
    question: "Can we keep the data entirely on our own infrastructure?",
    answer:
      "Yes. Rybbit is open source under AGPL v3 — the full product self-hosts with Docker on your own servers, which is the strongest data-residency answer there is.",
  },
];

const complianceRows = [
  {
    title: "EU-hosted cloud",
    description: "Rybbit's managed cloud is EU-hosted — the default option is already the compliant one.",
  },
  {
    title: "No cookies, no banner",
    description:
      "Rybbit collects no personal data and sets no cookies, so analytics doesn't trigger a consent requirement on your sites.",
  },
  {
    title: "No fingerprinting, by construction",
    description:
      "Visitor IDs are salted daily, so they can't be used to fingerprint or follow a person over time — a design property, not a policy promise.",
  },
  {
    title: "DPA ready to sign",
    description: "A Data Processing Agreement is available for your records, along with a public security page.",
  },
];

export default function ForEuropeanCompaniesPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for European companies"
        title="Analytics that doesn't need a legal review."
        description="EU-hosted cloud, no cookies, no consent banner, and a DPA ready to sign — with a self-host option when residency has to go all the way down to the server."
        eventLocation="for_european_companies_hero"
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="eu-accuracy-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              />
              <div className="relative">
                <SectionKicker>Compliance is an accuracy feature</SectionKicker>
                <h2
                  id="eu-accuracy-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  No cookies means no banner. No banner means all of your traffic.
                </h2>
              </div>
            </div>
            <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Consent-gated analytics only measures the visitors who click accept, so every report starts from a
                partial number. Analytics that never touches personal data doesn&apos;t have that gap — compliance
                and accurate data stop being a trade-off.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="eu-compliance-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <h2
                id="eu-compliance-title"
                className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                What your DPO will ask. In order.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                The short version of the review, in one place — with the documents linked below it.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <Link
                  href="/dpa"
                  className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Data Processing Agreement
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/security"
                  className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  Security overview
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/privacy"
                  className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  Privacy policy
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            {complianceRows.map(row => (
              <div
                key={row.title}
                className="grid border-b border-neutral-200 px-5 py-8 last:border-b-0 dark:border-neutral-800 sm:grid-cols-[220px_1fr] sm:gap-6 sm:px-8 lg:px-10"
              >
                <h3 className="font-semibold tracking-tight">{row.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600 dark:text-neutral-400 sm:mt-0">
                  {row.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="eu-selfhost-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
            <h2
              id="eu-selfhost-title"
              className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
            >
              When "EU-hosted" isn&apos;t strict enough, host it yourself.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Rybbit is 100% open source under AGPL v3 and self-hosts with Docker. For regulated setups, Enterprise
              adds dedicated isolated instances and on-premise installation — the residency conversation ends at
              your own rack.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
            <Link
              href="/docs/self-hosting"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Self-hosting guide
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/enterprise"
              className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
            >
              Rybbit for enterprise
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="European-company questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="for-european-companies" />

      <CTASection
        title="Compliant by default. Accurate because of it."
        description="EU-hosted, cookieless, and banner-free — with self-hosting when the answer has to be your own servers."
        eventLocation="for_european_companies_bottom_cta"
      />
    </div>
  );
}
