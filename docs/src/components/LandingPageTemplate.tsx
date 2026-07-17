import { FAQAccordion } from "@/components/FAQAccordion";
import { HeroSection } from "@/components/HeroSection";
import { IntegrationsGrid } from "@/components/Integration";
import { LandingPricing } from "@/components/LandingPricing";
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
import { Funnels } from "@/components/Cards/Funnels";
import { RealTimeAnalytics } from "@/components/Cards/RealTimeAnalytics";
import { SessionReplay } from "@/components/Cards/SessionReplay";
import { UserSessions } from "@/components/Cards/UserSessions";
import { CTASection } from "@/components/CTASection";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import styles from "./LandingPage.module.css";

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

const customerLogos = [
  { src: "/logos/automatio.webp", alt: "Automatio", width: 130, href: "https://automatio.ai" },
  { src: "/logos/convex.svg", alt: "Convex", width: 120 },
  { src: "/logos/onyx.webp", alt: "Onyx", width: 100, href: "https://onyx.app" },
  { src: "/logos/vanguard.webp", alt: "Vanguard", width: 120 },
  { src: "/logos/ustwo.svg", alt: "ustwo", width: 100 },
  { src: "/logos/mydramalist.png", alt: "MyDramaList", width: 120 },
  { src: "/logos/dtelecom.svg", alt: "DTelecom", width: 120 },
  { src: "/logos/dpm.webp", alt: "DPM.lol", width: 120 },
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
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <HeroSection title={title} subtitle={subtitle} showEUFlag={showEUFlag} />

      <section className={styles.trustSection} aria-labelledby="customer-heading">
        <div className={styles.shell}>
          <p id="customer-heading" className={styles.trustLabel}>
            {t("Trusted by 10,000+ organizations worldwide")}
          </p>
          <div className={styles.logoGrid}>
            {customerLogos.map(logo => {
              const image = (
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={40}
                  className={styles.customerLogo}
                />
              );

              return logo.href ? (
                <Link key={logo.alt} href={logo.href} target="_blank" rel="noreferrer" aria-label={logo.alt}>
                  {image}
                </Link>
              ) : (
                <div key={logo.alt}>{image}</div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="capabilities-heading">
        <div className={styles.shell}>
          <div className={styles.splitIntro}>
            <div className={styles.sectionAside}>{t("Why Rybbit")}</div>
            <div className={styles.sectionCopy}>
              <h2 id="capabilities-heading" className={styles.sectionTitle}>
                {t("Everything you need")}
              </h2>
              <p className={styles.sectionDescription}>
                {t("Powerful analytics without the complexity. Privacy-friendly tools that just work.")}
              </p>
            </div>
          </div>

          <ul className={styles.featureIndex}>
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className={styles.featureItem}>
                  <Icon size={19} className={styles.featureIcon} />
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="product-heading">
        <div className={styles.shell}>
          <div className={styles.productIntro}>
            <h2 id="product-heading" className={styles.sectionTitle}>
              {t("See it in action")}
            </h2>
            <p className={styles.sectionDescription}>{t("Powerful tools designed for clarity, not complexity.")}</p>
          </div>
          <div className={styles.productGrid}>
            <RealTimeAnalytics />
            <SessionReplay />
            <UserSessions />
            <Funnels />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="integrations-heading">
        <div className={styles.shell}>
          <div className={styles.sideBySide}>
            <div className={styles.stickyIntro}>
              <h2 id="integrations-heading" className={styles.compactTitle}>
                {t("Works with all your favorite platforms")}
              </h2>
              <p className={styles.sectionDescription}>{t("Integrate Rybbit with any platform in minutes")}</p>
            </div>
            <IntegrationsGrid />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="testimonials-heading">
        <div className={styles.shell}>
          <div className={styles.testimonialIntro}>
            <h2 id="testimonials-heading" className={styles.compactTitle}>
              {t("People love Rybbit")}
            </h2>
            <p className={styles.sectionDescription}>{t("See what others think about Rybbit Analytics")}</p>
          </div>
          <div className={styles.testimonialGrid}>
            <TweetCard id="1991296442611184125" />
            <TweetCard id="1921928423284629758" />
            <TweetCard id="2000974573005889706" />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="faq-heading">
        <div className={styles.shell}>
          <div className={styles.sideBySide}>
            <div className={styles.stickyIntro}>
              <h2 id="faq-heading" className={styles.compactTitle}>
                {t("Frequently Asked Questions")}
              </h2>
              <p className={styles.sectionDescription}>
                {t("Everything you need to know about Rybbit Analytics")}
              </p>
            </div>
            <FAQAccordion />
          </div>
        </div>
      </section>

      <LandingPricing />
      <CTASection />
    </div>
  );
}
