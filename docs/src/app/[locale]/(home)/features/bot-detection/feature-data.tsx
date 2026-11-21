import {
  Activity,
  BarChart3,
  Bot,
  CreditCard,
  Fingerprint,
  Megaphone,
  Monitor,
  Network,
  Newspaper,
  Rocket,
  ShoppingCart,
  TrendingUp,
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
    icon: <Bot className="w-5 h-5" />,
    title: "User-agent & AI crawler patterns",
    description:
      "Catches search engine crawlers, headless browsers, SEO and monitoring tools, script and framework HTTP clients, and the growing wave of AI crawlers and agents.",
  },
  {
    icon: <Fingerprint className="w-5 h-5" />,
    title: "Browser fingerprint checks",
    description:
      "Header heuristics and client-side signals expose bots that fake a browser user-agent: missing browser headers, automation APIs, impossible window dimensions, empty plugin lists, and headless renderers.",
  },
  {
    icon: <Network className="w-5 h-5" />,
    title: "ASN & network intelligence",
    description:
      "Curated ASNs of known AI, scanner, and measurement providers trigger detection directly. Generic hosting ASNs only count as supporting evidence, so visitors on VPNs, corporate gateways, and CDNs aren't falsely flagged.",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Rate & anomaly detection",
    description:
      "Rolling windows catch crawl-shaped behavior: bursts from one IP, rapid path fan-out, rotating user-agents, and replayed tracking requests that pass every other check.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "A dedicated Bots report",
    description:
      "See everything that was filtered: total blocked requests, bot share of traffic, trends over time, and breakdowns by page, referrer, country, device, and user-agent, with the exact detection layers that matched.",
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Bots are never billed",
    description:
      "Detected bot visits don't count toward your usage. You're not paying for GPTBot to crawl your docs or a scraper to hammer your product pages.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Enable Block Bot Traffic",
    description:
      "Flip one toggle in Site Settings. Bot detection is configured per site, and there's nothing to change in your tracking script.",
  },
  {
    step: 2,
    title: "Every request runs all five layers",
    description:
      "User-agent patterns, header heuristics, client signals, ASN checks, and rate anomaly detection all run on every incoming tracking request. Rybbit records every layer that matched, then makes one final decision.",
  },
  {
    step: 3,
    title: "Bot traffic is filtered, not lost",
    description:
      "Detected bots never touch your normal analytics. Dashboards, funnels, journeys, and session lists stay human-only, and a compact bot event record is stored separately so nothing disappears silently.",
  },
  {
    step: 4,
    title: "Inspect the Bots report",
    description:
      "Open the Bots page in your dashboard to audit what was blocked and why. Server-side events sent with an API key are treated as trusted and bypass detection entirely.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Bounce rate, conversion rate, and campaign ROI all break when bots inflate the denominator. Clean traffic means decisions based on humans.",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "E-commerce stores",
    description:
      "Price scrapers and inventory bots hit product pages constantly. Filter them out so product analytics reflect real shoppers.",
  },
  {
    icon: <Newspaper className="w-6 h-6" />,
    title: "Content & docs sites",
    description:
      "AI crawlers now rival search engines in crawl volume. See exactly which bots are reading your content, without them polluting your stats.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startups & SaaS",
    description:
      "Launch-day traffic spikes bring uptime monitors, link previewers, and scrapers along. Know how much of that spike was real.",
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "Agencies",
    description:
      "Client reports lose credibility when numbers include bots. Show clients human traffic, and use the Bots report to explain the difference.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "SEO teams",
    description:
      "Separate crawler activity from organic visitors, and verify which crawlers actually visit your site and how often.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "How is this different from the bot filtering other analytics tools do?",
    answer:
      "Most tools silently drop requests matching a known user-agent list. Rybbit runs five detection layers (user-agent patterns, header heuristics, client-side browser signals, ASN intelligence, and rate anomaly detection) and then shows you everything it filtered in a dedicated Bots report, including which layers matched each request.",
  },
  {
    question: "Do blocked bots count toward my bill?",
    answer:
      "No. Detected bot visits are excluded from billable analytics usage. If bot blocking filters a request, you are not charged for it.",
  },
  {
    question: "Will real visitors get blocked by mistake?",
    answer:
      "The layers are weighted to avoid this. Generic hosting or datacenter ASNs are never enough to block a request on their own; they only count as supporting evidence when another layer also matches. Visitors on VPNs, corporate gateways, or unusual network paths are not filtered just for their network.",
  },
  {
    question: "Does it catch AI crawlers and agents?",
    answer:
      "Yes. The user-agent layer includes AI crawler and agent patterns, and the ASN layer includes curated ASNs of known AI providers. The Bots report shows you exactly which ones are hitting your site.",
  },
  {
    question: "Does bot detection affect server-side tracking?",
    answer:
      "No. Events sent to the tracking API with a valid API key are treated as trusted server-side ingestion and bypass bot detection entirely.",
  },
  {
    question: "Does it work behind a proxy or CDN?",
    answer:
      "Yes, as long as your proxy forwards the original visitor IP and user-agent headers. If the proxy's own IP is forwarded instead, traffic can inherit the proxy's location and ASN. The proxy guide covers the correct header setup.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The clean, human-only dashboard that bot detection protects.",
  },
  {
    title: "Sessions",
    href: "/features/sessions",
    description: "Browse individual visits knowing each one is a real person.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Conversion rates you can trust, with bots out of the denominator.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Track conversions without automated traffic inflating results.",
  },
  {
    title: "Dashboard Sharing",
    href: "/features/dashboard-sharing",
    description: "Share clean, bot-free numbers publicly or with clients.",
  },
  {
    title: "Web Vitals",
    href: "/features/web-vitals",
    description: "Performance metrics measured from real browsers, not headless ones.",
  },
];
