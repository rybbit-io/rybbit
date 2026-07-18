import { Funnels } from "@/components/Cards/Funnels";
import { RealTimeAnalytics } from "@/components/Cards/RealTimeAnalytics";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { UserSessions } from "@/components/Cards/UserSessions";
import { CTASection } from "@/components/CTASection";
import { FAQAccordion } from "@/components/FAQAccordion";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
import {
  HAIRLINE,
  LandingRail,
  Section,
  SectionHeader,
  SECTION_SUB_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/landing/primitives";
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
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";

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

// Customer logos. Per-logo classes compensate for each asset's native color.
const logos: {
  src: string;
  alt: string;
  href?: string;
  width: number;
  className: string;
}[] = [
  {
    src: "/logos/automatio.webp",
    alt: "Automatio",
    href: "https://automatio.ai",
    width: 120,
    className: "opacity-50 dark:opacity-60 grayscale invert dark:invert-0",
  },
  {
    src: "/logos/convex.svg",
    alt: "Convex",
    width: 110,
    className: "opacity-45 dark:opacity-60 grayscale invert dark:invert-0 dark:grayscale-0",
  },
  {
    src: "/logos/onyx.webp",
    alt: "Onyx",
    href: "https://onyx.app",
    width: 90,
    className: "opacity-45 dark:opacity-60 dark:invert",
  },
  {
    src: "/logos/vanguard.webp",
    alt: "Vanguard",
    width: 110,
    className: "opacity-45 dark:opacity-60 dark:invert",
  },
  {
    src: "/logos/ustwo.svg",
    alt: "ustwo",
    width: 90,
    className: "opacity-45 dark:opacity-60 dark:invert",
  },
  {
    src: "/logos/mydramalist.png",
    alt: "MyDramaList",
    width: 110,
    className: "opacity-50 dark:opacity-60 invert dark:invert-0",
  },
  {
    src: "/logos/dtelecom.svg",
    alt: "DTelecom",
    width: 110,
    className: "opacity-45 dark:opacity-60 grayscale invert dark:invert-0",
  },
  {
    src: "/logos/dpm.webp",
    alt: "DPM.lol",
    width: 110,
    className: "opacity-45 dark:opacity-60 grayscale invert dark:invert-0",
  },
];

const TWEET_COLUMNS: string[][] = [
  ["1991296442611184125", "1921928423284629758", "2000974573005889706", "1927817460993884321", "1977471983278535071"],
  ["1920899082253434950", "2000788904778326334", "2015102995789381815", "1980082738934993142", "1976495558480232672"],
  ["1982378431166963982", "2009548405488615871", "1920470706761929048", "1979830490006974510", "1970265809122705759"],
];

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  // The 16 capabilities, grouped so the list reads as an index, not a card wall.
  const featureGroups = [
    {
      title: t("Measure everything"),
      blurb: t("The full analytics toolkit, live within seconds of adding one script."),
      items: [
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
        {
          icon: GaugeIcon,
          title: t("Web vitals"),
          description: t("Monitor Core Web Vitals for fast user experiences."),
        },
        {
          icon: LayersIcon,
          title: t("Custom events"),
          description: t("Track sign-ups, purchases, and any user interaction."),
        },
        {
          icon: EarthIcon,
          title: t("Globe views"),
          description: t("Watch traffic flow with stunning 3D globe visualizations."),
        },
      ],
    },
    {
      title: t("Private by default"),
      blurb: t("No cookies, no fingerprinting, no consent banner. Compliant out of the box."),
      items: [
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
      ],
    },
    {
      title: t("Yours to run"),
      blurb: t("Open source and self-hostable, with full API access and clean data export."),
      items: [
        {
          icon: TerminalIcon,
          title: t("Open source"),
          description: t("100% open source. Self-host or use our cloud."),
        },
        {
          icon: ZapIcon,
          title: t("Setup in minutes"),
          description: t("Add one line of code and start seeing real-time data instantly."),
        },
        {
          icon: LinkIcon,
          title: t("API"),
          description: t("Full API access to build custom integrations."),
        },
        {
          icon: DownloadIcon,
          title: t("Data export"),
          description: t("Export your raw data anytime. No lock-in."),
        },
        {
          icon: BellIcon,
          title: t("Email reports"),
          description: t("Automated reports delivered to your inbox."),
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

      <div className="relative">
        <LandingRail />

        <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

        {/* Logo wall */}
        <Section className="py-12 md:py-16">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t("Trusted by 10,000+ organizations worldwide")}
          </p>
          <div className={cn("mt-6 grid grid-cols-2 border-l border-t md:grid-cols-4", HAIRLINE)}>
            {logos.map(logo => {
              const image = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={40}
                  className={cn("transition-opacity hover:opacity-90", logo.className)}
                />
              );
              return (
                <div key={logo.alt} className={cn("flex h-20 items-center justify-center border-b border-r px-6 md:h-24", HAIRLINE)}>
                  {logo.href ? (
                    <Link href={logo.href} target="_blank">
                      {image}
                    </Link>
                  ) : (
                    image
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Capability index */}
        <Section>
          <SectionHeader
            title={t("Everything you need")}
            sub={t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
          />
          <div className="mt-12 flex flex-col gap-14 md:mt-16">
            {featureGroups.map(group => (
              <div
                key={group.title}
                className={cn("grid gap-x-12 gap-y-8 border-t pt-8 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]", HAIRLINE)}
              >
                <div>
                  <h3 className="text-base font-semibold text-neutral-950 dark:text-white">{group.title}</h3>
                  <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {group.blurb}
                  </p>
                </div>
                <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map(feature => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title}>
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="shrink-0 text-neutral-500 dark:text-neutral-400" />
                          <h4 className="text-[15px] font-medium text-neutral-950 dark:text-white">{feature.title}</h4>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Product showcase */}
        <Section>
          <SectionHeader
            title={t("See it in action")}
            sub={t("Powerful tools designed for clarity, not complexity.")}
          />
          <div className="mt-10 grid grid-cols-1 gap-5 md:mt-12 md:grid-cols-2">
            <RealTimeAnalytics />
            <SessionReplay />
            <UserSessions />
            <Funnels />
          </div>
        </Section>

        {/* Integrations */}
        <Section>
          <div className="grid gap-10 md:grid-cols-[minmax(0,300px)_1fr] md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className={SECTION_TITLE_CLASS}>{t("Works with all your favorite platforms")}</h2>
              <p className={SECTION_SUB_CLASS}>{t("Integrate Rybbit with any platform in minutes")}</p>
              <Link
                href="/docs"
                className="mt-5 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {t("All integration guides")} <span aria-hidden>→</span>
              </Link>
            </div>
            <IntegrationsGrid />
          </div>
        </Section>

        {/* Testimonials */}
        <Section>
          <SectionHeader
            title={t("People love Rybbit")}
            sub={t("See what others think about Rybbit Analytics")}
          />
          <div className="relative mt-10 h-[540px] overflow-hidden md:mt-12 md:h-[620px]">
            <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
              {TWEET_COLUMNS.map((column, i) => (
                <Marquee
                  key={i}
                  vertical
                  pauseOnHover
                  reverse={i === 1}
                  repeat={2}
                  className={cn(
                    "[--duration:60s] motion-reduce:[&>div]:[animation-play-state:paused]",
                    i > 0 && "hidden md:flex"
                  )}
                >
                  {column.map(id => (
                    <TweetCard key={id} id={id} />
                  ))}
                </Marquee>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent dark:from-neutral-950" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-neutral-950" />
          </div>
        </Section>

        {/* FAQ */}
        <Section>
          <div className="grid gap-10 md:grid-cols-[minmax(0,300px)_1fr] md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className={SECTION_TITLE_CLASS}>{t("Frequently Asked Questions")}</h2>
              <p className={SECTION_SUB_CLASS}>{t("Everything you need to know about Rybbit Analytics")}</p>
            </div>
            <FAQAccordion />
          </div>
        </Section>

        {/* Pricing */}
        <LandingPricing />

        <CTASection />
      </div>
    </>
  );
}
