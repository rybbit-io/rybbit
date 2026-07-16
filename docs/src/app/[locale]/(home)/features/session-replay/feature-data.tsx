import {
  Bug,
  Code,
  EyeOff,
  Headset,
  Lightbulb,
  MousePointerClick,
  Package,
  Play,
  Route,
  Search,
  Shield,
  Zap,
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
    icon: <Play className="w-5 h-5" />,
    title: "Unlimited replays",
    description:
      "Watch as many sessions as you need. Every session is recorded and available for playback with no per-replay limits.",
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Click & interaction tracking",
    description:
      "See every click, scroll, and form interaction. A breadcrumb timeline shows you exactly what happened and when.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Filter & search sessions",
    description:
      "Find the sessions that matter. Filter by duration, number of pageviews, events, country, device, or any custom property.",
  },
  {
    icon: <EyeOff className="w-5 h-5" />,
    title: "Privacy controls",
    description:
      "Automatically mask sensitive inputs and text. You control what gets recorded and what stays private.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Zero performance impact",
    description:
      "The replay script loads asynchronously and has no impact on your page load times or Core Web Vitals.",
  },
  {
    icon: <Route className="w-5 h-5" />,
    title: "Page navigation breadcrumbs",
    description:
      "See the full user journey as a visual breadcrumb trail — every page visited, every click made, every event fired.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Enable session replay",
    description:
      "Add sessionReplay: true to your Rybbit script configuration, or install the @rybbit/replay package. That's all the setup required.",
  },
  {
    step: 2,
    title: "Script loads asynchronously",
    description:
      "The replay capture script loads in the background with zero impact on page performance. It records DOM mutations, not screenshots, keeping payloads tiny.",
  },
  {
    step: 3,
    title: "Sessions are captured automatically",
    description:
      "Every user interaction — clicks, scrolls, page navigations, form inputs (masked), and custom events — is captured and sent to your Rybbit instance.",
  },
  {
    step: 4,
    title: "Replay from your dashboard",
    description:
      "Browse your session list, filter by any dimension, and hit play. Watch the session unfold exactly as the user experienced it, with a full timeline of events.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: "Product teams",
    description:
      "See how users actually interact with your product. Identify confusing flows, dead clicks, and UX friction that quantitative data alone can't reveal.",
  },
  {
    icon: <Headset className="w-6 h-6" />,
    title: "Support & success teams",
    description:
      "When a user reports a bug, watch their exact session instead of asking them to describe what happened. Resolve tickets faster with full context.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Privacy-conscious teams",
    description:
      "Session replay that respects user privacy. Sensitive inputs are masked automatically, and you choose exactly what data gets collected.",
  },
  {
    icon: <Bug className="w-6 h-6" />,
    title: "QA & engineering",
    description:
      "Reproduce bugs by watching the session that triggered them. Pair replay data with error tracking to see the full picture.",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Developers",
    description:
      "Debug user-reported issues without \"works on my machine\" guesswork. See the exact browser, device, and interaction sequence.",
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "Understand your first users deeply. Watch how they discover and use your product to iterate faster and build what actually matters.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Is session replay enabled by default?",
    answer:
      "No. Session replay is opt-in. You need to explicitly enable it by adding sessionReplay: true to your Rybbit configuration or installing the @rybbit/replay package.",
  },
  {
    question: "Does enabling session replay slow down my site?",
    answer:
      "No. The replay capture script loads asynchronously and records DOM mutations rather than taking screenshots. This approach has zero impact on your page load times or Core Web Vitals scores.",
  },
  {
    question: "How is this different from Hotjar or FullStory?",
    answer:
      "Rybbit session replay is integrated directly into your analytics platform — no separate tool, no extra billing, and no data silos. It's also privacy-first with automatic input masking, and it's fully open source so you can self-host everything.",
  },
  {
    question: "Are form inputs recorded?",
    answer:
      "By default, sensitive form inputs like passwords and credit card fields are automatically masked. You can configure additional masking rules to ensure no sensitive data is ever captured.",
  },
  {
    question: "How long are replays stored?",
    answer:
      "Replay data is stored for 30 days on cloud plans. If you self-host, you control retention policies entirely.",
  },
  {
    question: "Can I block specific parts of my UI from being recorded?",
    answer:
      "Yes. You can add data attributes to any element to exclude it from recording. This is useful for masking sensitive content, third-party widgets, or any section you prefer to keep private.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full dashboard that powers your quantitative insights.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description:
      "Track specific interactions and see them in your replay timeline.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description:
      "Find where users drop off, then watch their sessions to understand why.",
  },
  {
    title: "Error Tracking",
    href: "/features/error-tracking",
    description:
      "Pair error reports with session replays for instant debugging.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "See the full history of identified users across sessions.",
  },
  {
    title: "User Journeys",
    href: "/features/user-journeys",
    description: "Visualize navigation paths with interactive Sankey diagrams.",
  },
];
