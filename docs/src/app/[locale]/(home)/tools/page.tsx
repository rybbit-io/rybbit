import Link from "next/link";
import {
  Activity,
  Calculator,
  DollarSign,
  Eye,
  FileText,
  Gauge,
  Link as LinkIcon,
  MousePointerClick,
  Palette,
  PlayCircle,
  Search,
  Share2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Type,
  UserCheck,
  Users,
  MessageCircle,
  Briefcase,
  Zap,
} from "lucide-react";
import { platformList } from "./(social-media-tools)/components/platform-configs";
import { commentPlatformList } from "./(social-media-tools)/components/comment-platform-configs";
import { pageNamePlatformList } from "./(social-media-tools)/components/page-name-platform-configs";
import { postGeneratorPlatformList } from "./(social-media-tools)/components/post-generator-platform-configs";
import { usernameGeneratorPlatformList } from "./(social-media-tools)/components/username-generator-platform-configs";
import { hashtagGeneratorPlatformList } from "./(social-media-tools)/components/hashtag-generator-platform-configs";
import { characterCounterPlatformList } from "./(social-media-tools)/components/character-counter-platform-configs";
import { bioGeneratorPlatformList } from "./(social-media-tools)/components/bio-generator-platform-configs";
import { imageResizerPlatformList } from "./(social-media-tools)/components/image-resizer-platform-configs";
import { logoGeneratorPlatformList } from "./(social-media-tools)/components/logo-generator-platform-configs";
import {
  SiDiscord,
  SiX,
  SiReddit,
  SiFacebook,
  SiInstagram,
  SiThreads,
  SiYoutube,
  SiTiktok,
  SiPinterest,
  SiVk,
  SiBluesky,
  SiLemmy,
  SiSlack,
  SiMastodon,
  SiFarcaster,
  SiTelegram,
  SiDribbble,
  SiTwitch,
  SiSpotify,
  SiGithub,
  SiMedium,
  SiSubstack,
  SiSnapchat,
  SiSteam,
  SiTumblr,
  SiWhatsapp,
} from "@icons-pack/react-simple-icons";

export const metadata = {
  title: "Free Marketing Tools | Rybbit",
  description:
    "Free calculators and AI-powered tools for marketers. UTM builder, CTR calculator, ROI calculator, SEO generators, and more.",
};

const calculators = [
  {
    href: "/tools/ctr-calculator",
    icon: MousePointerClick,
    title: "CTR Calculator",
    description:
      "Calculate your click-through rate and compare it to industry benchmarks. See how your campaigns perform against the competition.",
  },
  {
    href: "/tools/marketing-roi-calculator",
    icon: Calculator,
    title: "Marketing ROI Calculator",
    description:
      "Calculate ROI, ROAS, and profit margins for your marketing campaigns. Make data-driven decisions about your ad spend.",
  },
  {
    href: "/tools/bounce-rate-calculator",
    icon: TrendingDown,
    title: "Bounce Rate Calculator",
    description:
      "Calculate your website's bounce rate and compare it to industry benchmarks. See how well you're keeping visitors engaged.",
  },
  {
    href: "/tools/sample-size-calculator",
    icon: Users,
    title: "A/B Test Sample Size Calculator",
    description:
      "Calculate how many visitors you need for statistically significant A/B test results. Never run underpowered tests again.",
  },
  {
    href: "/tools/traffic-value-calculator",
    icon: DollarSign,
    title: "Traffic Value Calculator",
    description:
      "Estimate the monetary value of your website traffic. Understand what each visitor is worth to your business.",
  },
  {
    href: "/tools/page-speed-calculator",
    icon: Gauge,
    title: "Page Speed Impact Calculator",
    description:
      "Calculate how page load time affects your conversions and revenue. See the real cost of a slow website.",
  },
  {
    href: "/tools/cost-per-acquisition-calculator",
    icon: Target,
    title: "Cost Per Acquisition (CPA) Calculator",
    description:
      "Calculate your customer acquisition costs and compare against industry benchmarks to optimize your marketing ROI.",
  },
  {
    href: "/tools/retention-rate-calculator",
    icon: UserCheck,
    title: "Retention Rate Calculator",
    description:
      "Calculate customer retention rates and compare against industry benchmarks to improve customer loyalty and reduce churn.",
  },
  {
    href: "/tools/conversion-rate-calculator",
    icon: TrendingUp,
    title: "Conversion Rate Calculator",
    description:
      "Calculate conversion rates and compare against industry benchmarks to optimize your marketing funnel and maximize ROI.",
  },
  {
    href: "/tools/cost-per-mille-calculator",
    icon: Eye,
    title: "CPM Calculator (Cost Per Mille)",
    description:
      "Calculate cost per thousand impressions and compare across advertising platforms to optimize your media spend.",
  },
  {
    href: "/tools/customer-lifetime-value-calculator",
    icon: DollarSign,
    title: "Customer Lifetime Value (CLV) Calculator",
    description:
      "Calculate customer lifetime value with retention analysis and profit margins to optimize acquisition spending and maximize long-term revenue.",
  },
  {
    href: "/tools/cost-per-lead-calculator",
    icon: Users,
    title: "Cost Per Lead (CPL) Calculator",
    description:
      "Calculate cost per lead and compare across marketing channels to optimize your lead generation strategy and maximize ROI.",
  },
  {
    href: "/tools/cost-per-view-calculator",
    icon: PlayCircle,
    title: "Cost Per View (CPV) Calculator",
    description:
      "Calculate cost per view for video ads and compare across platforms to optimize your video advertising strategy and maximize engagement.",
  },
];

