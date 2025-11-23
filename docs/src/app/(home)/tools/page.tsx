import Link from "next/link";
import {
  Activity,
  Calculator,
  DollarSign,
  FileText,
  Gauge,
  Link as LinkIcon,
  MousePointerClick,
  Search,
  Share2,
  Sparkles,
  TrendingDown,
  Type,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Free Marketing Tools | Rybbit",
  description:
    "Free calculators and AI-powered tools for marketers. UTM builder, CTR calculator, ROI calculator, SEO generators, and more.",
};

const tools = [
  {
    href: "/tools/utm-builder",
    icon: LinkIcon,
    title: "UTM Builder",
    description:
      "Create trackable campaign URLs with UTM parameters. Perfect for tracking your marketing campaigns across different channels.",
    category: "Campaign Tools",
  },
  {
    href: "/tools/ctr-calculator",
    icon: MousePointerClick,
    title: "CTR Calculator",
    description:
      "Calculate your click-through rate and compare it to industry benchmarks. See how your campaigns perform against the competition.",
    category: "Analytics",
  },
  {
    href: "/tools/marketing-roi-calculator",
    icon: Calculator,
    title: "Marketing ROI Calculator",
    description:
      "Calculate ROI, ROAS, and profit margins for your marketing campaigns. Make data-driven decisions about your ad spend.",
    category: "Analytics",
  },
  {
    href: "/tools/bounce-rate-calculator",
    icon: TrendingDown,
    title: "Bounce Rate Calculator",
    description:
      "Calculate your website's bounce rate and compare it to industry benchmarks. See how well you're keeping visitors engaged.",
    category: "Analytics",
  },
  {
    href: "/tools/sample-size-calculator",
    icon: Users,
    title: "A/B Test Sample Size Calculator",
    description:
      "Calculate how many visitors you need for statistically significant A/B test results. Never run underpowered tests again.",
    category: "Analytics",
  },
  {
    href: "/tools/traffic-value-calculator",
    icon: DollarSign,
    title: "Traffic Value Calculator",
    description:
      "Estimate the monetary value of your website traffic. Understand what each visitor is worth to your business.",
    category: "Analytics",
  },
  {
    href: "/tools/page-speed-calculator",
    icon: Gauge,
    title: "Page Speed Impact Calculator",
    description:
      "Calculate how page load time affects your conversions and revenue. See the real cost of a slow website.",
    category: "Analytics",
  },
  {
    href: "/tools/funnel-visualizer",
    icon: Activity,
    title: "Funnel Visualizer",
    description:
      "Visualize your conversion funnel step-by-step. Input visitor counts at each stage and see where you're losing customers.",
    category: "Analytics",
  },
  {
    href: "/tools/ai-privacy-policy-generator",
    icon: Sparkles,
    title: "AI Privacy Policy Generator",
    description:
      "Generate a comprehensive, GDPR-compliant privacy policy using AI. Just describe your site and get a tailored policy instantly.",
    category: "AI-Powered",
  },
  {
    href: "/tools/analytics-detector",
    icon: Search,
    title: "Analytics Platform Detector",
    description:
      "Discover what analytics and tracking tools any website is using. Analyze privacy implications and data collection practices.",
    category: "AI-Powered",
  },
  {
    href: "/tools/seo-title-generator",
    icon: Type,
    title: "SEO Title Generator",
    description:
      "Generate optimized, click-worthy title tags for your pages using AI. Get multiple variations tailored to your topic and keywords.",
    category: "AI-Powered SEO",
  },
  {
    href: "/tools/meta-description-generator",
    icon: FileText,
    title: "Meta Description Generator",
    description:
      "Create compelling meta descriptions that boost click-through rates. AI-powered variations optimized for search engines.",
    category: "AI-Powered SEO",
  },
  {
    href: "/tools/og-tag-generator",
    icon: Share2,
    title: "Open Graph Tag Generator",
    description:
      "Generate optimized Open Graph tags for social media sharing. Get perfect previews on Facebook, Twitter, and LinkedIn.",
    category: "AI-Powered SEO",
  },
  {
    href: "/tools/privacy-policy-builder",
    icon: FileText,
    title: "Privacy Policy Builder",
    description:
      "Generate a customized privacy policy for your website. Answer a few questions and get a compliant privacy policy instantly.",
    category: "Legal",
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-[1300px] mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">Free Marketing Tools</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Powerful calculators and generators to help you make data-driven marketing decisions. All tools are 100%
            free to use.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 transition-all hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:-translate-y-1 duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 dark:from-emerald-500/20 dark:to-emerald-600/10 border border-emerald-500/40 dark:border-emerald-500/30 shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">{tool.title}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{tool.description}</p>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform duration-300">
                  Try it now →
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
