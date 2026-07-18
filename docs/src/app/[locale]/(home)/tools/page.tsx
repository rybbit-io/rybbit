import Link from "next/link";
import {
  Activity,
  ArrowRight,
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
import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
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

const utilityTools = [
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
const platformIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  slack: MessageCircle, // Slack removed from simple-icons, using Lucide
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

interface SocialPlatform {
  id: string;
  name: string;
  displayName: string;
}

interface SocialToolGroup {
  title: string;
  description: string;
  suffix: string;
  platforms: SocialPlatform[];
}

const socialToolGroups: SocialToolGroup[] = [
  {
    title: "Font generators",
    description: "Unicode text styling for posts, bios, and comments.",
    suffix: "font-generator",
    platforms: platformList,
  },
  {
    title: "Comment generators",
    description: "AI-written, contextual replies for busy feeds.",
    suffix: "comment-generator",
    platforms: commentPlatformList,
  },
  {
    title: "Page name generators",
    description: "Creative names for pages, servers, and channels.",
    suffix: "page-name-generator",
    platforms: pageNamePlatformList,
  },
  {
    title: "Post generators",
    description: "AI-drafted posts tuned to each platform's voice.",
    suffix: "post-generator",
    platforms: postGeneratorPlatformList,
  },
  {
    title: "Username generators",
    description: "Available-sounding handles that fit your brand.",
    suffix: "username-generator",
    platforms: usernameGeneratorPlatformList,
  },
  {
    title: "Hashtag generators",
    description: "Strategic tags to boost discoverability.",
    suffix: "hashtag-generator",
    platforms: hashtagGeneratorPlatformList,
  },
  {
    title: "Character counters",
    description: "Stay inside every platform's post limits.",
    suffix: "character-counter",
    platforms: characterCounterPlatformList,
  },
  {
    title: "Bio generators",
    description: "Profile bios written to convert visitors into followers.",
    suffix: "bio-generator",
    platforms: bioGeneratorPlatformList,
  },
  {
    title: "Image resizers",
    description: "Crop to exact profile, cover, and post dimensions.",
    suffix: "photo-resizer",
    platforms: imageResizerPlatformList,
  },
  {
    title: "Logo generators",
    description: "AI-generated brand marks sized for each platform.",
    suffix: "logo-generator",
    platforms: logoGeneratorPlatformList,
  },
];

const socialToolCount = socialToolGroups.reduce((sum, group) => sum + group.platforms.length, 0);
const totalToolCount = calculators.length + aiPoweredTools.length + utilityTools.length + socialToolCount;

interface Tool {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function ToolCell({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className="group grid min-h-20 grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-3 bg-white px-5 py-5 transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:bg-neutral-950 dark:hover:bg-neutral-900/60 sm:grid-cols-[2rem_minmax(10rem,0.75fr)_minmax(12rem,1.25fr)_auto] sm:items-center sm:gap-4 sm:px-8"
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <h3 className="self-center text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
        {tool.title}
      </h3>
      <p className="col-start-2 text-sm leading-5 text-neutral-500 dark:text-neutral-400 sm:col-start-auto">
        {tool.description}
      </p>
      <ArrowRight
        className="row-span-2 size-3.5 self-center text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-neutral-600 sm:row-span-1"
        aria-hidden="true"
      />
    </Link>
  );
}

function ToolSection({
  id,
  title,
  description,
  tools,
}: {
  id: string;
  title: string;
  description: string;
  tools: Tool[];
}) {
  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby={id}>
      <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
        <GridCrosses className="hidden sm:block" />
        <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
          <div className="lg:sticky lg:top-24">
            <h2 id={id} className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {title}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">{description}</p>
          </div>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 lg:col-span-8">
          {tools.map(tool => (
            <ToolCell key={tool.href} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}

const directoryLinks = [
  { href: "#calculators-title", label: "Calculators", count: calculators.length },
  { href: "#ai-tools-title", label: "AI tools", count: aiPoweredTools.length },
  { href: "#utilities-title", label: "Utilities", count: utilityTools.length },
  { href: "#social-tools-title", label: "Social media", count: socialToolCount },
];

export default function ToolsPage() {
  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title={`${totalToolCount} free marketing tools`}
        description="Calculators, generators, and utilities to help you make data-driven marketing decisions. Every tool is free — no account required."
        eventLocation="tools_hero"
        primaryAction={null}
        secondaryAction={null}
        note="No signup. No usage limits."
      />

      <nav aria-label="Tool categories" className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
          {directoryLinks.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex min-h-14 items-center justify-between gap-4 border-neutral-200 px-5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-50 ${
                index < directoryLinks.length - 1 ? "border-b sm:border-b-0 sm:odd:border-r lg:border-r" : ""
              }`}
            >
              <span>{item.label}</span>
              <span className="tabular-nums text-neutral-400 dark:text-neutral-500">{item.count}</span>
            </Link>
          ))}
        </div>
      </nav>

      <ToolSection
        id="calculators-title"
        title="Calculators"
        description="Benchmark your funnel math — CTR, ROI, CPA, retention, and more, with industry comparisons built in."
        tools={calculators}
      />

      <ToolSection
        id="ai-tools-title"
        title="AI-powered tools"
        description="Generators and detectors that do the drafting for you: titles, meta descriptions, OG tags, and a privacy policy builder."
        tools={aiPoweredTools}
      />

      <ToolSection
        id="utilities-title"
        title="Utilities"
        description="Small, focused tools for everyday campaign work."
        tools={utilityTools}
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="social-tools-title">
        <div className="relative mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <GridCrosses className="hidden sm:block" />
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <h2 id="social-tools-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Social media tools
              </h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                {socialToolCount} generators, counters, and resizers covering every major platform. Pick a tool, then
                pick your platform.
              </p>
            </div>
          </div>
          <div className="lg:col-span-8">
            {socialToolGroups.map((group, index) => (
              <div
                key={group.suffix}
                className={`px-5 py-8 sm:px-8 ${
                  index < socialToolGroups.length - 1 ? "border-b border-neutral-200 dark:border-neutral-800" : ""
                }`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <h3 className="font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">{group.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{group.description}</p>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.platforms.map(platform => {
                    const Icon = platformIconMap[platform.id] ?? Palette;
                    return (
                      <li key={platform.id}>
                        <Link
                          href={`/tools/${platform.id}-${group.suffix}`}
                          title={platform.displayName}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                        >
                          <Icon className="size-3.5" aria-hidden="true" />
                          {platform.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection eventLocation="tools_bottom_cta" />
    </div>
  );
}