const aiPoweredTools = [
  {
    href: "/tools/analytics-detector",
    icon: Search,
    title: "Analytics Platform Detector",
    description:
      "Discover what analytics and tracking tools any website is using. Analyze privacy implications and data collection practices.",
  },
  {
    href: "/tools/seo-title-generator",
    icon: Type,
    title: "SEO Title Generator",
    description:
      "Generate optimized, click-worthy title tags for your pages using AI. Get multiple variations tailored to your topic and keywords.",
  },
  {
    href: "/tools/meta-description-generator",
    icon: FileText,
    title: "Meta Description Generator",
    description:
      "Create compelling meta descriptions that boost click-through rates. AI-powered variations optimized for search engines.",
  },
  {
    href: "/tools/og-tag-generator",
    icon: Share2,
    title: "Open Graph Tag Generator",
    description:
      "Generate optimized Open Graph tags for social media sharing. Get perfect previews on Facebook, Twitter, and LinkedIn.",
  },
  {
    href: "/tools/privacy-policy-builder",
    icon: FileText,
    title: "Privacy Policy Builder",
    description:
      "Generate a customized privacy policy for your website. Answer a few questions and get a compliant privacy policy instantly.",
  },
];

const otherTools = [
  {
    href: "/tools/utm-builder",
    icon: LinkIcon,
    title: "UTM Builder",
    description:
      "Create trackable campaign URLs with UTM parameters. Perfect for tracking your marketing campaigns across different channels.",
  },
  {
    href: "/tools/funnel-visualizer",
    icon: Activity,
    title: "Funnel Visualizer",
    description:
      "Visualize your conversion funnel step-by-step. Input visitor counts at each stage and see where you're losing customers.",
  },
];

// Map platform IDs to Simple Icons components (with Lucide fallbacks)
const platformIconMap: Record<string, any> = {
  linkedin: Briefcase, // LinkedIn not available in simple-icons, using Lucide
  discord: SiDiscord,
  x: SiX,
  reddit: SiReddit,
  facebook: SiFacebook,
  instagram: SiInstagram,
  threads: SiThreads,
  youtube: SiYoutube,
  tiktok: SiTiktok,
  pinterest: SiPinterest,
  vk: SiVk,
  bluesky: SiBluesky,
  lemmy: SiLemmy,
  slack: SiSlack,
  mastodon: SiMastodon,
  warpcast: SiFarcaster,
  telegram: SiTelegram,
  nostr: Zap, // Nostr not available in simple-icons, using Lucide
  dribbble: SiDribbble,
  twitch: SiTwitch,
  spotify: SiSpotify,
  github: SiGithub,
  medium: SiMedium,
  substack: SiSubstack,
  snapchat: SiSnapchat,
  steam: SiSteam,
  tumblr: SiTumblr,
  whatsapp: SiWhatsapp,
};

