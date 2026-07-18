import { CTASection } from "@/components/CTASection";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { useExtracted } from "next-intl";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Bot,
  Cookie,
  Database,
  Eye,
  Funnel,
  Gauge,
  Globe2,
  Languages,
  Layers,
  Link2,
  ListFilter,
  Lock,
  Mail,
  MailQuestion,
  MapPin,
  MousePointerClick,
  Plug,
  Rewind,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Tag,
  Target,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  UserX,
  Video,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Features - Rybbit Analytics",
  description:
    "Powerful, privacy-friendly analytics features to help you understand your audience and grow your business. Real-time data, session replay, web vitals, and more.",
  openGraph: {
    images: [createOGImageUrl("Features - Rybbit Analytics", "Powerful, privacy-friendly analytics features to help you understand your audience and grow your business.", "Features")],
  },
  twitter: {
    images: [createOGImageUrl("Features - Rybbit Analytics", "Powerful, privacy-friendly analytics features to help you understand your audience and grow your business.", "Features")],
  },
});


interface FeatureGridProps {
  title: string;
  description: string;
  features: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
}

function FeatureGrid({ title, description, features }: FeatureGridProps) {
  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
        <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
          <div className="lg:sticky lg:top-24">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{title}</h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">{description}</p>
          </div>
        </div>
        <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 lg:col-span-8 md:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="bg-white px-5 py-9 dark:bg-neutral-950 sm:px-8 lg:px-10">
              <div className="mb-5 text-neutral-500 dark:text-neutral-400">{feature.icon}</div>
              <h3 className="font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  const t = useExtracted();

  const coreWebAnalyticsFeatures = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: t("Page views"),
      description: t("See which pages attract the most attention and optimize your content strategy."),
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: t("Visitors"),
      description: t("Detailed visitor profiles with device, browser, OS, and location data."),
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: t("Bounce rate"),
      description: t("Identify which pages engage visitors and which need improvement."),
    },
    {
      icon: <Layers className="w-5 h-5" />,
      title: t("Traffic sources"),
      description: t("Discover where visitors come from to optimize your marketing channels."),
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: t("Location"),
      description: t("Geographic data down to city level for global audience insights."),
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: t("Devices"),
      description: t("Optimize your design for the devices your visitors actually use."),
    },
    {
      icon: <Languages className="w-5 h-5" />,
      title: t("Languages"),
      description: t("Know which languages your audience speaks to create targeted content."),
    },
    {
      icon: <ListFilter className="w-5 h-5" />,
      title: t("Filtering"),
      description: t("Slice and dice your data to uncover patterns and actionable insights."),
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: t("Realtime data"),
      description: t("Instant analytics updates—see what's happening on your site right now."),
    },
    {
      icon: <MousePointerClick className="w-5 h-5" />,
      title: t("Custom events"),
      description: t("Track sign-ups, purchases, downloads, and any custom user interaction."),
    },
    {
      icon: <Layers className="w-5 h-5" />,
      title: t("Custom data"),
      description: t("Attach custom properties to events for deeper behavioral insights."),
    },
    {
      icon: <Tag className="w-5 h-5" />,
      title: t("UTM tracking"),
      description: t("Automatically capture UTM parameters to measure campaign performance."),
    },
    {
      icon: <Link2 className="w-5 h-5" />,
      title: t("Links"),
      description: t("Track link clicks to measure external campaign effectiveness."),
    },
    {
      icon: <Bot className="w-5 h-5" />,
      title: t("Bot blocking"),
      description: t("Automatically filter out bots and crawlers to keep your data clean."),
    },
  ];

  const advancedAnalyticsFeatures = [
    {
      icon: <Video className="w-5 h-5" />,
      title: t("Session replay"),
      description: t("Watch real user sessions to spot usability issues and improvement opportunities."),
    },
    {
      icon: <Gauge className="w-5 h-5" />,
      title: t("Web vitals"),
      description: t("Monitor Core Web Vitals to maintain fast, smooth user experiences."),
    },
    {
      icon: <Funnel className="w-5 h-5" />,
      title: t("Funnels"),
      description: t("Visualize conversion paths and pinpoint exactly where visitors drop off."),
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: t("Goals"),
      description: t("Set and monitor conversion goals to track business objectives."),
    },
    {
      icon: <Route className="w-5 h-5" />,
      title: t("Journey"),
      description: t("Map how users navigate your site from landing to conversion."),
    },
    {
      icon: <Globe2 className="w-5 h-5" />,
      title: t("Globe views"),
      description: t("Watch traffic flow across the world with stunning 3D globe visualizations."),
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: t("Error tracking"),
      description: t("Catch JavaScript errors as they happen with full context to fix them fast."),
    },
    {
      icon: <Rewind className="w-5 h-5" />,
      title: t("User sessions"),
      description: t("Follow complete user journeys from first visit to conversion."),
    },
    {
      icon: <Search className="w-5 h-5" />,
      title: t("Google Search Console"),
      description: t("See how organic search drives traffic alongside your analytics data."),
    },
    {
      icon: <ArrowLeftRight className="w-5 h-5" />,
      title: t("Compare"),
      description: t("Benchmark metrics against previous periods to spot trends and measure growth."),
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: t("User profiles"),
      description: t("View complete user histories including all sessions, events, and interactions across their lifetime."),
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      title: t("Retention"),
      description: t("Track returning visitors to measure loyalty and engagement."),
    },
  ];

  const accessFeatures = [
    {
      icon: <Users className="w-5 h-5" />,
      title: t("Organizations"),
      description: t("Organize websites and share access across your team seamlessly."),
    },
    {
      icon: <Globe2 className="w-5 h-5" />,
      title: t("Public dashboards"),
      description: t("Make your dashboards publicly accessible with a single click—no login required."),
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: t("Private link sharing"),
      description: t("Share password-protected dashboard links with granular control over what data is visible."),
    },
    {
      icon: <UserCog className="w-5 h-5" />,
      title: t("RBAC"),
      description: t("Role-based access control to define precise permissions for different team members."),
    },
  ];

  const privacyFeatures = [
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: t("GDPR & CCPA"),
      description: t("Privacy-first design means you're compliant out of the box. No personal data collected."),
    },
    {
      icon: <UserX className="w-5 h-5" />,
      title: t("Data anonymization"),
      description: t("Every visitor is anonymous by default—privacy without compromising insights."),
    },
    {
      icon: <Cookie className="w-5 h-5" />,
      title: t("No cookies"),
      description: t("Zero cookies, zero cookie banners. Cleaner, faster experiences for visitors."),
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: t("Data ownership"),
      description: t("Your data, your rules. Self-host or use our cloud—you're always in control."),
    },
  ];

  const cloudFeatures = [
    {
      icon: <Settings className="w-5 h-5" />,
      title: t("Fully managed"),
      description: t("We handle infrastructure, updates, and scaling—you focus on growth."),
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: t("High performance"),
      description: t("Handle millions of events effortlessly. Queries stay fast at any scale."),
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: t("Hosted in EU"),
      description: t("GDPR-compliant infrastructure hosted in European data centers for data sovereignty."),
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: t("Email reports"),
      description: t("Automated email reports delivered daily, weekly, or monthly to your inbox."),
    },
    {
      icon: <MailQuestion className="w-5 h-5" />,
      title: t("Email support"),
      description: t("Get help when you need it with responsive email support from our team."),
    },
    {
      icon: <Plug className="w-5 h-5" />,
      title: t("API access"),
      description: t("Full API access to query your data and build custom integrations."),
    },
  ];

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title={t("Everything you need to understand your audience")}
        description={t("Powerful analytics without the complexity. Track, analyze, and optimize your website with privacy-friendly tools that just work.")}
        eventLocation="features_hero"
      />

      <FeatureGrid
        title={t("Core Web Analytics")}
        description={t("Track every metric that matters. Make data-driven decisions with comprehensive analytics designed for clarity.")}
        features={coreWebAnalyticsFeatures}
      />

      <FeatureGrid
        title={t("Advanced Analytics")}
        description={t("Go deeper with powerful tools for session replay, funnels, comparisons, and advanced user behavior analysis.")}
        features={advancedAnalyticsFeatures}
      />

      <FeatureGrid
        title={t("Access")}
        description={t("Flexible sharing and collaboration tools to get insights into the right hands, securely.")}
        features={accessFeatures}
      />

      <FeatureGrid
        title={t("Privacy")}
        description={t("Privacy isn't a feature—it's the foundation. Analytics that respect your users and comply with regulations automatically.")}
        features={privacyFeatures}
      />

      <FeatureGrid
        title={t("Cloud")}
        description={t("Enterprise-grade infrastructure without the enterprise headache. Reliable, fast, and fully managed.")}
        features={cloudFeatures}
      />

      <CTASection
        title={t("Ready to get started?")}
        description={t("Join thousands of companies using Rybbit to understand their audience")}
        eventLocation="features_bottom_cta"
      />
    </div>
  );
}
