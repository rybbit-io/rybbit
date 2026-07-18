import { CTASection } from "@/components/CTASection";
import { FAQAccordion } from "@/components/FAQAccordion";
import { AgentConsole } from "@/components/Cards/AgentConsole";
import { Funnels } from "@/components/Cards/Funnels";
import { RealTimeAnalytics } from "@/components/Cards/RealTimeAnalytics";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { UserSessions } from "@/components/Cards/UserSessions";
import { GridCrosses } from "@/components/GridCrosses";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import { Marquee } from "@/components/magicui/marquee";
import { TweetCard } from "@/components/Tweet";
import { ActivityIcon } from "@/components/ui/activity";
import { ArrowDownIcon } from "@/components/ui/arrow-down";
import { BanIcon } from "@/components/ui/ban";
import { BellIcon } from "@/components/ui/bell";
import { BotIcon } from "@/components/ui/bot";
import { DownloadIcon } from "@/components/ui/download";
import { EarthIcon } from "@/components/ui/earth";
import { GaugeIcon } from "@/components/ui/gauge";
import { LayersIcon } from "@/components/ui/layers";
import { LinkIcon } from "@/components/ui/link";
import { PlayIcon } from "@/components/ui/play";
import { RouteIcon } from "@/components/ui/route";
import { ShieldCheckIcon } from "@/components/ui/shield-check";
import { TerminalIcon } from "@/components/ui/terminal";
import { UsersIcon } from "@/components/ui/users";
import { ZapIcon } from "@/components/ui/zap";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const mcpClients = [
  { name: "Claude Code", path: "/docs/mcp/claude-code" },
  { name: "Claude Desktop", path: "/docs/mcp/claude-desktop" },
  { name: "Codex", path: "/docs/mcp/codex" },
  { name: "Cursor", path: "/docs/mcp/cursor" },
  { name: "VS Code", path: "/docs/mcp/vscode" },
  { name: "opencode", path: "/docs/mcp/opencode" },
];

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
        text: "Yes, Rybbit is 100% open source. Every single line of code, including for our cloud/enterprise offerings, is available on GitHub under the AGPL 3.0 license.",
      },
    },
  ],
};

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

// Every SVG in /public/logos is pure white: invert to black in light mode, render as-is in dark.
const whiteSvgLogo = "opacity-40 hover:opacity-70 invert dark:opacity-60 dark:hover:opacity-100 dark:invert-0";

