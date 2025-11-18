import { SectionBadge } from "@/components/SectionBadge";
import { TrackedButton } from "@/components/TrackedButton";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Bot,
  CheckCircle,
  Clock,
  Cookie,
  Database,
  Download,
  Eye,
  Funnel,
  Gauge,
  Globe,
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
  Rewind,
  Route,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Tag,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  UserCog,
  Users,
  UserX,
  Video,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features - Rybbit Analytics",
  description:
    "Powerful, privacy-friendly analytics features to help you understand your audience and grow your business. Real-time data, session replay, web vitals, and more.",
};

const coreWebAnalyticsFeatures = [
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Page views",
    description: "See which pages attract the most attention and optimize your content strategy.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Visitors",
    description: "Detailed visitor profiles with device, browser, OS, and location data.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Bounce rate",
    description: "Identify which pages engage visitors and which need improvement.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Traffic sources",
    description: "Discover where visitors come from to optimize your marketing channels.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Location",
    description: "Geographic data down to city level for global audience insights.",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "Devices",
    description: "Optimize your design for the devices your visitors actually use.",
  },
  {
    icon: <Languages className="w-5 h-5" />,
    title: "Languages",
    description: "Know which languages your audience speaks to create targeted content.",
  },
  {
    icon: <ListFilter className="w-5 h-5" />,
    title: "Filtering",
    description: "Slice and dice your data to uncover patterns and actionable insights.",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Realtime data",
    description: "Instant analytics updates—see what's happening on your site right now.",
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Custom events",
    description: "Track sign-ups, purchases, downloads, and any custom user interaction.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Custom data",
    description: "Attach custom properties to events for deeper behavioral insights.",
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: "UTM tracking",
    description: "Automatically capture UTM parameters to measure campaign performance.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Links",
    description: "Track link clicks to measure external campaign effectiveness.",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: "Bot blocking",
    description: "Automatically filter out bots and crawlers to keep your data clean.",
  },
];

const advancedAnalyticsFeatures = [
  {
    icon: <Video className="w-5 h-5" />,
    title: "Session replay",
    description: "Watch real user sessions to spot usability issues and improvement opportunities.",
  },
  {
    icon: <Gauge className="w-5 h-5" />,
    title: "Web vitals",
    description: "Monitor Core Web Vitals to maintain fast, smooth user experiences.",
  },
  {
    icon: <Funnel className="w-5 h-5" />,
    title: "Funnels",
    description: "Visualize conversion paths and pinpoint exactly where visitors drop off.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "Goals",
    description: "Set and monitor conversion goals to track business objectives.",
  },
  {
    icon: <Route className="w-5 h-5" />,
    title: "Journey",
    description: "Map how users navigate your site from landing to conversion.",
  },
  {
    icon: <Globe2 className="w-5 h-5" />,
    title: "Globe views",
    description: "Watch traffic flow across the world with stunning 3D globe visualizations.",
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Error tracking",
    description: "Catch JavaScript errors as they happen with full context to fix them fast.",
  },
  {
    icon: <Rewind className="w-5 h-5" />,
    title: "User sessions",
    description: "Follow complete user journeys from first visit to conversion.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Google Search Console",
    description: "See how organic search drives traffic alongside your analytics data.",
  },
  {
    icon: <ArrowLeftRight className="w-5 h-5" />,
    title: "Compare",
    description: "Benchmark metrics against previous periods to spot trends and measure growth.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "User profiles",
    description: "View complete user histories including all sessions, events, and interactions across their lifetime.",
  },
  {
    icon: <UserCheck className="w-5 h-5" />,
    title: "Retention",
    description: "Track returning visitors to measure loyalty and engagement.",
  },
];

const accessFeatures = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Organizations",
    description: "Organize websites and share access across your team seamlessly.",
  },
  {
    icon: <Globe2 className="w-5 h-5" />,
    title: "Public dashboards",
    description: "Make your dashboards publicly accessible with a single click—no login required.",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Private link sharing",
    description: "Share password-protected dashboard links with granular control over what data is visible.",
  },
  {
    icon: <UserCog className="w-5 h-5" />,
    title: "RBAC",
    description: "Role-based access control to define precise permissions for different team members.",
  },
];

const privacyFeatures = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "GDPR & CCPA",
    description: "Privacy-first design means you're compliant out of the box. No personal data collected.",
  },
  {
    icon: <UserX className="w-5 h-5" />,
    title: "Data anonymization",
    description: "Every visitor is anonymous by default—privacy without compromising insights.",
  },
  {
    icon: <Cookie className="w-5 h-5" />,
    title: "No cookies",
    description: "Zero cookies, zero cookie banners. Cleaner, faster experiences for visitors.",
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: "Data ownership",
    description: "Your data, your rules. Self-host or use our cloud—you're always in control.",
  },
];

