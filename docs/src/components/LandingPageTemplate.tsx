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

// One hairline color for the whole page — rails, seams, matrix, panels.
const hairline = "border-neutral-200 dark:border-neutral-800";

interface SectionIntroProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

function SectionIntro({ title, description, className }: SectionIntroProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2
        className={cn(
          "text-3xl tracking-tight text-neutral-900 md:text-4xl dark:text-white [text-wrap:balance]",
          tiltWarp.className
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base text-neutral-600 md:text-lg dark:text-neutral-400 [text-wrap:pretty]">
          {description}
        </p>
      )}
    </div>
  );
}

const logos: {
  src: string;
  alt: string;
  width: number;
  href?: string;
  className: string;
}[] = [
  {
    src: "/logos/automatio.webp",
    alt: "automatio",
    width: 130,
    href: "https://automatio.ai",
    className:
      "opacity-50 hover:opacity-80 dark:opacity-70 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0",
  },
  {
    src: "/logos/convex.svg",
    alt: "Convex",
    width: 120,
    className:
      "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0 dark:grayscale-0",
  },
  {
    src: "/logos/onyx.webp",
    alt: "Onyx",
    width: 100,
    href: "https://onyx.app",
    className: "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert",
  },
  {
    src: "/logos/vanguard.webp",
    alt: "Vanguard",
    width: 120,
    className: "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert",
  },
  {
    src: "/logos/ustwo.svg",
    alt: "ustwo",
    width: 100,
    className: "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert",
  },
  {
    src: "/logos/mydramalist.png",
    alt: "MyDramaList",
    width: 120,
    className:
      "opacity-50 hover:opacity-80 dark:opacity-60 dark:hover:opacity-100 transition-opacity invert dark:invert-0",
  },
  {
    src: "/logos/dtelecom.svg",
    alt: "DTelecom",
    width: 120,
    className:
      "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0",
  },
  {
    src: "/logos/dpm.webp",
    alt: "DPM.lol",
    width: 120,
    className:
      "opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0",
  },
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

      {/* The whole page lives inside one ruled 1200px container. Vertical
          rails plus hairline seams between sections keep everything on grid. */}
      <div className={cn("relative mx-auto w-full max-w-[1200px] md:border-x", hairline)}>
        <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

        {/* Logos */}
        <section className={cn("border-t px-5 py-10 md:px-8 md:py-14", hairline)}>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            {t("Trusted by 10,000+ organizations worldwide")}
          </p>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 items-center justify-items-center gap-x-8 gap-y-8 sm:grid-cols-4">
            {logos.map(logo => {
              const image = (
                <Image src={logo.src} alt={logo.alt} width={logo.width} height={40} className={logo.className} />
              );
              return logo.href ? (
                <Link key={logo.alt} href={logo.href} target="_blank">
                  {image}
                </Link>
              ) : (
                <span key={logo.alt}>{image}</span>
              );
            })}
          </div>
        </section>

        {/* Feature matrix — a spec sheet, not a card grid. Runs edge-to-edge
            so its seams meet the page rails; the last row's bottom line is
            the next section's seam. */}
        <section className={cn("border-t", hairline)}>
          <SectionIntro
            className="px-5 pt-16 pb-10 md:px-8 md:pt-20 md:pb-12"
            title={t("Everything you need")}
            description={t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
          />
          <div
            className={cn(
              "grid grid-cols-2 gap-px border-t bg-neutral-200 lg:grid-cols-4 dark:bg-neutral-800",
              hairline
            )}
          >
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-background p-4 transition-colors hover:bg-neutral-50 md:p-6 dark:hover:bg-neutral-900"
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    <Icon size={16} className="shrink-0 text-neutral-500 dark:text-neutral-400" />
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Product showcase */}
        <section className={cn("border-t px-5 py-16 md:px-8 md:py-20", hairline)}>
          <SectionIntro
            className="pb-10 md:pb-12"
            title={t("See it in action")}
            description={t("Powerful tools designed for clarity, not complexity.")}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RealTimeAnalytics />
            <SessionReplay />
            <UserSessions />
            <Funnels />
          </div>
        </section>

        {/* Integrations */}
        <section className={cn("border-t px-5 py-16 md:px-8 md:py-20", hairline)}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <SectionIntro
                title={t("Works with all your favorite platforms")}
                description={t("Integrate Rybbit with any platform in minutes")}
              />
            </div>
            <IntegrationsGrid />
          </div>
        </section>

        {/* Testimonials */}
        <section className={cn("border-t px-5 py-16 md:px-8 md:py-20", hairline)}>
          <SectionIntro
            className="pb-10 md:pb-12"
            title={t("People love Rybbit")}
            description={t("See what others think about Rybbit Analytics")}
          />
          <div className="grid h-[560px] grid-cols-1 gap-4 overflow-hidden md:h-[640px] md:grid-cols-3 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
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
        </section>

        {/* FAQ */}
        <section className={cn("border-t px-5 py-16 md:px-8 md:py-20", hairline)}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <SectionIntro
                title={t("Frequently Asked Questions")}
                description={t("Everything you need to know about Rybbit Analytics")}
              />
            </div>
            <FAQAccordion />
          </div>
        </section>

        {/* Pricing */}
        <div className={cn("border-t", hairline)}>
          <LandingPricing />
        </div>

        {/* CTA */}
        <div className={cn("border-t", hairline)}>
          <CTASection />
        </div>
      </div>
    </>
  );
}
