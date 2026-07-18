import { CTASection } from "@/components/CTASection";
import { Funnels } from "@/components/Cards/Funnels";
import { RealTimeAnalytics } from "@/components/Cards/RealTimeAnalytics";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { UserSessions } from "@/components/Cards/UserSessions";
import { FAQAccordion } from "@/components/FAQAccordion";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { TweetCard } from "@/components/Tweet";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Blocks,
  Bot,
  Braces,
  Check,
  CircleGauge,
  Cloud,
  Code2,
  Download,
  Globe2,
  LockKeyhole,
  MousePointer2,
  Route,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Rybbit GDPR and CCPA compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is fully compliant with GDPR, CCPA, and other privacy regulations. We don't use cookies or collect any personal data that could identify your users. We salt user IDs daily to ensure users are not fingerprinted. You will not need to display a cookie consent banner to your users.",
      },
    },
    {
      "@type": "Question",
      name: "How does Rybbit compare to Google Analytics?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit is much less bloated than Google Analytics, both in terms of our tracking script and the UX of the dashboard. We show you exactly what you need to see.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Rybbit is available as a self-hosted option, or as a managed cloud service hosted in the EU.",
      },
    },
    {
      "@type": "Question",
      name: "How easy is it to set up Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Add a small script to your website or install @rybbit/js from npm. Most users are up and running in less than five minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Rybbit support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit works with virtually any website platform, including WordPress, Shopify, Next.js, React, Vue, and many more.",
      },
    },
    {
      "@type": "Question",
      name: "Is Rybbit open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Rybbit is open source under the AGPL 3.0 license and can be self-hosted for personal or business use.",
      },
    },
  ],
};

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

