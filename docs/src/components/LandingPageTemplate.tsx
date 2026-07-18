import { CTASection } from "@/components/CTASection";
import { FAQAccordion } from "@/components/FAQAccordion";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { TweetCard } from "@/components/Tweet";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Braces,
  ChartNoAxesCombined,
  Download,
  Earth,
  Gauge,
  KeyRound,
  LockKeyhole,
  Play,
  Route,
  ShieldCheck,
  Terminal,
  Users,
  type LucideIcon,
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
        text: "Rybbit is much less bloated than Google Analytics, both in terms of our tracking script and the UX of the dashboard. We show you exactly what you need to see. The difference in usability is night and day.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely! Rybbit is available as a self-hosted option. You can install it on your own server and have complete control over your data. We also offer a cloud version if you prefer a managed solution.",
      },
    },
    {
      "@type": "Question",
      name: "How easy is it to set up Rybbit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Setting up Rybbit is incredibly simple. Just add a small script to your website or install @rybbit/js from npm, and you're good to go. Most users are up and running in less than 5 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Rybbit support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rybbit works with virtually any website platform. Whether you're using WordPress, Shopify, Next.js, React, Vue, or any other framework, our simple tracking snippet integrates seamlessly.",
      },
    },
    {
      "@type": "Question",
      name: "Is Rybbit truly open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Rybbit is 100% open source. Every single line of code, including for our cloud and enterprise offerings, is available on GitHub under the AGPL 3.0 license.",
      },
    },
  ],
};

const customerLogos = [
  { src: "/logos/automatio.webp", alt: "automatio", width: 128, href: "https://automatio.ai", className: "grayscale invert dark:invert-0" },
  { src: "/logos/convex.svg", alt: "Convex", width: 116, className: "grayscale invert dark:invert-0 dark:grayscale-0" },
  { src: "/logos/onyx.webp", alt: "Onyx", width: 92, href: "https://onyx.app" },
  { src: "/logos/vanguard.webp", alt: "Vanguard", width: 116 },
  { src: "/logos/ustwo.svg", alt: "ustwo", width: 94 },
  { src: "/logos/mydramalist.png", alt: "MyDramaList", width: 118, className: "invert dark:invert-0" },
  { src: "/logos/dtelecom.svg", alt: "DTelecom", width: 118, className: "grayscale invert dark:invert-0" },
  { src: "/logos/dpm.webp", alt: "DPM.lol", width: 110, className: "grayscale invert dark:invert-0" },
];

interface FeatureGroupProps {
  title: string;
  description: string;
  features: { icon: LucideIcon; label: string }[];
}