const fontGeneratorTools = platformList.map(platform => ({
  href: `/tools/${platform.id}-font-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Transform your text into unique Unicode fonts for ${platform.name}. Stand out with stylish text.`,
}));

const commentGeneratorTools = commentPlatformList.map(platform => ({
  href: `/tools/${platform.id}-comment-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Generate engaging AI-powered comments for ${platform.name}. Create authentic, contextual responses.`,
}));

const pageNameGeneratorTools = pageNamePlatformList.map(platform => ({
  href: `/tools/${platform.id}-page-name-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Generate creative ${platform.pageType.toLowerCase()} names for ${platform.name} with AI.`,
}));

const postGeneratorTools = postGeneratorPlatformList.map(platform => ({
  href: `/tools/${platform.id}-post-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Generate engaging posts for ${platform.name} with AI-powered content creation.`,
}));

const usernameGeneratorTools = usernameGeneratorPlatformList.map(platform => ({
  href: `/tools/${platform.id}-username-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Generate creative usernames for ${platform.name} with AI.`,
}));

const hashtagGeneratorTools = hashtagGeneratorPlatformList.map(platform => ({
  href: `/tools/${platform.id}-hashtag-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Generate strategic hashtags for ${platform.name} to boost discoverability.`,
}));

const characterCounterTools = characterCounterPlatformList.map(platform => ({
  href: `/tools/${platform.id}-character-counter`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Count characters for ${platform.name} posts and stay within limits.`,
}));

const bioGeneratorTools = bioGeneratorPlatformList.map(platform => ({
  href: `/tools/${platform.id}-bio-generator`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Generate compelling ${platform.name} bios with AI.`,
}));

const imageResizerTools = imageResizerPlatformList.map(platform => ({
  href: `/tools/${platform.id}-photo-resizer`,
  icon: platformIconMap[platform.id],
  title: platform.displayName,
  description: `Resize and crop images for ${platform.name} profiles, covers, and posts.`,
}));

const logoGeneratorTools = logoGeneratorPlatformList.map(platform => ({
  href: `/tools/${platform.id}-logo-generator`,
  icon: platformIconMap[platform.id] || Palette,
  title: platform.displayName,
  description: `Generate AI-powered brand logos for ${platform.name}.`,
}));

const socialMediaTools = [
  ...fontGeneratorTools,
  ...commentGeneratorTools,
  ...pageNameGeneratorTools,
  ...postGeneratorTools,
  ...usernameGeneratorTools,
  ...hashtagGeneratorTools,
  ...characterCounterTools,
  ...bioGeneratorTools,
  ...imageResizerTools,
  ...logoGeneratorTools,
];

const totalToolCount = calculators.length + aiPoweredTools.length + otherTools.length + socialMediaTools.length;

function ToolCard({ tool }: { tool: { href: string; icon: any; title: string; description: string } }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className="group bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 transition-all hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:-translate-y-1 duration-300"
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
}

export default function ToolsPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">{totalToolCount} Free Marketing Tools</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Powerful calculators and generators to help you make data-driven marketing decisions. All tools are 100%
            free to use.
          </p>
        </div>

        {/* Calculators Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Calculator className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Calculators</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {calculators.map(tool => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>

        {/* AI-Powered Tools Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">AI-Powered Tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {aiPoweredTools.map(tool => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>

        {/* Social Media Tools Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Social Media Tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {socialMediaTools.map(tool => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>

        {/* Other Tools Section */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Other Tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {otherTools.map(tool => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
