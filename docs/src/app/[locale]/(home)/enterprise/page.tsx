import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const pageTitle = "Rybbit for Enterprise | Open-Source Analytics Your Security Team Can Read";
const pageDescription =
  "SSO, dedicated isolated instances, on-premise installation, infinite retention, whitelabeling, and an uptime SLA — on a 100% open-source codebase your security review can audit line by line.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/enterprise",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/enterprise",
    images: [createOGImageUrl("Rybbit for Enterprise", "Open-source analytics your security team can read.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for Enterprise", "Open-source analytics your security team can read.", "Solutions")],
  },
});

const faqItems = [
  {
    question: "Can we run Rybbit on our own infrastructure?",
    answer:
      "Yes. Enterprise includes on-premise installation and dedicated isolated instances, and the product itself is open source under AGPL v3 — self-hosting is free for personal and business use.",
  },
  {
    question: "Does Rybbit support Single Sign-On?",
    answer:
      "Yes, SSO is included on the Enterprise plan. Contact us about your identity provider and setup.",
  },
  {
    question: "How long is data retained?",
    answer:
      "Standard keeps 3 years, Pro keeps 5, and Enterprise retention is infinite — your history doesn't expire out from under you.",
  },
  {
    question: "What does enterprise support look like?",
    answer:
      "Enterprise includes an uptime SLA, enterprise support with Slack or live chat, and manual invoicing for procurement processes that need it.",
  },
  {
    question: "Is there a Data Processing Agreement?",
    answer:
      "Yes — a DPA is available at rybbit.com/dpa, alongside a public security page. The cloud is EU-hosted, and visitor tracking is cookieless with daily-salted IDs.",
  },
  {
    question: "Can we white-label the dashboard?",
    answer:
      "Yes. Whitelabeling is an Enterprise feature, along with custom features scoped to your deployment — talk to us about what your rollout needs.",
  },
];

// Same white-SVG treatment the homepage logo band uses.
const whiteSvgLogo = "opacity-40 invert dark:opacity-60 dark:invert-0";

const enterpriseLogos = [
  { src: "/logos/bosch.svg", alt: "Bosch", width: 120, className: whiteSvgLogo },
  { src: "/logos/govuk-logo.svg", alt: "GOV.UK", width: 120, className: whiteSvgLogo },
  { src: "/logos/royalcaribbean.svg", alt: "Royal Caribbean", width: 120, className: whiteSvgLogo },
  { src: "/logos/op.svg", alt: "OP.GG", width: 120, className: whiteSvgLogo },
  { src: "/logos/ustwo.svg", alt: "ustwo", width: 100, className: whiteSvgLogo },
  { src: "/logos/softr.svg", alt: "Softr", width: 100, className: whiteSvgLogo },
];

const enterpriseFeatures = [
  {
    title: "Single Sign-On",
    description: "Bring analytics under your identity provider instead of another password.",
  },
  {
    title: "Dedicated isolated instance",
    description: "Your organization's data on its own instance, separated from every other tenant.",
  },
  {
    title: "On-premise installation",
    description: "Run the full product inside your own network when the data can't leave.",
  },
  {
    title: "Infinite data retention",
    description: "Year-over-year comparisons that still work a decade from now.",
  },
  {
    title: "Whitelabeling",
    description: "Your brand on the dashboards your teams and clients see.",
  },
  {
    title: "Uptime SLA",
    description: "A contractual availability commitment, not a status-page promise.",
  },
  {
    title: "Enterprise support",
    description: "Slack or live-chat support with the people who build the product.",
  },
  {
    title: "Manual invoicing",
    description: "Purchase orders and procurement-friendly billing, when card payments don't fit.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow="Rybbit for enterprise"
        title="Open-source analytics your security team can read."
        description="SSO, dedicated instances, on-premise installation, infinite retention, and an SLA — on a codebase your security review can audit line by line instead of taking on faith."
        eventLocation="enterprise_hero"
        primaryAction={{ href: "/contact", label: "Contact us", eventName: "contact" }}
        note="Prefer self-serve? Every plan starts with a 7-day free trial."
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="enterprise-proof">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-2 gap-px border-x border-neutral-200 bg-neutral-200 p-px dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-3 lg:grid-cols-6">
          <GridCrosses />
          <div className="col-span-full flex min-h-14 items-center bg-white px-5 dark:bg-neutral-950 sm:px-8">
            <p id="enterprise-proof" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Trusted by 10,000+ organizations worldwide
            </p>
          </div>
          {enterpriseLogos.map(logo => (
            <div key={logo.alt} className="flex min-h-24 items-center justify-center bg-white dark:bg-neutral-950">
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={40}
                className={`max-h-7 w-auto max-w-[112px] ${logo.className}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="enterprise-features-title">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <SectionKicker>The Enterprise plan</SectionKicker>
              <h2
                id="enterprise-features-title"
                className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                Everything procurement will ask about.
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Enterprise is everything in Pro — funnels, replays, unlimited websites and team members — plus the
                layer large organizations actually negotiate over.
              </p>
              <Link
                href="/pricing"
                className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Compare all plans
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
          <div className="grid lg:col-span-8 sm:grid-cols-2">
            {enterpriseFeatures.map((feature, index) => (
              <article
                key={feature.title}
                className={`border-b border-neutral-200 px-5 py-8 dark:border-neutral-800 sm:px-8 lg:px-10 ${
                  index % 2 === 0 ? "sm:border-r" : ""
                } ${index >= enterpriseFeatures.length - 2 ? "sm:[&:nth-last-child(-n+2)]:border-b-0" : ""}`}
              >
                <h3 className="font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="enterprise-audit-title">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              />
              <div className="relative">
                <SectionKicker>Auditability</SectionKicker>
                <h2
                  id="enterprise-audit-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  Vendor reviews go faster when the vendor is source-available.
                </h2>
              </div>
            </div>
            <div className="flex flex-col justify-center px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                Every line of Rybbit — including the cloud and enterprise code — is public on GitHub under AGPL v3.
                Your security team reviews the actual data path, not a marketing diagram of it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <a
                  href="https://github.com/rybbit-io/rybbit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Read the source
                  <ExternalLink
                    className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </a>
                <Link
                  href="/security"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  Security overview
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/dpa"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  DPA
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PersonaFaqSection heading="Enterprise questions, answered plainly." items={faqItems} />
      <PersonaCrossLinks current="enterprise" />

      <CTASection
        title="Bring your security team. We like it that way."
        description="SSO, dedicated instances, on-prem, and an SLA — on a codebase you can audit before you sign."
        primaryButtonText="Contact us"
        primaryButtonHref="/contact"
        eventLocation="enterprise_bottom_cta"
      />
    </div>
  );
}
