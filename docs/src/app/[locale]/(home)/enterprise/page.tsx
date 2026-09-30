import { ArrowRight, ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { CTASection } from "@/components/CTASection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

const pageTitle = "Rybbit for Enterprise | Open-Source Analytics Your Security Team Can Read";
const pageDescription =
  "SSO, dedicated isolated instances, on-premise installation, infinite retention, whitelabeling, and an uptime SLA, all on a 100% open-source codebase your security review can audit line by line.";

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
    images: [
      createOGImageUrl("Rybbit for Enterprise", "Open-source analytics your security team can read.", "Solutions"),
    ],
  },
  twitter: {
    images: [
      createOGImageUrl("Rybbit for Enterprise", "Open-source analytics your security team can read.", "Solutions"),
    ],
  },
});

// Same white-SVG treatment the homepage logo band uses.
const whiteSvgLogo = "opacity-40 invert dark:opacity-60 dark:invert-0";

const enterpriseLogos = [
  { src: "/logos/bosch.svg", alt: "bosch", width: 120, className: whiteSvgLogo },
  { src: "/logos/texas-instruments.svg", alt: "Texas Instruments", width: 120, className: whiteSvgLogo },
  { src: "/logos/govuk-logo.svg", alt: "GOV.UK", width: 120, className: whiteSvgLogo },
  { src: "/logos/royalcaribbean.svg", alt: "Royal Caribbean", width: 120, className: whiteSvgLogo },
  { src: "/logos/netapp.svg", alt: "NetApp", width: 120, className: whiteSvgLogo },
  { src: "/logos/trafigura.svg", alt: "Trafigura", width: 120, className: whiteSvgLogo },
];

export default function EnterprisePage() {
  const t = useExtracted();
  const faqItems = [
    {
      question: t("Can we run Rybbit on our own infrastructure?"),
      answer: t(
        "Yes. Enterprise includes on-premise installation and dedicated isolated instances, and the product itself is open source under AGPL v3. Self-hosting is free for personal and business use."
      ),
    },
    {
      question: t("Does Rybbit support Single Sign-On?"),
      answer: t("Yes, SSO is included on the Enterprise plan. Contact us about your identity provider and setup."),
    },
    {
      question: t("How long is data retained?"),
      answer: t(
        "Standard keeps 3 years, Pro keeps 5, and Enterprise retention is infinite. Your history doesn't expire out from under you."
      ),
    },
    {
      question: t("What does enterprise support look like?"),
      answer: t(
        "Enterprise includes an uptime SLA, enterprise support with Slack or live chat, and manual invoicing for procurement processes that need it."
      ),
    },
    {
      question: t("Is there a Data Processing Agreement?"),
      answer: t(
        "Yes. A DPA is available at rybbit.com/dpa, alongside a public security page. The cloud is EU-hosted, and visitor tracking is cookieless with daily-salted IDs."
      ),
    },
    {
      question: t("Can we white-label the dashboard?"),
      answer: t(
        "Yes. Whitelabeling is an Enterprise feature, along with custom features scoped to your deployment. Talk to us about what your rollout needs."
      ),
    },
  ];

  const enterpriseFeatures = [
    {
      title: t("Single Sign-On"),
      description: t("Bring analytics under your identity provider instead of another password."),
    },
    {
      title: t("Dedicated isolated instance"),
      description: t("Your organization's data on its own instance, separated from every other tenant."),
    },
    {
      title: t("On-premise installation"),
      description: t("Run the full product inside your own network when the data can't leave."),
    },
    {
      title: t("Infinite data retention"),
      description: t("Year-over-year comparisons that still work a decade from now."),
    },
    {
      title: t("Whitelabeling"),
      description: t("Your brand on the dashboards your teams and clients see."),
    },
    {
      title: t("Uptime SLA"),
      description: t("A contractual availability commitment, not a status-page promise."),
    },
    {
      title: t("Enterprise support"),
      description: t("Slack or live-chat support with the people who build the product."),
    },
    {
      title: t("Manual invoicing"),
      description: t("Purchase orders and procurement-friendly billing, when card payments don't fit."),
    },
  ];

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow={t("Rybbit for enterprise")}
        title={t("Open-source analytics your security team can read.")}
        description={t(
          "SSO, dedicated instances, on-premise installation, infinite retention, and an SLA, all on a codebase your security review can audit line by line instead of taking on faith."
        )}
        eventLocation="enterprise_hero"
        primaryAction={{ href: "/contact", label: t("Contact us"), eventName: "contact" }}
        note={t("Prefer self-serve? Every plan starts with a 7-day free trial.")}
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="enterprise-proof">
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-2 gap-px border-x border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-3 lg:grid-cols-6">
          <GridCrosses />
          {/* <div className="col-span-full flex min-h-14 items-center bg-white px-5 dark:bg-neutral-950 sm:px-8">
            <p id="enterprise-proof" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Trusted by 10,000+ organizations worldwide
            </p>
          </div> */}
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

      <section
        className="border-b border-neutral-200 dark:border-neutral-800"
        aria-labelledby="enterprise-features-title"
      >
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <SectionKicker>{t("The Enterprise plan")}</SectionKicker>
              <h2
                id="enterprise-features-title"
                className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
              >
                {t("Everything procurement will ask about.")}
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {t(
                  "Enterprise is everything in Pro (funnels, replays, unlimited websites and team members) plus the layer large organizations actually negotiate over."
                )}
              </p>
              <Link
                href="/pricing"
                className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {t("Compare all plans")}
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
                className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
              />
              <div className="relative">
                <SectionKicker>{t("Auditability")}</SectionKicker>
                <h2
                  id="enterprise-audit-title"
                  className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-balance md:text-5xl"
                >
                  {t("Vendor reviews go faster when the vendor is source-available.")}
                </h2>
              </div>
            </div>
            <div className="flex flex-col justify-center px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
              <p className="max-w-md text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                {t(
                  "Every line of Rybbit, including the cloud and enterprise code, is public on GitHub under AGPL v3. Your security team reviews the actual data path, not a marketing diagram of it."
                )}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <a
                  href="https://github.com/rybbit-io/rybbit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  {t("Read the source")}
                  <ExternalLink
                    className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </a>
                <Link
                  href="/security"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  {t("Security overview")}
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/dpa"
                  className="group inline-flex items-center gap-1.5 rounded-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
                >
                  {t("DPA")}
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

      <PersonaFaqSection heading={t("Enterprise FAQ")} items={faqItems} />
      <PersonaCrossLinks current="enterprise" />

      <CTASection
        title={t("Bring your security team. We like it that way.")}
        description={t(
          "SSO, dedicated instances, on-prem, and an SLA, all on a codebase you can audit before you sign."
        )}
        primaryButtonText="Contact us"
        primaryButtonHref="/contact"
        eventLocation="enterprise_bottom_cta"
      />
    </div>
  );
}
