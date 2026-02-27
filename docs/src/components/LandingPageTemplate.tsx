import { CTASection } from "@/components/CTASection";
import { FAQAccordion } from "@/components/FAQAccordion";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { Marquee } from "@/components/magicui/marquee";
import { SectionBadge } from "@/components/SectionBadge";
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

export function LandingPageTemplate({
  title,
  subtitle,
  showEUFlag = true,
}: LandingPageTemplateProps) {
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

      {/* Logo Section */}
      <section className="py-12 md:py-16 w-full">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm uppercase tracking-wider font-medium">
              {t("Trusted by 4,000+ organizations worldwide")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            <div className="flex items-center justify-center">
              <Image
                src="/logos/tencent.svg"
                alt="Tencent"
                width={130}
                height={40}
                className="opacity-50 hover:opacity-80 dark:opacity-70 dark:hover:opacity-100 transition-opacity dark:invert grayscale"
              />
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/logos/convex.svg"
                alt="Convex"
                width={120}
                height={40}
                className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0 dark:grayscale-0"
              />
            </div>
            <div className="flex items-center justify-center">
              <Link href="https://onyx.app" target="_blank">
                <Image
                  src="/logos/onyx.webp"
                  alt="Onyx"
                  width={100}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
                />
              </Link>
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/logos/vanguard.webp"
                alt="Vanguard"
                width={120}
                height={40}
                className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
              />
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/logos/ustwo.svg"
                alt="ustwo"
                width={100}
                height={40}
                className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity dark:invert"
              />
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/logos/mydramalist.png"
                alt="MyDramaList"
                width={120}
                height={40}
                className="opacity-50 hover:opacity-80 dark:opacity-60 dark:hover:opacity-100 transition-opacity invert dark:invert-0"
              />
            </div>
            <div className="flex items-center justify-center">
              <Image
                src="/logos/dtelecom.svg"
                alt="DTelecom"
                width={120}
                height={40}
                className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0"
              />
            </div>
            <div className="flex items-center justify-center">
              <Link href="https://dpm.lol" target="_blank">
                <Image
                  src="/logos/dpm.webp"
                  alt="DPM.lol"
                  width={120}
                  height={40}
                  className="opacity-40 hover:opacity-70 dark:opacity-60 dark:hover:opacity-100 transition-opacity grayscale invert dark:invert-0"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20 w-full max-w-[1200px] px-4 mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <SectionBadge className="mb-4">{t("Why Rybbit")}</SectionBadge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t("Everything you need")}</h2>
          <p className="mt-4 text-base md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
            {t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map(feature => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 rounded-lg p-5 transition-colors"
              >
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Icon size={20} className="text-neutral-600 dark:text-neutral-400" />
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-14 md:py-20 w-full max-w-[1200px] px-4 mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <SectionBadge className="mb-4">{t("Analytics Reimagined")}</SectionBadge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t("See it in action")}</h2>
          <p className="mt-4 text-base md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
            {t("Powerful tools designed for clarity, not complexity.")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <RealTimeAnalytics />
          <SessionReplay />
          <UserSessions />
          <Funnels />
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-12 md:py-20 w-full">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <SectionBadge className="mb-4">{t("Seamless Integration")}</SectionBadge>
              <h2 className="text-3xl md:text-4xl font-bold">{t("Works with all your favorite platforms")}</h2>
              <p className="mt-4 text-neutral-600 dark:text-neutral-300 font-light">
                {t("Integrate Rybbit with any platform in minutes")}
              </p>
            </div>
            <IntegrationsGrid />
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-10 md:py-16 w-full overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="text-center mb-10 md:mb-16">
            <SectionBadge className="mb-4">{t("User Testimonials")}</SectionBadge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t("People love Rybbit")}</h2>
            <p className="mt-4 text-base md:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
              {t("See what others think about Rybbit Analytics")}
            </p>
          </div>
          <div className="relative bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-3xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px] md:h-[700px] p-4">
              {/* Column 1 - visible on all screen sizes */}
              <Marquee vertical pauseOnHover className="[--duration:60s]" repeat={2}>
                <TweetCard id="1991296442611184125" />
                <TweetCard id="1921928423284629758" />
                <TweetCard id="2000974573005889706" />
                <TweetCard id="1927817460993884321" />
                <TweetCard id="1977471983278535071" />
                <TweetCard id="1958789741635141673" />
              </Marquee>

              {/* Column 2 - hidden on mobile */}
              <Marquee vertical pauseOnHover reverse className="hidden md:flex [--duration:60s]" repeat={2}>
                <TweetCard id="1920899082253434950" />
                <TweetCard id="2000788904778326334" />
                <TweetCard id="2015102995789381815" />
                <TweetCard id="1982378431166963982" />
                <TweetCard id="1980082738934993142" />
                <TweetCard id="1976495558480232672" />
              </Marquee>

              {/* Column 3 - hidden on mobile */}
              <Marquee vertical pauseOnHover className="hidden md:flex [--duration:60s]" repeat={2}>
                <TweetCard id="2009548405488615871" />
                <TweetCard id="1920470706761929048" />
                <TweetCard id="1981795864118243355" />
                <TweetCard id="1979830490006974510" />
                <TweetCard id="1970265809122705759" />
              </Marquee>
            </div>

            {/* Gradient overlays */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-neutral-100/90 dark:from-neutral-900/90 to-transparent"></div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-neutral-100/90 dark:from-neutral-900/90 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 md:py-16 w-full">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <h2 className="text-3xl md:text-4xl font-bold">{t("Frequently Asked Questions")}</h2>
              <p className="mt-4 text-neutral-600 dark:text-neutral-300 font-light">
                {t("Everything you need to know about Rybbit Analytics")}
              </p>
            </div>
            <FAQAccordion />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <LandingPricing />

      <CTASection />
    </>
  );
}
