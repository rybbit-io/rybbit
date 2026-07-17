import { CTASection } from "@/components/CTASection";
import { FAQAccordion } from "@/components/FAQAccordion";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
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
import { tiltWarp } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Funnels } from "@/components/Cards/Funnels";
import { RealTimeAnalytics } from "@/components/Cards/RealTimeAnalytics";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { UserSessions } from "@/components/Cards/UserSessions";
import { LandingPricing } from "@/components/LandingPricing";

// FAQ Structured Data
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

/* ── Landing page layout system ──────────────────────────────────────────
   One rail (1200px), one border color, one surface recipe, one section
   cadence: hairline rule → display heading left / lede right → content.
   Every section uses these; nothing invents its own chrome. */

const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
const RULE = "border-t border-neutral-200 dark:border-neutral-800";

function SectionHeader({ title, lede }: { title: React.ReactNode; lede?: React.ReactNode }) {
  return (
    <div className={cn(RULE, "pt-6 md:pt-8 mb-10 md:mb-14")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-12">
        <h2
          className={cn(
            tiltWarp.className,
            "text-3xl leading-tight md:text-4xl text-neutral-900 dark:text-white text-balance"
          )}
        >
          {title}
        </h2>
        {lede && (
          <p className="max-w-md text-base leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-right md:text-pretty">
            {lede}
          </p>
        )}
      </div>
    </div>
  );
}

const logos: { src: string; alt: string; href?: string; className?: string }[] = [
  { src: "/logos/automatio.webp", alt: "Automatio", href: "https://automatio.ai", className: "invert dark:invert-0" },
  { src: "/logos/convex.svg", alt: "Convex", className: "invert dark:invert-0" },
  { src: "/logos/onyx.webp", alt: "Onyx", href: "https://onyx.app", className: "dark:invert" },
  { src: "/logos/vanguard.webp", alt: "Vanguard", className: "dark:invert" },
  { src: "/logos/ustwo.svg", alt: "ustwo", className: "dark:invert" },
  { src: "/logos/mydramalist.png", alt: "MyDramaList", className: "invert dark:invert-0" },
  { src: "/logos/dtelecom.svg", alt: "DTelecom", className: "invert dark:invert-0" },
  { src: "/logos/dpm.webp", alt: "DPM.lol", className: "invert dark:invert-0" },
];

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  const featureGroups = [
    {
      label: t("Analytics"),
      features: [
        {
          icon: ActivityIcon,
          title: t("Realtime data"),
          description: t("See what's happening on your site right now."),
        },
        {
          icon: PlayIcon,
          title: t("Session replay"),
          description: t("Watch real user sessions to spot usability issues."),
        },
        {
          icon: ArrowDownIcon,
          title: t("Funnels"),
          description: t("Visualize conversion paths and find where visitors drop off."),
        },
        {
          icon: RouteIcon,
          title: t("User journeys"),
          description: t("Map how users navigate from landing to conversion."),
        },
      ],
    },
    {
      label: t("Measurement"),
      features: [
        {
          icon: LayersIcon,
          title: t("Custom events"),
          description: t("Track sign-ups, purchases, and any user interaction."),
        },
        {
          icon: GaugeIcon,
          title: t("Web vitals"),
          description: t("Monitor Core Web Vitals for fast user experiences."),
        },
        {
          icon: EarthIcon,
          title: t("Globe views"),
          description: t("Watch traffic flow with stunning 3D globe visualizations."),
        },
        {
          icon: BellIcon,
          title: t("Email reports"),
          description: t("Automated reports delivered to your inbox."),
        },
      ],
    },
    {
      label: t("Privacy"),
      features: [
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
          icon: BotIcon,
          title: t("Bot blocking"),
          description: t("Automatically filter out bots to keep data clean."),
        },
        {
          icon: DownloadIcon,
          title: t("Data export"),
          description: t("Export your raw data anytime. No lock-in."),
        },
      ],
    },
    {
      label: t("Platform"),
      features: [
        {
          icon: ZapIcon,
          title: t("Setup in minutes"),
          description: t("Add one line of code and start seeing real-time data instantly."),
        },
        {
          icon: TerminalIcon,
          title: t("Open source"),
          description: t("100% open source. Self-host or use our cloud."),
        },
        {
          icon: LinkIcon,
          title: t("API"),
          description: t("Full API access to build custom integrations."),
        },
        {
          icon: UsersIcon,
          title: t("Organizations"),
          description: t("Manage sites and team access in one place."),
        },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

      {/* Logos — quiet connective band between the demo and the sections */}
      <section className="py-14 md:py-20">
        <div className={CONTAINER}>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-8 md:mb-10">
            {t("Trusted by 10,000+ organizations worldwide")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-7 md:gap-x-14">
            {logos.map(logo => {
              const img = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={120}
                  height={40}
                  className={cn(
                    "h-6 md:h-7 w-auto object-contain grayscale opacity-45 hover:opacity-80 dark:opacity-55 dark:hover:opacity-90 transition-opacity",
                    logo.className
                  )}
                />
              );
              return logo.href ? (
                <Link key={logo.alt} href={logo.href} target="_blank">
                  {img}
                </Link>
              ) : (
                <div key={logo.alt}>{img}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Capability index */}
      <section className="py-10 md:py-14">
        <div className={CONTAINER}>
          <SectionHeader
            title={t("Everything you need")}
            lede={t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {featureGroups.map(group => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 pb-3 mb-5 border-b border-neutral-200 dark:border-neutral-800">
                  {group.label}
                </h3>
                <div className="space-y-6">
                  {group.features.map(feature => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title} className="flex gap-3">
                        <Icon size={17} className="mt-0.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                        <div>
                          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {feature.title}
                          </h4>
                          <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section className="py-10 md:py-14">
        <div className={CONTAINER}>
          <SectionHeader
            title={t("See it in action")}
            lede={t("Powerful tools designed for clarity, not complexity.")}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <RealTimeAnalytics />
            <SessionReplay />
            <UserSessions />
            <Funnels />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-10 md:py-14">
        <div className={CONTAINER}>
          <div className={cn(RULE, "pt-6 md:pt-8")}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
              <div className="md:sticky md:top-24 md:self-start">
                <h2
                  className={cn(
                    tiltWarp.className,
                    "text-3xl leading-tight md:text-4xl text-neutral-900 dark:text-white text-balance"
                  )}
                >
                  {t("Works with all your favorite platforms")}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {t("Integrate Rybbit with any platform in minutes")}
                </p>
                <Link
                  href="/docs"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
                >
                  {t("Browse the setup guides")} <span aria-hidden>→</span>
                </Link>
              </div>
              <IntegrationsGrid />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-10 md:py-14">
        <div className={CONTAINER}>
          <SectionHeader
            title={t("People love Rybbit")}
            lede={t("See what others think about Rybbit Analytics")}
          />
        </div>
        <div className="relative overflow-hidden">
          <div className={cn(CONTAINER, "grid grid-cols-1 md:grid-cols-3 gap-4 h-[560px] md:h-[640px]")}>
            <Marquee vertical pauseOnHover className="[--duration:60s]" repeat={2}>
              <TweetCard id="1991296442611184125" />
              <TweetCard id="1921928423284629758" />
              <TweetCard id="2000974573005889706" />
              <TweetCard id="1927817460993884321" />
              <TweetCard id="1977471983278535071" />
            </Marquee>

            <Marquee vertical pauseOnHover reverse className="hidden md:flex [--duration:60s]" repeat={2}>
              <TweetCard id="1920899082253434950" />
              <TweetCard id="2000788904778326334" />
              <TweetCard id="2015102995789381815" />
              <TweetCard id="1980082738934993142" />
              <TweetCard id="1976495558480232672" />
            </Marquee>

            <Marquee vertical pauseOnHover className="hidden md:flex [--duration:60s]" repeat={2}>
              <TweetCard id="1982378431166963982" />
              <TweetCard id="2009548405488615871" />
              <TweetCard id="1920470706761929048" />
              <TweetCard id="1979830490006974510" />
              <TweetCard id="1970265809122705759" />
            </Marquee>
          </div>

          {/* Fade the columns into the canvas */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white dark:from-neutral-950 to-transparent"></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent"></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-14">
        <div className={CONTAINER}>
          <div className={cn(RULE, "pt-6 md:pt-8")}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
              <div className="md:sticky md:top-24 md:self-start">
                <h2
                  className={cn(
                    tiltWarp.className,
                    "text-3xl leading-tight md:text-4xl text-neutral-900 dark:text-white text-balance"
                  )}
                >
                  {t("Frequently Asked Questions")}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {t("Everything you need to know about Rybbit Analytics")}
                </p>
              </div>
              <FAQAccordion />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <LandingPricing />

      <CTASection />
    </>
  );
}
