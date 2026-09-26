import type { OtherAlternative } from "./ComparisonPage";

// One-line summaries for the "Other X alternatives" sections. Keep each claim in line with
// that competitor's comparison-data.tsx (vendor-verified), and update both together.
export const competitorSummaries = {
  "google-analytics": {
    name: "Google Analytics 4",
    href: "/compare/google-analytics",
    summary:
      "Free and deep, but it sets cookies (so EU visitors need a consent banner), has no session replay, and GA4 reports take real effort to learn.",
  },
  plausible: {
    name: "Plausible",
    href: "/compare/plausible",
    summary:
      "Open source and cookieless with a clean single-page dashboard. No session replay, error tracking, or Web Vitals, and funnels need its Business plan.",
  },
  umami: {
    name: "Umami",
    href: "/compare/umami",
    summary:
      "MIT-licensed with a ~2KB script and a free cloud tier for hobby sites. Funnels and journeys are included; session replay, error tracking, and Web Vitals are not.",
  },
  fathom: {
    name: "Fathom",
    href: "/compare/fathom",
    summary:
      "Polished and cookieless with a tiny script, but closed source and cloud-only, with no funnels, session replay, or free tier.",
  },
  simpleanalytics: {
    name: "Simple Analytics",
    href: "/compare/simpleanalytics",
    summary:
      "Privacy-first with a free tier for hobby sites, but closed source and cloud-only, with no funnels or session replay.",
  },
  matomo: {
    name: "Matomo",
    href: "/compare/matomo",
    summary:
      "The veteran open-source suite with GA-style depth, including session recordings. Self-hosting means maintaining PHP and MySQL, and many features are paid plugins.",
  },
  posthog: {
    name: "PostHog",
    href: "/compare/posthog",
    summary:
      "A product suite with analytics, session replay, error tracking, and feature flags, plus a generous free tier. Each product bills separately, and self-hosting is hard.",
  },
  "cloudflare-analytics": {
    name: "Cloudflare Web Analytics",
    href: "/compare/cloudflare-analytics",
    summary:
      "Free and cookieless, but it samples data, keeps six months of history, and has no custom events, goals, or funnels.",
  },
} satisfies Record<string, OtherAlternative>;

export type CompetitorSlug = keyof typeof competitorSummaries;

export function pickAlternatives(slugs: CompetitorSlug[]): OtherAlternative[] {
  return slugs.map(slug => competitorSummaries[slug]);
}
