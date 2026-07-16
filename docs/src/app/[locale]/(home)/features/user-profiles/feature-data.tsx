import {
  Clock,
  Code,
  Database,
  Headset,
  History,
  List,
  Lock,
  Rocket,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  TrendingUp,
  UserCheck,
  UserPlus,
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
    icon: <UserCheck className="w-5 h-5" />,
    title: "User identification",
    description:
      "Identify users by calling rybbit.identify(). Link anonymous sessions to known users when they log in or sign up.",
  },
  {
    icon: <History className="w-5 h-5" />,
    title: "Full activity timeline",
    description:
      "See every session, pageview, and event for each identified user. Understand their complete journey from first visit to present.",
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: "Custom traits & properties",
    description:
      "Attach custom properties to users — plan type, company, role, or any attribute. Browse and filter by traits in the explorer.",
  },
  {
    icon: <UserPlus className="w-5 h-5" />,
    title: "Anonymous-to-identified merge",
    description:
      "When an anonymous visitor signs up, their previous anonymous sessions are linked to their new identified profile automatically.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "First seen & last seen",
    description:
      "See when each user first visited and when they were last active. Understand engagement frequency at a glance.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Traits explorer",
    description:
      "Browse all user traits and their values. See how many users have each trait value and drill into specific segments.",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Privacy-first design",
    description:
      "You choose what data to collect. No fingerprinting, no cross-site tracking. Users are only identified when you explicitly call identify().",
  },
  {
    icon: <List className="w-5 h-5" />,
    title: "Session history",
    description:
      "View all sessions for a specific user with duration, pageview count, and event count. Jump into session replay for any session.",
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: "API access",
    description:
      "Query user data programmatically via the API. Build custom dashboards or sync user traits with other tools.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Track events normally",
    description:
      "Rybbit tracks pageviews and events automatically. Anonymous visitors are tracked with privacy-friendly session identifiers.",
  },
  {
    step: 2,
    title: "Call identify() on login or signup",
    description:
      "When a user logs in or signs up, call rybbit.identify({ userId: 'user-123', traits: { plan: 'pro' } }). Previous anonymous sessions are automatically linked.",
  },
  {
    step: 3,
    title: "Browse user profiles",
    description:
      "Navigate to Users in your dashboard. Browse identified users, view their activity timeline, and explore their custom traits.",
  },
  {
    step: 4,
    title: "Explore traits and segments",
    description:
      "Use the Traits explorer to see trait distributions across your user base. Filter by trait values to find specific user segments.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Headset className="w-6 h-6" />,
    title: "Support teams",
    description:
      "Look up a user's complete activity history when they reach out. See their sessions, events, and any errors — without asking them to reproduce the issue.",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "Sales teams",
    description:
      "See a prospect's engagement history before a call. Know which pages they visited, which features they explored, and how active they've been.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Product managers",
    description:
      "Understand how power users behave differently from casual users. Use custom traits to segment users by plan, role, or company.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Customer success teams",
    description:
      "Monitor user engagement over time. Identify users who are becoming less active and reach out before they churn.",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Developers",
    description:
      "Simple identify() API with no complex configuration. Attach any properties you want, and they're instantly available in the dashboard.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "Know your early users by name. See exactly how your first customers use your product and what drives them to come back.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "What happens before a user is identified?",
    answer:
      "Before calling identify(), visitors are tracked anonymously using privacy-friendly session identifiers. Once you call identify(), their previous anonymous sessions are linked to their new identified profile.",
  },
  {
    question: "Is user identification GDPR-compliant?",
    answer:
      "Yes. User identification in Rybbit is opt-in — you control exactly when and what data is attached to a user profile. No fingerprinting or cross-site tracking is used. You choose what personal data (if any) to include.",
  },
  {
    question: "How is this different from Google Analytics user tracking?",
    answer:
      "Google Analytics uses cookies and cross-site tracking by default. Rybbit only identifies users when you explicitly call identify() with the data you choose to send. There's no passive surveillance or third-party data sharing.",
  },
  {
    question: "Can I attach custom properties to users?",
    answer:
      "Yes. Pass any key-value pairs as traits when calling identify(). These appear in the user's profile and are available in the Traits explorer for filtering and analysis.",
  },
  {
    question: "Do I need to identify every user?",
    answer:
      "No. Identification is optional and entirely up to you. Unidentified visitors are still tracked anonymously in your analytics. Only identify users when you need to tie analytics data to specific individuals.",
  },
  {
    question: "Can I see a user's session replays?",
    answer:
      "Yes. Each user profile shows their session history, and you can jump directly into session replay for any session. This gives you full context on what each user experienced.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description: "Watch specific user sessions from their profile.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "See all events fired by each identified user.",
  },
  {
    title: "Retention",
    href: "/features/retention",
    description: "Measure how identified users retain over time.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "See which users complete or drop out of your funnels.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full dashboard powering your user-level data.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Track which identified users complete your goals.",
  },
];
