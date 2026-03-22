import {
  Clock,
  Eye,
  Filter,
  Headset,
  List,
  MapPin,
  MousePointerClick,
  Rocket,
  Search,
  Settings,
  Smartphone,
  Target,
  TrendingUp,
  UserCheck,
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
    icon: <List className="w-5 h-5" />,
    title: "Rich session cards",
    description:
      "Each session displays the user, country, browser, OS, device type, entry and exit pages, duration, pageview count, and event count — all at a glance.",
  },
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Click-to-filter everything",
    description:
      "Click any country flag, browser icon, device type, or page path in a session card to instantly filter down to matching sessions.",
  },
  {
    icon: <UserCheck className="w-5 h-5" />,
    title: "Identified users toggle",
    description:
      "Filter to show only sessions from identified users. See which named users are active and what they're doing on your site.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Min pageviews, events & duration",
    description:
      "Set minimum thresholds to find sessions with high engagement. Filter out bounces and focus on users who actually explored your product.",
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Expandable event timeline",
    description:
      "Click any session to expand a full chronological timeline of every pageview, custom event, button click, form submission, and outbound link.",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "Full device & source context",
    description:
      "See browser version, OS version, screen resolution, IP, referrer, channel, UTM parameters, and language for each session.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Jump to session replay",
    description:
      "Sessions with replay data show a green video badge. Click it to instantly open the full session replay in a side drawer.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Geographic detail",
    description:
      "See the country, region, and city for each session. Click the flag to filter all sessions from that location.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Pagination for large datasets",
    description:
      "Browse 100 sessions per page with forward/back pagination. Works across any date range with all filters applied.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Sessions are tracked automatically",
    description:
      "Every visitor session is recorded with full metadata — device, location, referrer, pages visited, events fired, and duration. No extra configuration needed.",
  },
  {
    step: 2,
    title: "Open the Sessions page",
    description:
      "Navigate to Sessions in your dashboard. You'll see a paginated list of individual sessions with rich metadata cards.",
  },
  {
    step: 3,
    title: "Filter and explore",
    description:
      "Toggle 'Identified only' to focus on known users. Set minimum thresholds for pageviews, events, or duration. Click any attribute to filter.",
  },
  {
    step: 4,
    title: "Expand for full detail",
    description:
      "Click any session to see its complete event timeline — every pageview, click, form submission, and custom event in chronological order. Jump to replay for sessions that have it.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Headset className="w-6 h-6" />,
    title: "Support teams",
    description:
      "Look up a specific user's sessions when they report an issue. See their exact path, the events they triggered, and their device context — without asking them to describe it.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Product teams",
    description:
      "Browse sessions with high engagement to understand power user behavior. Filter by minimum pageviews or events to find users who explored deeply.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Growth teams",
    description:
      "Analyze sessions from specific campaigns by filtering on UTM parameters. See what users from each source actually do after landing.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Customer success teams",
    description:
      "Monitor identified user sessions over time. Spot users who are becoming less active and understand their recent behavior patterns.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "Manually review your earliest user sessions to build intuition about how people discover and use your product. Better than any survey.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "QA & engineering",
    description:
      "Inspect the event timeline of sessions that triggered errors. See the exact sequence of actions leading up to a problem.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "What's the difference between Sessions and Session Replay?",
    answer:
      "Sessions is an analytical browser — it shows structured data about each session: metadata, metrics, and a chronological event timeline. Session Replay is a visual recording that lets you watch the actual screen interactions. Think of Sessions as the spreadsheet view and Replay as the video view. They complement each other — you can jump from a session card directly into its replay.",
  },
  {
    question: "Do I need to set up anything for session tracking?",
    answer:
      "No. Sessions are tracked automatically as soon as you install the Rybbit script. Every visitor session records device info, location, referrer, pages visited, and events fired without any extra configuration.",
  },
  {
    question: "Can I filter sessions by identified users only?",
    answer:
      "Yes. Toggle the 'Identified only' switch to show only sessions from users you've identified with rybbit.identify(). This is great for support and customer success workflows where you need to find a specific person's sessions.",
  },
  {
    question: "What does the event timeline show?",
    answer:
      "The expanded timeline shows every event in chronological order: pageviews, custom events, button clicks, form submissions, input changes, outbound link clicks, and copies. Each event shows its relative time offset from the next event, giving you a complete picture of the session flow.",
  },
  {
    question: "How many sessions can I browse?",
    answer:
      "Sessions are paginated at 100 per page. You can navigate forward and back through your full session history with all filters applied. There's no limit on the total number of sessions stored.",
  },
  {
    question: "Can I jump from a session to its replay?",
    answer:
      "Yes. Sessions that have replay data display a green video badge. Click it to open the full session replay in a side drawer without leaving the sessions list.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description:
      "Watch the visual recording of any session you find in the list.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description:
      "See the full history and traits of identified users across sessions.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description:
      "Track the interactions that appear in each session's event timeline.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description:
      "Find where users drop off, then browse their sessions to understand why.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description:
      "The aggregate dashboard that summarizes all your session data.",
  },
  {
    title: "Error Tracking",
    href: "/features/error-tracking",
    description:
      "Find error-affected sessions and inspect their event timeline.",
  },
];
