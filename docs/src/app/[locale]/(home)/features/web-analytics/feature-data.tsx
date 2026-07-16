import {
  Activity,
  BarChart3,
  Bot,
  Eye,
  Filter,
  Layers,
  MapPin,
  Megaphone,
  Palette,
  PenTool,
  Rocket,
  Smartphone,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  FAQItem,
  FeatureCapability,
  HowItWorksStep,
  RelatedFeature,
  WhoUsesItem,
} from "../components/FeaturePage";

export const capabilities: FeatureCapability[] = [
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Pageviews & visitors",
    description:
      "Track unique visitors, pageviews, sessions, and bounce rate in real time. See exactly how people interact with every page on your site.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Traffic sources",
    description:
      "See where your visitors come from — direct, referral, organic search, social, or paid campaigns — all in one view.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Geographic data",
    description:
      "Pinpoint your audience down to city level. Understand regional trends and tailor content for your biggest markets.",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "Device & browser breakdown",
    description:
      "Know which devices, browsers, and operating systems your visitors use so you can optimize for what matters.",
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: "UTM tracking",
    description:
      "Automatically capture UTM parameters from your campaigns. Measure which channels drive the most conversions.",
  },
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Advanced filtering",
    description:
      "Slice your data by any dimension — country, browser, referrer, page, or custom event. Click any value to instantly filter.",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Real-time dashboard",
    description:
      "No waiting, no sampling. See live visitor counts and page activity as it happens, updated every second.",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: "Automatic bot filtering",
    description:
      "Known bots and crawlers are filtered out automatically so your data stays clean and accurate.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Period comparisons",
    description:
      "Compare any date range against a previous period. Spot trends, measure growth, and understand seasonality at a glance.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Add one script tag",
    description:
      "Paste a single line of code into your site or install @rybbit/js from npm. It works with any framework — React, Vue, Next.js, WordPress, Shopify, and more.",
  },
  {
    step: 2,
    title: "Traffic flows in instantly",
    description:
      "As soon as the script is live, you'll see real-time visitors, pageviews, and session data on your dashboard. No configuration needed.",
  },
  {
    step: 3,
    title: "Click to explore",
    description:
      "Click any metric, country, referrer, or page to drill down. Every dimension is clickable, so exploring your data feels like browsing, not querying.",
  },
  {
    step: 4,
    title: "Share and collaborate",
    description:
      "Make your dashboard public, share a private link, or invite your team. Everyone sees the same real-time data.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Track campaign performance, monitor UTM parameters, and understand which channels drive the most engaged visitors.",
  },
  {
    icon: <PenTool className="w-6 h-6" />,
    title: "Content creators & bloggers",
    description:
      "See which posts resonate, where readers come from, and how they navigate your site — without the complexity of enterprise tools.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Developers & indie hackers",
    description:
      "Lightweight, privacy-first analytics that doesn't slow your site down. Get a clear picture of your product's traction in seconds.",
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: "Agencies",
    description:
      "Manage multiple client sites from one account with organizations. Share beautiful, public dashboards clients can understand instantly.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Privacy-conscious teams",
    description:
      "No cookies, no consent banners, GDPR compliant by default. Ship analytics your legal team actually approves of.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "SaaS companies",
    description:
      "Track signups, monitor landing page performance, and correlate traffic sources with actual product usage.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "What do I need to set up web analytics?",
    answer:
      "Just add a single script tag to your website or install @rybbit/js from npm. There's no tag manager, no complex configuration, and no cookie consent banner required. Most users are collecting data within 5 minutes.",
  },
  {
    question: "How is Rybbit different from Google Analytics?",
    answer:
      "Rybbit is privacy-first (no cookies, no personal data), open source, and shows everything on a single dashboard instead of 150+ reports. The tracking script is 18KB vs GA4's 371KB. You also get features like session replay and funnels that GA4 lacks or charges $50k/year for.",
  },
  {
    question: "Do I need a cookie consent banner?",
    answer:
      "No. Rybbit doesn't use cookies and doesn't collect personal data, so no consent banner is needed under GDPR, CCPA, or PECR. This means you capture 100% of your visitors without any consent friction.",
  },
  {
    question: "Can I filter by multiple properties at once?",
    answer:
      "Yes. You can stack as many filters as you need — country, browser, referrer, page path, custom events, and more. Click any value in your dashboard to instantly apply it as a filter.",
  },
  {
    question: "What UTM parameters are supported?",
    answer:
      "Rybbit automatically captures utm_source, utm_medium, utm_campaign, utm_term, and utm_content from your URLs. No extra setup required — they appear in your traffic sources breakdown.",
  },
  {
    question: "Is real-time data actually real-time?",
    answer:
      "Yes. Rybbit processes events as they arrive with no sampling or batching delays. You'll see live visitor counts, current active pages, and events as they happen.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description: "Watch real user sessions to understand behavior beyond the numbers.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Visualize conversion paths and find where visitors drop off.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track signups, purchases, and any user interaction.",
  },
  {
    title: "User Journeys",
    href: "/features/user-journeys",
    description: "Map how users navigate from landing page to conversion.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Set conversion goals and track progress automatically.",
  },
  {
    title: "Web Vitals",
    href: "/features/web-vitals",
    description: "Monitor Core Web Vitals for fast user experiences.",
  },
];
