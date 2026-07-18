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

interface LandingPageTemplateProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
}

/**
 * Page band: full-width section separated by a hairline, content snapped to
 * the single shared container. Every section on the page uses this shell so
 * the rails and the vertical rhythm stay consistent.
 */
function Band({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("w-full border-t border-neutral-200 dark:border-neutral-800", className)}>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">{children}</div>
    </section>
  );
}

/**
 * The one section-header grammar for the whole page: left-aligned heading +
 * muted subline. No eyebrow badges, no per-section variations.
 */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-10 max-w-2xl md:mb-14">
      <h2 className="text-3xl font-semibold tracking-tight text-balance text-neutral-900 md:text-4xl dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base text-pretty text-neutral-600 md:text-lg dark:text-neutral-400">{description}</p>
      )}
    </div>
  );
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
      <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

      {/* Logo cloud */}
      <Band>
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {t("Trusted by 10,000+ organizations worldwide")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          <Link href="https://automatio.ai" target="_blank">
            <Image
              src="/logos/automatio.webp"
              alt="automatio"
              width={130}
              height={40}
              className="h-7 w-auto opacity-60 grayscale invert transition-opacity hover:opacity-100 dark:opacity-70 dark:invert-0 dark:hover:opacity-100"
            />
          </Link>
          <Image
            src="/logos/convex.svg"
            alt="Convex"
            width={120}
            height={40}
            className="h-7 w-auto opacity-60 grayscale invert transition-opacity hover:opacity-100 dark:opacity-70 dark:grayscale-0 dark:invert-0 dark:hover:opacity-100"
          />
          <Link href="https://onyx.app" target="_blank">
            <Image
              src="/logos/onyx.webp"
              alt="Onyx"
              width={100}
              height={40}
              className="h-7 w-auto opacity-60 transition-opacity hover:opacity-100 dark:opacity-70 dark:invert dark:hover:opacity-100"
            />
          </Link>
          <Image
            src="/logos/vanguard.webp"
            alt="Vanguard"
            width={120}
            height={40}
            className="h-7 w-auto opacity-60 transition-opacity hover:opacity-100 dark:opacity-70 dark:invert dark:hover:opacity-100"
          />
          <Image
            src="/logos/ustwo.svg"
            alt="ustwo"
            width={100}
            height={40}
            className="h-7 w-auto opacity-60 transition-opacity hover:opacity-100 dark:opacity-70 dark:invert dark:hover:opacity-100"
          />
          <Image
            src="/logos/mydramalist.png"
            alt="MyDramaList"
            width={120}
            height={40}
            className="h-7 w-auto opacity-60 invert transition-opacity hover:opacity-100 dark:opacity-70 dark:invert-0 dark:hover:opacity-100"
          />
          <Image
            src="/logos/dtelecom.svg"
            alt="DTelecom"
            width={120}
            height={40}
            className="h-7 w-auto opacity-60 grayscale invert transition-opacity hover:opacity-100 dark:opacity-70 dark:invert-0 dark:hover:opacity-100"
          />
          <Image
            src="/logos/dpm.webp"
            alt="DPM.lol"
            width={120}
            height={40}
            className="h-7 w-auto opacity-60 grayscale invert transition-opacity hover:opacity-100 dark:opacity-70 dark:invert-0 dark:hover:opacity-100"
          />
        </div>
      </Band>

      {/* Feature spec sheet */}
      <Band>
        <SectionHeader
          title={t("Everything you need")}
          description={t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
        />
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(feature => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
                <Icon size={18} className="text-neutral-400 dark:text-neutral-500" />
                <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </Band>

      {/* Product showcase */}
      <Band>
        <SectionHeader
          title={t("See it in action")}
          description={t("Powerful tools designed for clarity, not complexity.")}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RealTimeAnalytics />
          <SessionReplay />
          <UserSessions />
          <Funnels />
        </div>
      </Band>

      {/* Integrations */}
      <Band>
        <SectionHeader
          title={t("Works with all your favorite platforms")}
          description={t("Integrate Rybbit with any platform in minutes.")}
        />
        <IntegrationsGrid />
      </Band>

      {/* Testimonials */}
      <Band>
        <SectionHeader title={t("People love Rybbit")} description={t("See what others think about Rybbit Analytics.")} />
        <div className="relative h-[560px] overflow-hidden rounded-lg border border-neutral-200 md:h-[640px] dark:border-neutral-800 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
          <div className="grid h-full grid-cols-1 gap-4 p-4 md:grid-cols-3">
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
        </div>
      </Band>

      {/* FAQ */}
      <Band>
        <SectionHeader
          title={t("Frequently Asked Questions")}
          description={t("Everything you need to know about Rybbit Analytics.")}
        />
        <FAQAccordion />
      </Band>

      {/* Pricing */}
      <div className="w-full border-t border-neutral-200 dark:border-neutral-800">
        <LandingPricing />
      </div>

      <CTASection />
    </>
  );
}
