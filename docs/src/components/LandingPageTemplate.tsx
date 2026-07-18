import { BackgroundGrid } from "@/components/BackgroundGrid";
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

/**
 * Crosshair tick marking a rule/rail intersection of the page frame.
 * Part of the drafting-table motif: analytics is measurement, so the page
 * sits on a measured surface. Hidden below md, where the rails are too.
 */
function Cross({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 11 11"
      className={cn(
        "pointer-events-none absolute z-10 hidden size-[11px] text-neutral-300 md:block dark:text-neutral-700",
        className
      )}
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** A framed page section: top rule, crosshair ticks, one shared gutter + rhythm. */
function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative border-t border-border px-5 py-16 sm:px-8 md:px-12 md:py-24", className)}>
      <Cross className="-left-[6px] -top-[6px]" />
      <Cross className="-right-[6px] -top-[6px]" />
      {children}
    </section>
  );
}

/** The single section-header treatment used across the page. */
function SectionHeader({
  title,
  lead,
  className,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl dark:text-white">
        {title}
      </h2>
      {lead && <p className="mt-3 text-base text-neutral-600 md:text-lg dark:text-neutral-400">{lead}</p>}
    </div>
  );
}

const logos: { src: string; alt: string; href?: string; className?: string }[] = [
  {
    src: "/logos/automatio.webp",
    alt: "Automatio",
    href: "https://automatio.ai",
    className: "grayscale invert dark:invert-0",
  },
  { src: "/logos/convex.svg", alt: "Convex", className: "grayscale invert dark:invert-0 dark:grayscale-0" },
  { src: "/logos/onyx.webp", alt: "Onyx", href: "https://onyx.app", className: "dark:invert" },
  { src: "/logos/vanguard.webp", alt: "Vanguard", className: "dark:invert" },
  { src: "/logos/ustwo.svg", alt: "ustwo", className: "dark:invert" },
  { src: "/logos/mydramalist.png", alt: "MyDramaList", className: "invert dark:invert-0" },
  { src: "/logos/dtelecom.svg", alt: "DTelecom", className: "grayscale invert dark:invert-0" },
  { src: "/logos/dpm.webp", alt: "DPM.lol", className: "grayscale invert dark:invert-0" },
];

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

export function LandingPageTemplate({ title, subtitle, showEUFlag = true }: LandingPageTemplateProps) {
  const t = useExtracted();

  const features = [
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
      icon: EarthIcon,
      title: t("Globe views"),
      description: t("Watch traffic flow with stunning 3D globe visualizations."),
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
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BackgroundGrid />

      {/* The page frame: one 1200px measured column with hairline rails. */}
      <div className="relative mx-auto w-full max-w-[1200px] md:border-x md:border-border">
        <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

        {/* Logo band */}
        <section className="relative px-5 py-12 sm:px-8 md:px-12 md:py-14">
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            {t("Trusted by 10,000+ organizations worldwide")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
            {logos.map(logo => {
              const image = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={120}
                  height={40}
                  className={cn(
                    "h-6 w-auto object-contain opacity-50 transition-opacity hover:opacity-90 dark:opacity-60 dark:hover:opacity-100",
                    logo.className
                  )}
                />
              );
              return logo.href ? (
                <Link key={logo.alt} href={logo.href} target="_blank">
                  {image}
                </Link>
              ) : (
                <div key={logo.alt}>{image}</div>
              );
            })}
          </div>
        </section>

        {/* Feature index — a ruled matrix, not a card grid */}
        <Section>
          <SectionHeader
            title={t("Everything you need")}
            lead={t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
          />
          <div className="mt-10 grid grid-cols-1 border-l border-t border-border sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="border-b border-r border-border p-5 transition-colors hover:bg-neutral-50 md:p-6 dark:hover:bg-neutral-900/40"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={18} className="text-neutral-500 dark:text-neutral-400" />
                    <h3 className="font-medium text-neutral-900 dark:text-white">{feature.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Product demos */}
        <Section>
          <SectionHeader title={t("See it in action")} lead={t("Powerful tools designed for clarity, not complexity.")} />
          <div className="mt-10 grid grid-cols-1 gap-4 md:mt-14 md:grid-cols-2 md:gap-5">
            <RealTimeAnalytics />
            <SessionReplay />
            <UserSessions />
            <Funnels />
          </div>
        </Section>

        {/* Integrations */}
        <Section>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2fr] md:gap-14">
            <div className="md:sticky md:top-28 md:self-start">
              <SectionHeader
                title={t("Works with all your favorite platforms")}
                lead={t("Integrate Rybbit with any platform in minutes")}
              />
            </div>
            <IntegrationsGrid />
          </div>
        </Section>

        {/* Testimonials */}
        <Section>
          <SectionHeader title={t("People love Rybbit")} lead={t("See what others think about Rybbit Analytics")} />
          <div className="relative mt-10 overflow-hidden rounded-xl border border-border md:mt-14">
            <div className="grid h-[560px] grid-cols-1 gap-4 p-4 md:h-[680px] md:grid-cols-3">
              {/* Column 1 - visible on all screen sizes */}
              <Marquee vertical pauseOnHover className="[--duration:60s]" repeat={2}>
                <TweetCard id="1991296442611184125" />
                <TweetCard id="1921928423284629758" />
                <TweetCard id="2000974573005889706" />
                <TweetCard id="1927817460993884321" />
                <TweetCard id="1977471983278535071" />
              </Marquee>

              {/* Column 2 - hidden on mobile */}
              <Marquee vertical pauseOnHover reverse className="hidden md:flex [--duration:60s]" repeat={2}>
                <TweetCard id="1920899082253434950" />
                <TweetCard id="2000788904778326334" />
                <TweetCard id="2015102995789381815" />
                <TweetCard id="1980082738934993142" />
                <TweetCard id="1976495558480232672" />
              </Marquee>

              {/* Column 3 - hidden on mobile */}
              <Marquee vertical pauseOnHover className="hidden md:flex [--duration:60s]" repeat={2}>
                <TweetCard id="1982378431166963982" />
                <TweetCard id="2009548405488615871" />
                <TweetCard id="1920470706761929048" />
                <TweetCard id="1979830490006974510" />
                <TweetCard id="1970265809122705759" />
              </Marquee>
            </div>

            {/* Edge fades */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent"></div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"></div>
          </div>
        </Section>

        {/* FAQ */}
        <Section>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2fr] md:gap-14">
            <div className="md:sticky md:top-28 md:self-start">
              <SectionHeader
                title={t("Frequently Asked Questions")}
                lead={t("Everything you need to know about Rybbit Analytics")}
              />
            </div>
            <FAQAccordion />
          </div>
        </Section>

        {/* Pricing */}
        <div className="relative border-t border-border">
          <Cross className="-left-[6px] -top-[6px]" />
          <Cross className="-right-[6px] -top-[6px]" />
          <LandingPricing />
        </div>
      </div>

      <CTASection />
    </>
  );
}