const customerLogos = [
  { src: "/logos/bosch.svg", alt: "bosch", width: 120, className: whiteSvgLogo },
  { src: "/logos/govuk-logo.svg", alt: "GOV.UK", width: 120, className: whiteSvgLogo },
  { src: "/logos/royalcaribbean.svg", alt: "Royal Caribbean", width: 120, className: whiteSvgLogo },
  // { src: "/logos/convex.svg", alt: "Convex", width: 120, className: whiteSvgLogo },
  { src: "/logos/op.svg", alt: "OP.GG", width: 120, className: whiteSvgLogo },
  { src: "/logos/softr.svg", alt: "Softr", width: 100, className: whiteSvgLogo },
  {
    src: "/logos/onyx.webp",
    alt: "Onyx",
    width: 100,
    href: "https://onyx.app",
    className: "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 dark:invert",
  },
  { src: "/logos/ustwo.svg", alt: "ustwo", width: 100, className: whiteSvgLogo },
  // { src: "/logos/dtelecom.svg", alt: "DTelecom", width: 120, className: whiteSvgLogo },
  {
    src: "/logos/automatio.webp",
    alt: "Automatio",
    width: 140,
    href: "https://automatio.ai",
    className: "opacity-50 hover:opacity-80 grayscale invert dark:opacity-70 dark:hover:opacity-100 dark:invert-0",
  },
];

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  const featureGroups = [
    {
      title: t("Understand"),
      description: t("A clear read on what is happening, without configuring a report first."),
      iconClassName: "text-emerald-600 dark:text-emerald-400",
      features: [
        {
          icon: ZapIcon,
          title: t("Setup in minutes"),
          description: t("Add one line of code and start seeing real-time data instantly."),
        },
        {
          icon: ActivityIcon,
          title: t("Realtime data"),
          description: t("See what's happening on your site right now."),
        },
        {
          icon: GaugeIcon,
          title: t("Web vitals"),
          description: t("Monitor Core Web Vitals for fast user experiences."),
        },
        { icon: BellIcon, title: t("Email reports"), description: t("Automated reports delivered to your inbox.") },
      ],
    },
    {
      title: t("Investigate"),
      description: t("Move from the headline number to the behavior behind it."),
      iconClassName: "text-blue-600 dark:text-blue-400",
      features: [
        {
          icon: PlayIcon,
          title: t("Session replay"),
          description: t("Watch real user sessions to spot usability issues."),
        },
        {
          icon: RouteIcon,
          title: t("User journeys"),
          description: t("Map how users navigate from landing to conversion."),
        },
        {
          icon: EarthIcon,
          title: t("Globe views"),
          description: t("Watch traffic flow with detailed 3D globe visualizations."),
        },
        { icon: UsersIcon, title: t("Organizations"), description: t("Manage sites and team access in one place.") },
      ],
    },
    {
      title: t("Measure"),
      description: t("Define the outcomes that matter and follow them end to end."),
      iconClassName: "text-amber-700 dark:text-amber-400",
      features: [
        {
          icon: ArrowDownIcon,
          title: t("Funnels"),
          description: t("Visualize conversion paths and find where visitors drop off."),
        },
        {
          icon: LayersIcon,
          title: t("Custom events"),
          description: t("Track sign-ups, purchases, and any user interaction."),
        },
        { icon: LinkIcon, title: t("API"), description: t("Full API access to build custom integrations.") },
        { icon: DownloadIcon, title: t("Data export"), description: t("Export your raw data anytime. No lock-in.") },
      ],
    },
    {
      title: t("Stay private"),
      description: t("Clean data and a lighter privacy footprint, by default."),
      iconClassName: "text-violet-600 dark:text-violet-400",
      features: [
        {
          icon: BotIcon,
          title: t("Bot blocking"),
          description: t("Automatically filter out bots to keep data clean."),
        },
        {
          icon: BanIcon,
          title: t("No cookies"),
          description: t("Zero cookies, zero banners. Cleaner visitor experiences."),
        },
        {
          icon: ShieldCheckIcon,
          title: t("GDPR & CCPA"),
          description: t("Privacy-first design means you're compliant out of the box."),
        },
        {
          icon: TerminalIcon,
          title: t("Open source"),
          description: t("100% open source. Self-host or use our cloud."),
        },
      ],
    },
  ];

  const tweetColumns = [
    ["1991296442611184125", "1921928423284629758", "2000974573005889706", "1927817460993884321", "1977471983278535071"],
    ["1920899082253434950", "2000788904778326334", "2015102995789381815", "1980082738934993142", "1976495558480232672"],
    ["1982378431166963982", "2009548405488615871", "1920470706761929048", "1979830490006974510", "1970265809122705759"],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="overflow-clip">
        <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="customer-proof">
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-2 gap-px border-x border-neutral-200 bg-neutral-200 p-px dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-4 lg:grid-cols-8">
            <GridCrosses />
            <div className="col-span-full flex min-h-14 items-center bg-white px-5 dark:bg-neutral-950 sm:px-8">
              <p id="customer-proof" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {t("Trusted by 10,000+ organizations worldwide")}
              </p>
            </div>
            {customerLogos.map(logo => {
              const image = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={40}
                  className={`max-h-7 w-auto max-w-[112px] transition-opacity duration-200 ${logo.className}`}
                />
              );

              return (
                <div key={logo.alt} className="flex min-h-24 items-center justify-center bg-white dark:bg-neutral-950">
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
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="capabilities-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="capabilities-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-5xl"
                >
                  {t("The whole picture, in one place.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t(
                    "Rybbit connects the essential analytics workflows into one coherent product, so every answer starts from the same source of truth."
                  )}
                </p>
              </div>
            </div>

            <div className="grid lg:col-span-8 md:grid-cols-2">
              {featureGroups.map(group => (
                <article
                  key={group.title}
                  className="border-b border-neutral-200 px-5 py-12 last:border-b-0 dark:border-neutral-800 sm:px-8 md:odd:border-r md:[&:nth-last-child(-n+2)]:border-b-0 lg:px-10"
                >
                  <h3 className="text-xl font-semibold tracking-tight">{group.title}</h3>
                  <p className="mt-2 min-h-12 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {group.description}
                  </p>
                  <div className="mt-8 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {group.features.map(feature => {
                      const Icon = feature.icon;
                      return (
                        <div key={feature.title} className="grid grid-cols-[24px_1fr] gap-x-3 py-4">
                          <Icon size={18} className={`mt-0.5 ${group.iconClassName}`} />
                          <div>
                            <h4 className="text-sm font-medium">{feature.title}</h4>
                            <p className="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="product-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid border-b border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 md:py-20 lg:col-span-7 lg:border-b-0 lg:border-r lg:px-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
                />
                <div className="relative">
                  <SectionKicker>{t("One connected workspace")}</SectionKicker>
                  <h2
                    id="product-title"
                    className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
                  >
                    {t("Go from signal to explanation without changing tools.")}
                  </h2>
                </div>
              </div>
              <div className="flex items-end px-5 py-10 sm:px-8 md:py-20 lg:col-span-5 lg:px-10">
                <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-400 text-pretty">
                  {t(
                    "Start with live traffic, inspect the people and paths behind it, then measure where they convert."
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-neutral-200 p-px dark:bg-neutral-800 lg:grid-cols-12">
              <div className="bg-white dark:bg-neutral-950 lg:col-span-7 [&>div]:h-full">
                <RealTimeAnalytics />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-5 [&>div]:h-full">
                <SessionReplay />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-5 [&>div]:h-full">
                <UserSessions />
              </div>
              <div className="bg-white dark:bg-neutral-950 lg:col-span-7 [&>div]:h-full">
                <Funnels />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="agents-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="agents-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  {t("Analytics your AI can operate.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t(
                    "A hosted MCP server on top of Rybbit's full REST API. Your agent reads live traffic, debugs errors, and manages goals — with the same permissions as a teammate."
                  )}
                </p>
                <div className="mt-10 max-w-sm">
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("Works with")}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {mcpClients.map(client => (
                      <li key={client.name}>
                        <Link
                          href={client.path}
                          className="inline-flex rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                        >
                          {client.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href="/docs/mcp"
                    className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-neutral-950"
                  >
                    {t("Set up MCP")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/docs/api/getting-started"
                    className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-neutral-400 dark:hover:text-white dark:focus-visible:ring-offset-neutral-950"
                  >
                    {t("API reference")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-8">
              <div className="relative flex h-full items-center bg-neutral-100 p-5 [background-image:radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:14px_14px] dark:bg-neutral-900 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] sm:p-8 lg:p-12">
                <div className="w-full min-w-0">
                  <AgentConsole />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="integrations-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="integrations-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  {t("Made to meet your stack.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t("Install Rybbit on the platform you already use. Most integrations take only a few minutes.")}
                </p>
                <TrackingSnippet className="mt-10 max-w-sm" />
              </div>
            </div>
            <div className="lg:col-span-8">
              <IntegrationsGrid />
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="testimonials-title">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            <GridCrosses />
            <div className="grid border-b border-neutral-200 dark:border-neutral-800 md:grid-cols-3">
              <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 md:col-span-2 md:border-b-0 md:border-r md:py-20 lg:px-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
                />
                <div className="relative">
                  <SectionKicker>{t("From the community")}</SectionKicker>
                  <h2
                    id="testimonials-title"
                    className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
                  >
                    {t("Built in public. Used in the real world.")}
                  </h2>
                </div>
              </div>
              <div className="flex flex-col justify-between px-5 py-10 sm:px-8 md:py-20 lg:px-10">
                <p className="max-w-md text-base leading-7 text-neutral-600 dark:text-neutral-400 text-pretty">
                  {t("What teams say after replacing heavier analytics products with Rybbit.")}
                </p>
                <div className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 md:text-xs">
                  <span>{t("Customer notes")}</span>
                  <span className="hidden md:inline">{t("Pause on hover")}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-neutral-200 dark:border-neutral-800">
              <div className="relative grid h-[560px] grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-3">
                {tweetColumns.map((ids, columnIndex) => (
                  <Marquee
                    key={ids[0]}
                    vertical
                    pauseOnHover
                    reverse={columnIndex === 1}
                    className={`${columnIndex > 0 ? "hidden md:flex" : ""} [--duration:60s] motion-reduce:[animation-play-state:paused]`}
                    repeat={2}
                  >
                    {ids.map(id => (
                      <TweetCard key={id} id={id} />
                    ))}
                  </Marquee>
                ))}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent dark:from-neutral-950" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-neutral-950" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="faq-title">
          <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10">
              <div className="lg:sticky lg:top-24">
                <h2
                  id="faq-title"
                  className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  {t("Questions, answered plainly.")}
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  {t("Everything you need to know before adding Rybbit to your site.")}
                </p>
              </div>
            </div>
            <div className="px-5 py-8 sm:px-8 md:py-12 lg:col-span-8 lg:px-10">
              <FAQAccordion />
            </div>
          </div>
        </section>

        <LandingPricing />
        <CTASection />
      </div>
    </>
  );
}
