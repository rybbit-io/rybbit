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
    "Privacy-friendly analytics from one cookieless script: real-time traffic, session replay, funnels, web vitals, error tracking, and more.",
  openGraph: {
    images: [createOGImageUrl("Features - Rybbit Analytics", "Real-time traffic, session replay, funnels, web vitals, and error tracking, from one cookieless script.", "Features")],
  },
  twitter: {
    images: [createOGImageUrl("Features - Rybbit Analytics", "Real-time traffic, session replay, funnels, web vitals, and error tracking, from one cookieless script.", "Features")],
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
      description: t("Stack filters on any dimension (country, referrer, page, event) to narrow to the exact segment."),
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: t("Realtime data"),
      description: t("See visitors, pageviews, and events the moment they happen. No sampling, no delay."),
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
      description: t("Watch live visits land on a 3D globe, down to the city."),
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
      description: t("Group your sites and manage team access from one place."),
    },
    {
      icon: <Globe2 className="w-5 h-5" />,
      title: t("Public dashboards"),
      description: t("Make your dashboards publicly accessible with a single click. No login required."),
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
      description: t("No cookies and no personal data collected, so there's nothing for visitors to consent to."),
    },
    {
      icon: <UserX className="w-5 h-5" />,
      title: t("Data anonymization"),
      description: t("Every visitor is anonymous by default, and IDs are re-salted daily so no one is tracked across days."),
    },
    {
      icon: <Cookie className="w-5 h-5" />,
      title: t("No cookies"),
      description: t("Nothing stored on a visitor's device, so you never owe them a cookie banner."),
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: t("Data ownership"),
      description: t("Your data, your rules. Self-host or use our cloud; you're always in control."),
    },
  ];

  const cloudFeatures = [
    {
      icon: <Settings className="w-5 h-5" />,
      title: t("Fully managed"),
      description: t("We handle infrastructure, updates, and scaling. You add the script."),
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: t("High performance"),
      description: t("Queries stay fast whether your site gets thousands of events a day or millions."),
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
        title={t("See what's happening on your site")}
        description={t("Traffic, sessions, funnels, replay, and errors, all behind one cookieless script tag.")}
        eventLocation="features_hero"
      />

      <FeatureGrid
        title={t("Core Web Analytics")}
        description={t("The metrics you check first (visitors, pages, sources, devices) in real time and clickable to filter.")}
        features={coreWebAnalyticsFeatures}
      />

      <FeatureGrid
        title={t("Advanced Analytics")}
        description={t("Go past the top-line numbers: replay sessions, chart funnels, and follow the paths users actually take.")}
        features={advancedAnalyticsFeatures}
      />

      <FeatureGrid
        title={t("Access")}
        description={t("Share a dashboard, invite your team, and set who can see what.")}
        features={accessFeatures}
      />

      <FeatureGrid
        title={t("Privacy")}
        description={t("Cookieless by default: no consent banner, no personal data collected, GDPR and CCPA covered.")}
        features={privacyFeatures}
      />

      <FeatureGrid
        title={t("Cloud")}
        description={t("We run the infrastructure (updates, scaling, backups) so you only ever read the dashboard.")}
        features={cloudFeatures}
      />

      <CTASection
        title={t("Ready to get started?")}
        description={t("Add the script and start understanding your traffic in minutes.")}
        eventLocation="features_bottom_cta"
      />
    </div>
  );
}