const customerLogos = [
  { src: "/logos/automatio.webp", alt: "Automatio", width: 124, href: "https://automatio.ai" },
  { src: "/logos/convex.svg", alt: "Convex", width: 112 },
  { src: "/logos/onyx.webp", alt: "Onyx", width: 88, href: "https://onyx.app" },
  { src: "/logos/vanguard.webp", alt: "Vanguard", width: 112 },
  { src: "/logos/ustwo.svg", alt: "ustwo", width: 88 },
  { src: "/logos/mydramalist.png", alt: "MyDramaList", width: 112 },
  { src: "/logos/dtelecom.svg", alt: "DTelecom", width: 108 },
  { src: "/logos/dpm.webp", alt: "DPM.lol", width: 102 },
];

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  const capabilityGroups = [
    {
      title: t("Measure"),
      description: t("A clean, trustworthy view of every important signal."),
      items: [
        { icon: Activity, label: t("Realtime analytics") },
        { icon: Globe2, label: t("Geography and globe views") },
        { icon: CircleGauge, label: t("Web vitals") },
        { icon: Bot, label: t("Bot filtering") },
      ],
    },
    {
      title: t("Understand"),
      description: t("Move from a trend to the behavior behind it."),
      items: [
        { icon: MousePointer2, label: t("Session replay") },
        { icon: Route, label: t("User journeys") },
        { icon: Users, label: t("User profiles") },
        { icon: Blocks, label: t("Funnels and retention") },
      ],
    },
    {
      title: t("Operate"),
      description: t("Keep the whole team close to the data."),
      items: [
        { icon: Bell, label: t("Email reports") },
        { icon: ShieldCheck, label: t("Error tracking") },
        { icon: Download, label: t("Raw data export") },
        { icon: Braces, label: t("Full API access") },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

      <section className="border-b border-neutral-200 dark:border-neutral-800/80" aria-label={t("Customer logos")}>
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 px-5 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="flex items-center border-b border-neutral-200 py-6 dark:border-neutral-800 lg:col-span-3 lg:border-b-0 lg:border-r lg:py-8 lg:pr-8">
            <p className="max-w-[18rem] text-sm font-medium leading-6 text-neutral-600 dark:text-neutral-300">
              {t("Trusted by more than 10,000 organizations worldwide")}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:col-span-9">
            {customerLogos.map(logo => {
              const logoImage = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={36}
                  className="h-auto max-h-7 w-auto max-w-[116px] opacity-55 grayscale transition-opacity hover:opacity-90 dark:invert"
                />
              );

              return (
                <div key={logo.alt} className="flex min-h-20 items-center justify-center border-b border-neutral-200 px-3 dark:border-neutral-800 sm:[&:nth-last-child(-n+4)]:border-b-0">
                  {logo.href ? (
                    <a href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt} className="flex min-h-20 w-full items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                      {logoImage}
                    </a>
                  ) : (
                    logoImage
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 lg:py-36">
        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 border-b border-neutral-200 pb-12 dark:border-neutral-800 md:grid-cols-12 md:pb-16">
            <h2 className="max-w-[14ch] text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-950 dark:text-white md:col-span-7 md:text-6xl">
              {t("Start with the answer. Go deeper when you need to.")}
            </h2>
            <div className="flex flex-col justify-end md:col-span-4 md:col-start-9">
              <p className="text-pretty text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg md:leading-8">
                {t("Rybbit brings web analytics and product analytics into one readable system. No report builder, no maze of menus, no days of setup.")}
              </p>
              <Link
                href="/features"
                className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm font-semibold text-neutral-900 transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-white dark:hover:text-emerald-400"
              >
                {t("Explore every feature")}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <RealTimeAnalytics />
            </div>
            <div className="lg:col-span-7">
              <SessionReplay />
            </div>
            <div className="lg:col-span-5">
              <Funnels />
            </div>
            <div className="lg:col-span-12">
              <UserSessions />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-100/70 dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="max-w-[12ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 dark:text-white md:text-5xl">
                {t("The full analytics stack, without the usual weight.")}
              </h2>
            </div>
            <p className="max-w-[48ch] text-base leading-7 text-neutral-600 dark:text-neutral-300 md:col-span-5 md:col-start-8 md:text-lg">
              {t("Every tool follows the same interaction model, so advanced analysis still feels familiar. Your team learns the product once—not one workflow per report.")}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 border-t border-neutral-300 dark:border-neutral-700 md:grid-cols-3">
            {capabilityGroups.map((group, groupIndex) => (
              <div
                key={group.title}
                className={`py-8 md:px-7 md:py-10 ${groupIndex > 0 ? "border-t border-neutral-300 dark:border-neutral-700 md:border-l md:border-t-0" : ""} ${groupIndex === 0 ? "md:pl-0" : ""}`}
              >
                <h3 className="text-xl font-semibold text-neutral-950 dark:text-white">{group.title}</h3>
                <p className="mt-2 min-h-12 max-w-[32ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {group.description}
                </p>
                <ul className="mt-7 space-y-4">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <li key={item.label} className="flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                        {item.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-950 text-white">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 px-5 py-20 sm:px-6 md:grid-cols-12 md:py-28 lg:px-8">
          <div className="md:col-span-6 md:pr-12">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {t("Privacy is architecture, not a setting")}
            </div>
            <h2 className="mt-7 max-w-[12ch] text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-6xl">
              {t("Your analytics should belong to you.")}
            </h2>
            <p className="mt-7 max-w-[54ch] text-base leading-7 text-neutral-300 md:text-lg md:leading-8">
              {t("Rybbit is cookieless by design, salts visitor identifiers daily, and never sells user data. Choose our EU-hosted cloud or run the exact same product on your own infrastructure.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-neutral-200">
              {[t("No cookie banner"), t("GDPR and CCPA ready"), t("AGPL-3.0 open source")].map(item => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-14 md:col-span-5 md:col-start-8 md:mt-0">
            <div className="border-y border-neutral-700">
              <div className="flex items-start gap-4 border-b border-neutral-700 py-6">
                <Cloud className="mt-1 h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold">{t("Managed in the EU")}</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-400">{t("Start in minutes on infrastructure hosted in Germany.")}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 py-6">
                <Server className="mt-1 h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold">{t("Self-host anywhere")}</h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-400">{t("Deploy the complete platform and keep every byte on your network.")}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3 text-xs text-neutral-400">
                <span>terminal</span>
                <Code2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <pre className="overflow-x-auto px-4 py-5 text-sm leading-7 text-neutral-200"><code><span className="text-emerald-400">$</span> git clone https://github.com/rybbit-io/rybbit<br /><span className="text-emerald-400">$</span> docker compose up -d</code></pre>
            </div>

            <Link href="/docs/self-hosting" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-white transition-colors hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {t("Read the self-hosting guide")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <h2 className="max-w-[12ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 dark:text-white md:text-5xl">
                {t("One line of code. Every stack.")}
              </h2>
              <p className="mt-5 max-w-[38ch] text-base leading-7 text-neutral-600 dark:text-neutral-300">
                {t("Install the script directly or follow a focused guide for your framework, CMS, or commerce platform.")}
              </p>
              <Link href="/docs/script" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-neutral-900 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-white dark:hover:text-emerald-400">
                {t("View installation docs")}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="md:col-span-7 md:col-start-6">
              <IntegrationsGrid />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-100/70 py-20 dark:border-neutral-800 dark:bg-neutral-900/40 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <h2 className="max-w-[13ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 dark:text-white md:col-span-5 md:text-5xl">
              {t("Built in public. Used in production.")}
            </h2>
            <p className="max-w-[44ch] text-base leading-7 text-neutral-600 dark:text-neutral-300 md:col-span-5 md:col-start-8 md:text-lg">
              {t("From independent developers to product teams, people choose Rybbit because it gives them depth without taking over their day.")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TweetCard id="1991296442611184125" />
            <TweetCard id="2000974573005889706" />
            <TweetCard id="1980082738934993142" />
          </div>
        </div>
      </section>

      <LandingPricing />

      <section className="border-t border-neutral-200 py-20 dark:border-neutral-800 md:py-28">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-10 px-5 sm:px-6 md:grid-cols-12 lg:px-8">
          <div className="md:col-span-4">
            <h2 className="max-w-[12ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 dark:text-white md:text-5xl">
              {t("Questions, answered plainly.")}
            </h2>
            <p className="mt-5 max-w-[36ch] text-base leading-7 text-neutral-600 dark:text-neutral-300">
              {t("Everything you need to know before adding Rybbit to your site.")}
            </p>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <FAQAccordion />
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
