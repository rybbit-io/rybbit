"use client";

import { useExtracted } from "next-intl";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Braces,
  Building2,
  Funnel,
  Gauge,
  Heart,
  Map,
  MousePointerClick,
  Newspaper,
  Plug,
  Rewind,
  Route,
  Server,
  Share2,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

export interface HeaderNavLink {
  href: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface HeaderNavGroup {
  label: string;
  links: HeaderNavLink[];
}

export function useHeaderNav() {
  const t = useExtracted();

  const features: HeaderNavLink[] = [
    {
      href: "/features/web-analytics",
      label: t("Web Analytics"),
      description: t("Traffic, sources, and realtime insights"),
      icon: TrendingUp,
    },
    {
      href: "/features/session-replay",
      label: t("Session Replay"),
      description: t("Watch real user sessions"),
      icon: Video,
    },
    {
      href: "/features/error-tracking",
      label: t("Error Tracking"),
      description: t("Catch JavaScript errors"),
      icon: AlertTriangle,
    },
    {
      href: "/features/funnels",
      label: t("Funnels"),
      description: t("See where users drop off"),
      icon: Funnel,
    },
    {
      href: "/features/goals",
      label: t("Goals"),
      description: t("Track the conversions that matter"),
      icon: Target,
    },
    {
      href: "/features/retention",
      label: t("Retention"),
      description: t("Measure returning visitors"),
      icon: UserCheck,
    },
    {
      href: "/features/user-journeys",
      label: t("User Journeys"),
      description: t("How visitors move through your site"),
      icon: Route,
    },
    {
      href: "/features/user-profiles",
      label: t("User Profiles"),
      description: t("Identify users and their traits"),
      icon: Users,
    },
    {
      href: "/features/custom-events",
      label: t("Custom Events"),
      description: t("Track any action you care about"),
      icon: MousePointerClick,
    },
    {
      href: "/features/sessions",
      label: t("Sessions"),
      description: t("Browse individual visits"),
      icon: Rewind,
    },
    {
      href: "/features/web-vitals",
      label: t("Web Vitals"),
      description: t("Monitor site performance"),
      icon: Gauge,
    },
    {
      href: "/features/bot-detection",
      label: t("Bot Detection"),
      description: t("Filter crawlers, scrapers, and AI agents"),
      icon: Bot,
    },
    {
      href: "/features/dashboard-sharing",
      label: t("Dashboard Sharing"),
      description: t("Public dashboards, links, and embeds"),
      icon: Share2,
    },
    {
      href: "/features/mcp",
      label: t("MCP Server"),
      description: t("Your analytics in your AI assistant"),
      icon: Plug,
    },
    {
      href: "/features/api",
      label: t("Analytics API"),
      description: t("Query and ingest data with REST"),
      icon: Braces,
    },
  ];

  const useCases: HeaderNavGroup = {
    label: t("By use case"),
    links: [
      { href: "/for-saas", label: t("SaaS") },
      { href: "/for-startups", label: t("Startups") },
      { href: "/for-small-business", label: t("Small businesses") },
      { href: "/for-ecommerce", label: t("Ecommerce") },
      { href: "/for-creators", label: t("Creators") },
      { href: "/for-developers", label: t("Developers") },
      { href: "/for-agencies", label: t("Agencies") },
      { href: "/white-label", label: t("White label") },
      { href: "/for-european-companies", label: t("European companies") },
    ],
  };

  const compare: HeaderNavGroup = {
    label: t("Compare"),
    links: [
      { href: "/compare/google-analytics", label: t("vs. Google Analytics") },
      { href: "/compare/plausible", label: t("vs. Plausible") },
      { href: "/compare/posthog", label: t("vs. PostHog") },
      { href: "/compare/matomo", label: t("vs. Matomo") },
    ],
  };

  const resources: HeaderNavLink[] = [
    { href: "/docs", label: t("Getting started"), icon: BookOpen },
    { href: "/docs/self-hosting", label: t("Self-hosting"), icon: Server },
    { href: "/docs/roadmap", label: t("Roadmap"), icon: Map },
    { href: "/blog", label: t("Blog"), icon: Newspaper },
    { href: "/tools", label: t("Free tools"), icon: Wrench },
    { href: "/enterprise", label: t("Enterprise"), icon: Building2 },
    { href: "/sponsors", label: t("Sponsors"), icon: Heart },
  ];

  return {
    labels: {
      features: t("Features"),
      solutions: t("Solutions"),
      resources: t("Resources"),
      pricing: t("Pricing"),
      docs: t("Docs"),
      allFeatures: t("All features"),
      allComparisons: t("All comparisons"),
      oneScript: t("Everything one script captures"),
    },
    features,
    useCases,
    compare,
    resources,
  };
}