const cloudFeatures = [
  {
    icon: <Settings className="w-5 h-5" />,
    title: "Fully managed",
    description: "We handle infrastructure, updates, and scaling—you focus on growth.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "High performance",
    description: "Handle millions of events effortlessly. Queries stay fast at any scale.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Hosted in EU",
    description: "GDPR-compliant infrastructure hosted in European data centers for data sovereignty.",
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
    title: "Email reports",
    description: "Automated email reports delivered daily, weekly, or monthly to your inbox.",
  },
  {
    icon: <MailQuestion className="w-5 h-5" />,
    title: "Email support",
    description: "Get help when you need it with responsive email support from our team.",
  },
];

interface FeatureGridProps {
  title: string;
  description: string;
  features: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  bgClassName?: string;
}

function FeatureGrid({ title, description, features, bgClassName = "" }: FeatureGridProps) {
  return (
    <section className={`py-12 md:py-16 w-full ${bgClassName}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="bg-neutral-200/50 dark:bg-neutral-800/20 rounded-lg p-5 transition-colors">
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
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <SectionBadge className="mb-6">Features</SectionBadge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Everything you need to understand your audience
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 mb-8 font-light">
              Powerful analytics without the complexity. Track, analyze, and optimize your website with privacy-friendly
              tools that just work.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-base md:text-lg">
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "features_hero", button_text: "Get started for free" }}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
              >
                Get started
              </TrackedButton>
              <TrackedButton
                href="https://demo.rybbit.com/21"
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: "features_hero", button_text: "View live demo" }}
                className="w-full sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-6 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
              >
                Live demo
              </TrackedButton>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm flex items-center justify-center gap-2 mt-6">
              <CheckCircle className="w-4 h-4" />
              First {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews/m free • No credit card required
            </p>
          </div>
        </div>
      </section>

      <FeatureGrid
        title="Core Web Analytics"
        description="Track every metric that matters. Make data-driven decisions with comprehensive analytics designed for clarity."
        features={coreWebAnalyticsFeatures}
      />

      <FeatureGrid
        title="Advanced Analytics"
        description="Go deeper with powerful tools for session replay, funnels, comparisons, and advanced user behavior analysis."
        features={advancedAnalyticsFeatures}
        bgClassName="bg-neutral-100/30 dark:bg-neutral-900/50"
      />

      <FeatureGrid
        title="Access"
        description="Flexible sharing and collaboration tools to get insights into the right hands, securely."
        features={accessFeatures}
      />

      <FeatureGrid
        title="Privacy"
        description="Privacy isn't a feature—it's the foundation. Analytics that respect your users and comply with regulations automatically."
        features={privacyFeatures}
        bgClassName="bg-neutral-100/30 dark:bg-neutral-900/50"
      />

      <FeatureGrid
        title="Cloud"
        description="Enterprise-grade infrastructure without the enterprise headache. Reliable, fast, and fully managed."
        features={cloudFeatures}
      />

      {/* Why Choose Rybbit Section */}
      <section className="py-14 md:py-20 w-full bg-neutral-100/30 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Why choose Rybbit?</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-light">
              Built for teams who value privacy, simplicity, and powerful insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500/20 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Set up in minutes</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm">
                  Add a simple script tag or install our npm package and start tracking immediately. No complex
                  configuration required.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500/20 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Privacy-focused</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm">
                  Cookieless tracking that&apos;s GDPR and CCPA compliant by default. No cookie banners needed, your
                  users&apos; privacy protected.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500/20 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Lightning fast</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm">
                  Our tracking script is less than 2KB and doesn&apos;t slow down your site. Dashboard loads instantly
                  with real-time updates.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500/20 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Eye className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Crystal clear insights</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm">
                  No confusing metrics or overwhelming dashboards. See exactly what matters with clean, intuitive
                  visualizations.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500/20 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Grow with confidence</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm">
                  From startups to enterprises, our infrastructure scales with you. Start free and upgrade only when you
                  need to.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500/20 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Globe className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Open source</h3>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm">
                  100% open source under AGPL v3.0. Self-host on your infrastructure or use our cloud service. Your
                  choice, your data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 w-full bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 mb-10 font-light">
            Join thousands of companies using Rybbit to understand their audience
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-base md:text-lg">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "features_bottom_cta", button_text: "Start tracking for free" }}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-4 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              Start tracking for free
            </TrackedButton>
            <Link href="/pricing" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-8 py-4 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 flex items-center justify-center gap-2">
                View pricing
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm flex items-center justify-center gap-2 mt-8">
            <CheckCircle className="w-4 h-4" />
            No credit card required • Cancel anytime • {DEFAULT_EVENT_LIMIT.toLocaleString()} events/month free
          </p>
        </div>
      </section>
    </div>
  );
}