function FeatureGroup({ title, description, features }: FeatureGroupProps) {
  return (
    <div className="px-5 py-8 sm:px-6 lg:min-h-[310px] lg:px-7 lg:py-10">
      <h3 className="text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-[32ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>
      <ul className="mt-7 space-y-3.5">
        {features.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
            <Icon className="size-4 text-neutral-500 dark:text-neutral-500" strokeWidth={1.75} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  const featureGroups: FeatureGroupProps[] = [
    {
      title: t("Measure"),
      description: t("A clear, live account of what is happening across your site."),
      features: [
        { icon: Activity, label: t("Realtime data") },
        { icon: Braces, label: t("Custom events") },
        { icon: Gauge, label: t("Web vitals") },
        { icon: Bell, label: t("Email reports") },
      ],
    },
    {
      title: t("Understand"),
      description: t("Move from a pageview to the complete journey behind it."),
      features: [
        { icon: Users, label: t("User sessions") },
        { icon: Route, label: t("User journeys") },
        { icon: ChartNoAxesCombined, label: t("Retention") },
        { icon: KeyRound, label: t("User profiles") },
      ],
    },
    {
      title: t("Improve"),
      description: t("Find friction, validate changes, and protect every conversion."),
      features: [
        { icon: Play, label: t("Session replay") },
        { icon: BarChart3, label: t("Funnels") },
        { icon: Earth, label: t("Globe views") },
        { icon: Bot, label: t("Bot blocking") },
      ],
    },
    {
      title: t("Control"),
      description: t("Keep ownership of the implementation and every row of data."),
      features: [
        { icon: ShieldCheck, label: t("No cookies") },
        { icon: Terminal, label: t("Open source") },
        { icon: Braces, label: t("API") },
        { icon: Download, label: t("Data export") },
      ],
    },
  ];

  return (
    <div className="overflow-clip bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label={t("Customer logos")}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 border-x border-neutral-200 sm:grid-cols-12 dark:border-neutral-800">
          <div className="flex items-center border-b border-neutral-200 px-5 py-7 sm:col-span-4 sm:border-b-0 sm:px-8 lg:col-span-3 lg:px-10 dark:border-neutral-800">
            <p className="max-w-[20ch] text-sm font-medium leading-6 text-neutral-600 dark:text-neutral-400">
              {t("Trusted by more than 10,000 organizations worldwide.")}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:col-span-8 sm:grid-cols-4 sm:border-l lg:col-span-9 dark:border-neutral-800">
            {customerLogos.map(logo => {
              const image = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={32}
                  className={`max-h-7 w-auto max-w-[118px] object-contain opacity-55 transition-opacity duration-200 hover:opacity-90 dark:opacity-65 dark:hover:opacity-100 ${logo.className ?? ""}`}
                />
              );

              return (
                <div
                  key={logo.alt}
                  className="flex min-h-24 items-center justify-center border-b border-r border-neutral-200 px-4 dark:border-neutral-800"
                >
                  {logo.href ? (
                    <Link href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt}>
                      {image}
                    </Link>
                  ) : (
                    image
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="product" className="scroll-mt-16 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 md:py-28 lg:px-10 lg:py-36">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
            <h2 className="max-w-[720px] text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-5xl lg:col-span-8 lg:text-6xl">
              {t("See the whole picture. Follow every detail.")}
            </h2>
            <p className="max-w-[60ch] text-pretty text-base leading-7 text-neutral-600 lg:col-span-4 dark:text-neutral-400">
              {t("Start with the traffic overview, then move naturally into the sessions, journeys, funnels, and errors behind every change.")}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 overflow-hidden rounded-lg border border-neutral-200 lg:mt-20 lg:grid-cols-12 dark:border-neutral-800">
            <article className="border-b border-neutral-200 lg:col-span-7 lg:border-b-0 lg:border-r dark:border-neutral-800">
              <div className="px-5 py-6 sm:px-7 sm:py-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{t("Watch the experience, not just the count")}</h3>
                    <p className="mt-2 max-w-[55ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                      {t("Session replay puts every interaction beside the visitor's timeline, so the reason behind a drop-off is easy to find.")}
                    </p>
                  </div>
                  <Play className="mt-1 hidden size-5 shrink-0 text-emerald-600 sm:block dark:text-emerald-400" aria-hidden="true" />
                </div>
              </div>
              <div className="border-t border-neutral-200 bg-neutral-950 p-3 sm:p-5 dark:border-neutral-800">
                <div className="relative aspect-[1.72/1] overflow-hidden rounded-md border border-neutral-800 bg-[#141414]">
                  <Image
                    src="/blog/replay_sessions.png"
                    alt={t("Rybbit session replay with a visitor timeline and captured interactions")}
                    fill
                    sizes="(max-width: 1024px) 100vw, 700px"
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </article>

            <article className="flex flex-col lg:col-span-5">
              <div className="px-5 py-6 sm:px-7 sm:py-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{t("Find the exact point of friction")}</h3>
                    <p className="mt-2 max-w-[48ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                      {t("Build a funnel from any page or event and see where the path breaks, without a separate analytics project.")}
                    </p>
                  </div>
                  <BarChart3 className="mt-1 hidden size-5 shrink-0 text-emerald-600 sm:block dark:text-emerald-400" aria-hidden="true" />
                </div>
              </div>
              <div className="flex flex-1 items-center border-t border-neutral-200 bg-neutral-950 p-3 sm:p-5 dark:border-neutral-800">
                <div className="relative aspect-[1.45/1] w-full overflow-hidden rounded-md border border-neutral-800 bg-[#141414]">
                  <Image
                    src="/blog/rybbit_funnels_dashboard.png"
                    alt={t("Rybbit funnel report showing conversion and drop-off across four steps")}
                    fill
                    sizes="(max-width: 1024px) 100vw, 500px"
                    className="object-cover object-left-top"
                  />
                </div>
              </div>
            </article>
          </div>

          <div className="mt-8 grid grid-cols-1 overflow-hidden rounded-lg border border-neutral-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-neutral-800">
            {featureGroups.map((group, index) => (
              <div
                key={group.title}
                className={[
                  "border-b border-neutral-200 sm:border-r lg:border-b-0 dark:border-neutral-800",
                  "border-b border-neutral-200 lg:border-b-0 lg:border-r dark:border-neutral-800",
                  "border-b border-neutral-200 sm:border-b-0 sm:border-r dark:border-neutral-800",
                  "",
                ][index]}
              >
                <FeatureGroup {...group} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="scroll-mt-16 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 border-x border-neutral-800 lg:grid-cols-12">
          <div className="px-5 py-20 sm:px-8 md:py-28 lg:col-span-5 lg:px-10 lg:py-32">
            <Image src="/rybbit/frog_light green.svg" alt="" width={48} height={48} className="mb-10 size-11" aria-hidden="true" />
            <h2 className="max-w-[520px] text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              {t("Private by default. Open by design.")}
            </h2>
            <p className="mt-6 max-w-[55ch] text-pretty text-base leading-7 text-neutral-300">
              {t("Rybbit gives you useful analytics without following people around the internet. Use our EU cloud or run the complete stack yourself.")}
            </p>
            <Link
              href="/docs/self-hosting"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              {t("Read the self-hosting guide")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="border-t border-neutral-800 lg:col-span-7 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {[
                [ShieldCheck, t("Cookieless analytics"), t("No fingerprinting and no consent banner required.")],
                [LockKeyhole, t("Daily-salted identifiers"), t("Visitor identifiers cannot become permanent profiles.")],
                [Earth, t("EU cloud hosting"), t("Managed infrastructure hosted in Germany.")],
                [Terminal, t("Fully open source"), t("Inspect, extend, export, or self-host every part.")],
              ].map(([Icon, label, description], index) => {
                const FeatureIcon = Icon as LucideIcon;
                return (
                  <div
                    key={label as string}
                    className={`min-h-48 border-neutral-800 px-5 py-7 sm:px-7 ${index < 2 ? "border-b" : ""} ${index % 2 === 1 ? "sm:border-l" : ""}`}
                  >
                    <FeatureIcon className="size-5 text-emerald-400" strokeWidth={1.75} aria-hidden="true" />
                    <h3 className="mt-8 text-base font-semibold">{label as string}</h3>
                    <p className="mt-2 max-w-[30ch] text-sm leading-6 text-neutral-400">{description as string}</p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-neutral-800 p-5 sm:p-7">
              <div className="overflow-hidden rounded-md border border-neutral-800 bg-[#101010]">
                <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 text-xs text-neutral-500">
                  <span>{t("Install Rybbit")}</span>
                  <span>HTML</span>
                </div>
                <pre className="overflow-x-auto p-4 text-xs leading-6 text-neutral-300 sm:p-5"><code>{`<script
  src="https://app.rybbit.io/api/script.js"
  data-site-id="YOUR_SITE_ID"
  defer
></script>`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 md:py-28 lg:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="max-w-[430px] text-balance text-4xl font-semibold leading-[1.07] tracking-[-0.03em] sm:text-5xl">
                {t("Add one line. Keep your stack.")}
              </h2>
              <p className="mt-5 max-w-[48ch] text-pretty text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {t("Use Rybbit with the framework, CMS, or storefront you already run. Every guide is short and specific.")}
              </p>
              <Link href="/docs" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300">
                {t("Browse installation guides")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="lg:col-span-8">
              <IntegrationsGrid />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 border-x border-neutral-200 lg:grid-cols-12 dark:border-neutral-800">
          <div className="px-5 py-16 sm:px-8 md:py-20 lg:col-span-4 lg:px-10">
            <h2 className="max-w-[420px] text-balance text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
              {t("Built in public. Used in the real world.")}
            </h2>
            <p className="mt-4 max-w-[44ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {t("Teams choose Rybbit because the product stays understandable as their questions get more advanced.")}
            </p>
          </div>
          <div className="grid grid-cols-1 border-t border-neutral-200 sm:grid-cols-2 lg:col-span-8 lg:border-l lg:border-t-0 dark:border-neutral-800">
            <div className="p-5 sm:p-7 lg:p-8">
              <TweetCard id="1991296442611184125" className="max-w-none rounded-none border-0 bg-transparent p-0 backdrop-blur-none" />
            </div>
            <div className="border-t border-neutral-200 p-5 sm:border-l sm:border-t-0 sm:p-7 lg:p-8 dark:border-neutral-800">
              <TweetCard id="2000788904778326334" className="max-w-none rounded-none border-0 bg-transparent p-0 backdrop-blur-none" />
            </div>
          </div>
        </div>
      </section>

      <LandingPricing />

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-4">
            <h2 className="max-w-[430px] text-balance text-4xl font-semibold leading-[1.07] tracking-[-0.03em]">
              {t("Questions, answered plainly.")}
            </h2>
            <p className="mt-5 max-w-[40ch] text-base leading-7 text-neutral-600 dark:text-neutral-400">
              {t("The details people usually want before they make the switch.")}
            </p>
          </div>
          <div className="mt-10 border-t border-neutral-200 lg:col-span-8 lg:mt-0 dark:border-neutral-800">
            <FAQAccordion />
          </div>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
