import {
  BarChart3,
  Gauge,
  LineChart,
  MapPin,
  Monitor,
  PenTool,
  Rocket,
  Settings,
  Smartphone,
  Target,
  Timer,
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
    icon: <Gauge className="w-5 h-5" />,
    title: "Core Web Vitals",
    description:
      "Monitor LCP (Largest Contentful Paint), FID/INP (Interaction to Next Paint), and CLS (Cumulative Layout Shift) — the metrics Google uses for search ranking.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Percentile analysis",
    description:
      "View performance at the P75, P90, and P99 levels. Understand not just your average, but how your slowest users experience your site.",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "Device & browser breakdown",
    description:
      "See performance by device type, browser, and operating system. Identify if mobile Safari users have worse LCP than desktop Chrome users.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Geographic performance map",
    description:
      "Visualize performance by region on an interactive map. Spot countries or regions where your site is slow due to CDN gaps or server distance.",
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "Time-series trends",
    description:
      "Track how your Web Vitals change over time. Correlate performance regressions with deployments or traffic spikes.",
  },
  {
    icon: <Timer className="w-5 h-5" />,
    title: "Real user monitoring",
    description:
      "All metrics come from real users, not synthetic tests. See actual performance as your visitors experience it.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Enable Web Vitals tracking",
    description:
      "Add trackWebVitals: true to your Rybbit configuration. The tracking code uses the standard web-vitals library to measure CWV metrics.",
  },
  {
    step: 2,
    title: "Real user data is collected",
    description:
      "As visitors browse your site, their actual LCP, FID/INP, and CLS values are measured and sent to Rybbit. No synthetic tests — real performance from real users.",
  },
  {
    step: 3,
    title: "View the Performance dashboard",
    description:
      "Navigate to Performance in your dashboard. See overview cards, time-series charts, dimension breakdowns, and the geographic performance map.",
  },
  {
    step: 4,
    title: "Identify and fix issues",
    description:
      "Spot which devices, browsers, or regions have poor performance. Use the data to prioritize optimization efforts where they matter most.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Developers & engineers",
    description:
      "Monitor performance regressions in production. Correlate deploy times with CWV changes to catch issues before they affect SEO.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "SEO teams",
    description:
      "Core Web Vitals directly impact search rankings. Track real-user metrics to ensure your site meets Google's performance thresholds.",
  },
  {
    icon: <PenTool className="w-6 h-6" />,
    title: "UX & design teams",
    description:
      "Ensure your designs perform well in production. CLS monitoring catches layout shifts that create jarring user experiences.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Platform teams",
    description:
      "Set performance budgets and monitor them continuously. Get real user data across all device types and geographies.",
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "Agency developers",
    description:
      "Monitor performance across client sites. Show clients real data on how their site performs for actual visitors.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "E-commerce teams",
    description:
      "Page speed directly impacts conversion rates. Monitor LCP to ensure your product pages load fast enough to keep shoppers engaged.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "What are Core Web Vitals?",
    answer:
      "Core Web Vitals are a set of performance metrics defined by Google that measure real-world user experience: LCP (loading speed), FID/INP (interactivity), and CLS (visual stability). They directly impact your search rankings.",
  },
  {
    question: "How does this differ from Lighthouse or PageSpeed Insights?",
    answer:
      "Lighthouse and PageSpeed Insights run synthetic tests on a simulated device. Rybbit measures real user performance — actual LCP, FID, and CLS values from your visitors' real devices, browsers, and network conditions. This gives you a much more accurate picture.",
  },
  {
    question: "Does tracking Web Vitals add overhead to my site?",
    answer:
      "The overhead is negligible. Rybbit uses the standard web-vitals library which runs entirely in the browser and measures metrics that are already being calculated. The reporting payload is tiny.",
  },
  {
    question: "What percentiles are available?",
    answer:
      "You can view your metrics at P75, P90, and P99. Google uses P75 for search ranking decisions, but P90 and P99 help you understand the experience for your slowest users.",
  },
  {
    question: "Can I see performance by page?",
    answer:
      "Yes. You can break down Web Vitals by page URL, device type, browser, operating system, and geographic region. This helps you identify which specific pages need optimization.",
  },
  {
    question: "Is this available on all plans?",
    answer:
      "Web Vitals monitoring is available on Rybbit Cloud plans. Self-hosted users can also enable this feature.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full analytics dashboard alongside your performance data.",
  },
  {
    title: "Error Tracking",
    href: "/features/error-tracking",
    description: "Catch JavaScript errors that may cause performance issues.",
  },
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description: "Watch sessions where users experienced poor performance.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track performance-related custom events and metrics.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Correlate performance improvements with conversion goals.",
  },
  {
    title: "User Journeys",
    href: "/features/user-journeys",
    description: "See if slow pages cause users to abandon their journey.",
  },
];
