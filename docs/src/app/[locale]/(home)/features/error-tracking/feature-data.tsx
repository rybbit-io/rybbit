import {
  AlertTriangle,
  BarChart3,
  Bug,
  Code,
  FileText,
  Headset,
  Layers,
  LineChart,
  Rocket,
  Search,
  Settings,
  Shield,
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
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Automatic error capture",
    description:
      "JavaScript errors are captured automatically with full error names, messages, and context. No manual instrumentation required.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Error aggregation",
    description:
      "Errors are grouped by name and message so you can see which errors occur most frequently instead of drowning in individual occurrences.",
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "Trend sparklines",
    description:
      "Each error type shows a sparkline of its frequency over time. Spot new errors immediately and see if fixes actually reduced occurrence.",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Error details & context",
    description:
      "Click into any error to see full details including the error message, count, and the pages where it occurs most frequently.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Search & paginate",
    description:
      "Search through your error list and paginate through results. Quickly find specific errors even across thousands of distinct error types.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Error counts over time",
    description:
      "Track total error volume and individual error type frequency over any date range. Correlate error spikes with deployments.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Enable error tracking",
    description:
      "Add trackErrors: true to your Rybbit configuration. Rybbit will automatically listen for unhandled JavaScript errors and promise rejections.",
  },
  {
    step: 2,
    title: "Errors are captured automatically",
    description:
      "When a JavaScript error occurs on your site, Rybbit captures the error name, message, and page context. No try/catch wrappers needed.",
  },
  {
    step: 3,
    title: "View the Errors dashboard",
    description:
      "Navigate to Errors in your dashboard to see aggregated error types, their frequency, trend sparklines, and occurrence counts.",
  },
  {
    step: 4,
    title: "Debug with full context",
    description:
      "Click into any error to see details. Pair with session replay to watch the exact user session where the error occurred.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Code className="w-6 h-6" />,
    title: "Frontend developers",
    description:
      "Catch JavaScript errors in production that don't show up in testing. See which errors affect the most users and prioritize fixes.",
  },
  {
    icon: <Bug className="w-6 h-6" />,
    title: "QA teams",
    description:
      "Monitor error rates after releases. Catch regressions immediately and pair error data with session replay for instant reproduction.",
  },
  {
    icon: <Headset className="w-6 h-6" />,
    title: "Support teams",
    description:
      "When users report issues, check the error log first. See if there's a JavaScript error explaining the behavior before asking for screenshots.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Engineering managers",
    description:
      "Track error trends over time and ensure error counts are decreasing. Use data to justify investment in stability and quality.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup teams",
    description:
      "Get production error monitoring without adding another tool. Error tracking built into your analytics means one less bill and one less integration.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "DevOps & SRE teams",
    description:
      "Monitor client-side error rates as a health metric. Set up alerts when error volumes spike after deployments.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Is error tracking enabled by default?",
    answer:
      "No. Error tracking is opt-in. Add trackErrors: true to your Rybbit configuration to start capturing JavaScript errors automatically.",
  },
  {
    question: "What types of errors are captured?",
    answer:
      "Rybbit captures unhandled JavaScript errors (window.onerror) and unhandled promise rejections (unhandledrejection). These cover the vast majority of client-side errors.",
  },
  {
    question: "How is this different from Sentry or Bugsnag?",
    answer:
      "Rybbit error tracking is lightweight and integrated into your analytics platform — no separate tool, no extra SDK, no additional billing. It's designed for monitoring and triage, not as a full error management platform. For most teams, it provides enough signal to catch and prioritize issues.",
  },
  {
    question: "Can I pair errors with session replay?",
    answer:
      "Yes. When a user session includes an error, you can watch the session replay to see exactly what happened before, during, and after the error occurred. This is incredibly useful for reproduction.",
  },
  {
    question: "Are errors aggregated or shown individually?",
    answer:
      "Errors are aggregated by error name and message. You see unique error types with their total count and frequency trend, not thousands of individual occurrences.",
  },
  {
    question: "Does error tracking impact performance?",
    answer:
      "No. Error tracking hooks into the browser's built-in error handling APIs which have negligible overhead. No additional network requests are made until an error actually occurs.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description: "Watch the user session where an error occurred.",
  },
  {
    title: "Web Vitals",
    href: "/features/web-vitals",
    description: "Monitor performance alongside error rates.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track custom error events with additional context.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "See how errors correlate with traffic and behavior.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "Identify which users are affected by specific errors.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Track whether errors are impacting conversion rates.",
  },
];
