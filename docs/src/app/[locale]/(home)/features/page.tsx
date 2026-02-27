import { BackgroundGrid } from "@/components/BackgroundGrid";
import { CTASection } from "@/components/CTASection";
import { TrackedButton } from "@/components/TrackedButton";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { useExtracted } from "next-intl";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Bot,
  CheckCircle,
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
    images: [createOGImageUrl("Features - Rybbit Analytics", "Powerful, privacy-friendly analytics features to help you understand your audience and grow your business.")],
  },
  twitter: {
    images: [createOGImageUrl("Features - Rybbit Analytics", "Powerful, privacy-friendly analytics features to help you understand your audience and grow your business.")],
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
    <section className="py-12 md:py-16 w-full relative z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 rounded-lg p-5 transition-colors">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="text-neutral-600 dark:text-neutral-400">{feature.icon}</div>
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{feature.description}</p>
              </div>
            </div>
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
    // {
    //   icon: <Upload className="w-5 h-5" />,
    //   title: "Data import",
    //   description: "Migrate from other platforms seamlessly with built-in import tools.",
    // },
    // {
    //   icon: <Download className="w-5 h-5" />,
    //   title: "Data export",
    //   description: "Export complete raw data anytime. No lock-in, no summaries—just your data.",
    // },
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
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      <BackgroundGrid />
      {/* Hero Section */}
      <section className="py-16 md:py-24 w-full relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {t("Everything you need to understand your audience")}
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 mb-8 font-light">
              {t("Powerful analytics without the complexity. Track, analyze, and optimize your website with privacy-friendly tools that just work.")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-base md:text-lg">
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "features_hero", button_text: "Get started for free" }}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
              >
                {t("Start for $0")}
              </TrackedButton>
              <TrackedButton
                href="https://demo.rybbit.com/1"
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: "features_hero", button_text: "View live demo" }}
                className="w-full sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-6 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
              >
                {t("Live demo")}
              </TrackedButton>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm flex items-center justify-center gap-2 mt-6">
              <CheckCircle className="w-4 h-4" />
              {t("7-day free trial")}
            </p>
          </div>
        </div>
      </section>

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
