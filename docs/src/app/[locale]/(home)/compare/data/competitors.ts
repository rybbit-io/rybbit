import { STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "@/lib/const";

// Single source of truth for competitor facts on rybbit.com. Comparison hubs, "X vs Y" pages,
// alternatives lists, and future listicles read from here instead of restating facts by hand.
//
// Provenance rules:
// - `features` for the eight competitors mirror the feature tables in each
//   compare/<slug>/comparison-data.tsx, except where a comment cites a newer vendor source.
//   A feature those tables don't cover stays `undefined` ("not documented"): never fill a gap
//   from memory. Change a value only with a vendor source, and update that page's table too.
// - `pricing` is re-checked against `sourceUrl` on the `verifiedOn` date. Re-verify and bump the
//   date whenever a price or plan changes.
// - The Rybbit entry comes from the repo: components/PricingSection.tsx, lib/const.ts,
//   LICENSE.md, and content/docs (data-import, script, proxy-guide).

export type FeatureValue = boolean | string | undefined;

export const featureGroups = {
  analytics: "Analytics features",
  advanced: "Advanced features",
  privacy: "Privacy & ownership",
  technical: "Technical",
  switching: "Switching to Rybbit",
} as const;

export type FeatureGroup = keyof typeof featureGroups;

// The one canonical feature list every entry is scored against. Adding a feature here is a type
// error until every entry sets it (to `undefined` if the source doesn't cover it).
export const canonicalFeatures = [
  { key: "realtime", label: "Real-time analytics", group: "analytics" },
  { key: "customEvents", label: "Custom events", group: "analytics" },
  { key: "funnels", label: "Funnels", group: "analytics" },
  { key: "userJourneys", label: "User journeys", group: "analytics" },
  { key: "goals", label: "Conversion goals", group: "analytics" },
  { key: "savedSegments", label: "Saved segments", group: "analytics" },
  { key: "utmTracking", label: "UTM tracking", group: "analytics" },
  { key: "publicDashboards", label: "Public dashboards", group: "analytics" },
  { key: "sessionReplay", label: "Session replay", group: "advanced" },
  { key: "heatmaps", label: "Heatmaps", group: "advanced" },
  { key: "userProfiles", label: "User profiles", group: "advanced" },
  { key: "webVitals", label: "Web Vitals monitoring", group: "advanced" },
  { key: "errorTracking", label: "Error tracking", group: "advanced" },
  { key: "globeView", label: "Real-time globe view", group: "advanced" },
  { key: "autocapture", label: "Autocapture", group: "advanced" },
  { key: "cookieFree", label: "Cookie-free tracking", group: "privacy" },
  { key: "noPersonalData", label: "No personal data collection", group: "privacy" },
  { key: "dailyRotatingSalt", label: "Daily rotating salt", group: "privacy" },
  { key: "openSource", label: "Open source", group: "privacy" },
  { key: "selfHostable", label: "Self-hostable", group: "privacy" },
  { key: "scriptSize", label: "Script size", group: "technical" },
  { key: "bypassesAdBlockers", label: "Bypasses ad blockers", group: "technical" },
  { key: "apiAccess", label: "API access", group: "technical" },
  // Whether Rybbit's importer can bring this tool's history over (see /docs/data-import).
  { key: "dataImportIntoRybbit", label: "Rybbit can import its history", group: "switching" },
] as const satisfies readonly { key: string; label: string; group: FeatureGroup }[];

export type FeatureKey = (typeof canonicalFeatures)[number]["key"];

// Every key is required; `undefined` means "not documented".
export type FeatureMap = Record<FeatureKey, FeatureValue>;

export type CompetitorCategory = "web-analytics" | "product-analytics" | "session-replay";

export interface PricingFacts {
  model: string;
  startingPrice: string;
  /** What the starting price covers, e.g. "100k events/month". */
  startingPriceIncludes?: string;
  /** A free hosted plan, or `false` if there is none. Free self-hosting belongs in `notes`. */
  freeTier: string | false;
  trial?: string;
  notes?: string[];
  sourceUrl: string;
  /** ISO date (YYYY-MM-DD) the pricing was last checked against `sourceUrl`. */
  verifiedOn: string;
}

export interface ProductEntry {
  slug: string;
  /** Display name used in headings, hub cards, and "X vs Y" titles. */
  name: string;
  /** Formal product name where it differs from `name` (used in alternatives lists). */
  fullName?: string;
  website: string;
  category: CompetitorCategory;
  license?: string;
  /** The Rybbit-vs-competitor page, if one exists. */
  comparePath?: string;
  /** One-line trade-off summary for "Other X alternatives" sections. */
  summary: string;
  /** Card text on the /compare hub. Entries without it don't appear on the hub. */
  hubDescription?: string;
  pricing: PricingFacts;
  features: FeatureMap;
}

// Key order is the /compare hub order.
export const competitors = {
  "google-analytics": {
    slug: "google-analytics",
    name: "Google Analytics",
    fullName: "Google Analytics 4",
    website: "https://marketingplatform.google.com/about/analytics/",
    category: "web-analytics",
    comparePath: "/compare/google-analytics",
    summary:
      "Free and deep, but it sets cookies (so EU visitors need a consent banner), has no session replay, and GA4 reports take real effort to learn.",
    hubDescription: "Privacy-first alternative to the most popular analytics platform",
    pricing: {
      model: "Free; Analytics 360 is the paid enterprise tier",
      startingPrice: "Free",
      freeTier: "Standard GA4 is free of charge",
      notes: [
        "Analytics 360 has no public price; Google sells it through its sales team",
        "Standard properties keep event data for explorations for 2 or 14 months",
      ],
      sourceUrl: "https://marketingplatform.google.com/about/analytics/",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: true,
      funnels: true,
      userJourneys: true,
      goals: true,
      savedSegments: "Explorations only",
      utmTracking: true,
      publicDashboards: false,
      sessionReplay: false,
      heatmaps: undefined,
      userProfiles: false,
      webVitals: true,
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: false,
      noPersonalData: false,
      dailyRotatingSalt: false,
      openSource: false,
      selfHostable: false,
      scriptSize: "371KB",
      bypassesAdBlockers: false,
      apiAccess: true,
      dataImportIntoRybbit: false,
    },
  },
  plausible: {
    slug: "plausible",
    name: "Plausible",
    website: "https://plausible.io",
    category: "web-analytics",
    comparePath: "/compare/plausible",
    summary:
      "Open source and cookieless with a clean single-page dashboard. No session replay, error tracking, or Web Vitals, and funnels need its Business plan.",
    hubDescription: "More features with the same privacy-first approach",
    pricing: {
      model: "Pageview-based pricing",
      startingPrice: "$9/mo",
      startingPriceIncludes: "10k pageviews/month, 1 site",
      freeTier: false,
      trial: "30-day free trial, no credit card",
      notes: [
        "Funnels, journeys, and the Stats API need the $19/mo Business plan",
        "Self-hosted Community Edition is free",
      ],
      sourceUrl: "https://plausible.io/#pricing",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: "Basic",
      funnels: "Business plan only",
      userJourneys: "Business plan only",
      goals: true,
      savedSegments: true,
      utmTracking: true,
      publicDashboards: true,
      sessionReplay: false,
      heatmaps: undefined,
      userProfiles: false,
      webVitals: false,
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: true,
      noPersonalData: true,
      dailyRotatingSalt: false,
      openSource: true,
      selfHostable: true,
      scriptSize: "~5KB",
      bypassesAdBlockers: true,
      apiAccess: "Business plan only",
      dataImportIntoRybbit: true,
    },
  },
  posthog: {
    slug: "posthog",
    name: "PostHog",
    website: "https://posthog.com",
    category: "product-analytics",
    comparePath: "/compare/posthog",
    summary:
      "A product suite with analytics, session replay, error tracking, and feature flags, plus a generous free tier. Each product bills separately, and self-hosting is hard.",
    hubDescription: "Focused web analytics vs a full product suite",
    pricing: {
      model: "Usage-based, billed per product",
      startingPrice: "Free",
      startingPriceIncludes: "1M product analytics events/month",
      freeTier: "1M product analytics events/month free, no credit card",
      notes: [
        "Session replay, feature flags, and surveys each have their own free allowance and bill",
        "Paid product analytics starts at $0.00005/event (1–2M events)",
      ],
      sourceUrl: "https://posthog.com/pricing",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: "With properties",
      funnels: true,
      userJourneys: true,
      goals: true,
      savedSegments: "Cohorts",
      utmTracking: true,
      publicDashboards: true,
      sessionReplay: true,
      heatmaps: undefined,
      userProfiles: true,
      webVitals: true,
      errorTracking: true,
      globeView: false,
      autocapture: true,
      cookieFree: "Optional",
      noPersonalData: false,
      dailyRotatingSalt: false,
      openSource: true,
      selfHostable: "Very difficult",
      scriptSize: "~60KB",
      bypassesAdBlockers: "With proxy",
      apiAccess: true,
      dataImportIntoRybbit: false,
    },
  },
  umami: {
    slug: "umami",
    name: "Umami",
    website: "https://umami.is",
    category: "web-analytics",
    license: "MIT",
    comparePath: "/compare/umami",
    summary:
      "MIT-licensed with a ~2KB script and a free cloud tier for hobby sites. Funnels, journeys, session replay, heatmaps, and Web Vitals are included; error tracking is not.",
    hubDescription: "Advanced features on top of open-source simplicity",
    pricing: {
      model: "Free tier + paid cloud",
      startingPrice: "Free",
      startingPriceIncludes: "Hobby plan: 100k events/month, 1 website",
      freeTier: "Hobby cloud plan is free (100k events/month, 1 website)",
      trial: "14-day free trial on paid plans",
      notes: ["Pro plan at $20/mo for 1M events", "Self-hosted version is free (MIT)"],
      sourceUrl: "https://umami.is/pricing",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: "With properties",
      funnels: true,
      userJourneys: true,
      goals: true,
      savedSegments: true,
      utmTracking: true,
      publicDashboards: true,
      // Newer than /compare/umami (which still says no). Verified 2026-09-27, all opt-in:
      // docs.umami.is/docs/replays (v3.1.0), docs.umami.is/docs/heatmaps (v3.2.0),
      // docs.umami.is/docs/performance (LCP, INP, CLS, FCP, TTFB; v3.1.0).
      sessionReplay: "Yes (v3.1+)",
      heatmaps: "Click & scroll (v3.2+)",
      userProfiles: true,
      webVitals: "Yes (v3.1+)",
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: true,
      noPersonalData: true,
      dailyRotatingSalt: false,
      openSource: true,
      selfHostable: true,
      scriptSize: "~2KB",
      bypassesAdBlockers: true,
      apiAccess: true,
      dataImportIntoRybbit: true,
    },
  },
  fathom: {
    slug: "fathom",
    name: "Fathom",
    website: "https://usefathom.com",
    category: "web-analytics",
    comparePath: "/compare/fathom",
    summary:
      "Polished and cookieless with a tiny script, but closed source and cloud-only, with no funnels, session replay, or free tier.",
    hubDescription: "Open-source transparency with deeper analytics",
    pricing: {
      model: "Pageview-based pricing",
      startingPrice: "$15/mo",
      startingPriceIncludes: "100k pageviews/month",
      freeTier: false,
      trial: "7-day free trial, card required",
      notes: ["All features included on every plan", "Every plan includes at least 50 sites"],
      sourceUrl: "https://usefathom.com/pricing",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: "Basic",
      funnels: false,
      userJourneys: false,
      goals: true,
      savedSegments: true,
      utmTracking: true,
      publicDashboards: true,
      sessionReplay: false,
      heatmaps: undefined,
      userProfiles: false,
      webVitals: false,
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: true,
      noPersonalData: true,
      dailyRotatingSalt: false,
      openSource: false,
      selfHostable: false,
      scriptSize: "~2KB",
      bypassesAdBlockers: true,
      apiAccess: true,
      dataImportIntoRybbit: false,
    },
  },
  simpleanalytics: {
    slug: "simpleanalytics",
    name: "Simple Analytics",
    website: "https://www.simpleanalytics.com",
    category: "web-analytics",
    comparePath: "/compare/simpleanalytics",
    summary:
      "Privacy-first with a free tier for hobby sites, but closed source and cloud-only, with no funnels or session replay.",
    hubDescription: "Feature-rich analytics without sacrificing privacy",
    pricing: {
      model: "Per-user + pageview pricing",
      startingPrice: "$20/mo",
      startingPriceIncludes: "1 user, from 100k pageviews/month",
      freeTier: "Free plan for hobby sites: 1 user, 5 websites, 1 month of history",
      trial: "14-day free trial, no credit card",
      notes: ["Each extra team member is +$20/mo", "Cloud-only, no self-hosting option"],
      sourceUrl: "https://www.simpleanalytics.com/pricing",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: "Basic",
      funnels: false,
      userJourneys: false,
      goals: true,
      savedSegments: false,
      utmTracking: true,
      publicDashboards: true,
      sessionReplay: false,
      heatmaps: undefined,
      userProfiles: false,
      webVitals: false,
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: true,
      noPersonalData: true,
      dailyRotatingSalt: false,
      openSource: false,
      selfHostable: false,
      scriptSize: "~6KB",
      bypassesAdBlockers: true,
      apiAccess: true,
      dataImportIntoRybbit: true,
    },
  },
  matomo: {
    slug: "matomo",
    name: "Matomo",
    website: "https://matomo.org",
    category: "web-analytics",
    comparePath: "/compare/matomo",
    summary:
      "The veteran open-source suite with GA-style depth, including session recordings. Self-hosting means maintaining PHP and MySQL, and many features are paid plugins.",
    hubDescription: "Modern alternative to the legacy PHP analytics platform",
    pricing: {
      model: "Hit-based pricing (Cloud)",
      // matomo.org prices Cloud in the visitor's currency; this is the US price. The "€29" on
      // /compare/matomo matches a placeholder in matomo.org's static HTML that its pricing
      // script replaces with the local price, so it couldn't be verified.
      startingPrice: "$26/mo",
      startingPriceIncludes: "50,000 hits/month (US pricing)",
      freeTier: false,
      trial: "21-day free Cloud trial, no credit card",
      notes: [
        "On-Premise edition is free forever (GPL), with unlimited users and hits",
        "On-Premise premium features are paid plugins, sold individually or in bundles",
        "2 months free with annual Cloud billing",
      ],
      sourceUrl: "https://matomo.org/pricing/",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: true,
      funnels: true,
      userJourneys: false,
      goals: true,
      savedSegments: true,
      utmTracking: true,
      publicDashboards: false,
      sessionReplay: true,
      heatmaps: undefined,
      userProfiles: true,
      webVitals: false,
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: "Optional",
      noPersonalData: false,
      dailyRotatingSalt: false,
      openSource: true,
      selfHostable: true,
      scriptSize: "20-50KB",
      bypassesAdBlockers: false,
      apiAccess: true,
      dataImportIntoRybbit: false,
    },
  },
  "cloudflare-analytics": {
    slug: "cloudflare-analytics",
    name: "Cloudflare Analytics",
    fullName: "Cloudflare Web Analytics",
    website: "https://www.cloudflare.com/web-analytics/",
    category: "web-analytics",
    comparePath: "/compare/cloudflare-analytics",
    summary:
      "Free and cookieless, but it samples data, keeps six months of history, and has no custom events, goals, or funnels.",
    hubDescription: "Full-featured analytics beyond basic traffic metrics",
    pricing: {
      model: "Free",
      startingPrice: "Free",
      freeTier: "Free, with or without Cloudflare's proxy",
      notes: ["The dashboard covers the previous six months of data"],
      sourceUrl: "https://www.cloudflare.com/web-analytics/",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: false,
      funnels: false,
      userJourneys: false,
      goals: false,
      savedSegments: false,
      utmTracking: false,
      publicDashboards: false,
      sessionReplay: false,
      heatmaps: undefined,
      userProfiles: false,
      webVitals: true,
      errorTracking: false,
      globeView: false,
      autocapture: false,
      cookieFree: true,
      noPersonalData: true,
      dailyRotatingSalt: false,
      openSource: false,
      selfHostable: false,
      scriptSize: "N/A",
      bypassesAdBlockers: false,
      apiAccess: false,
      dataImportIntoRybbit: false,
    },
  },
  rybbit: {
    slug: "rybbit",
    name: "Rybbit",
    website: "https://rybbit.com",
    category: "web-analytics",
    license: "AGPL-3.0",
    summary:
      "Open source (AGPL-3.0) and cookieless, with funnels, journeys, error tracking, and Web Vitals on every plan and session replay on Pro.",
    pricing: {
      model: "Events-based pricing",
      // Prices mirror getFormattedPrice() in components/PricingSection.tsx.
      startingPrice: "$19/mo",
      startingPriceIncludes: "100k events/month",
      freeTier: false,
      trial: "7-day free trial; a card is collected at signup and nothing is charged until the trial ends",
      notes: [
        `Standard: up to ${STANDARD_SITE_LIMIT} sites and ${STANDARD_TEAM_LIMIT} team members, 3-year data retention`,
        "Pro from $39/mo adds session replay, 5-year data retention, and unlimited sites and team members",
        // Replay quota: limits.replays in server/src/lib/const.ts (10% of the event allowance).
        "Session replays are capped at 10% of the monthly event allowance (10,000 on the 100k tier)",
        "4 months free with annual billing",
        "Self-hosting is free (AGPL-3.0)",
      ],
      sourceUrl: "https://rybbit.com/pricing",
      verifiedOn: "2026-09-27",
    },
    features: {
      realtime: true,
      customEvents: true,
      funnels: true,
      userJourneys: true,
      goals: true,
      savedSegments: true,
      utmTracking: true,
      publicDashboards: true,
      sessionReplay: "Pro plan",
      heatmaps: false,
      userProfiles: true,
      webVitals: true,
      errorTracking: true,
      globeView: true,
      autocapture: true,
      cookieFree: true,
      noPersonalData: true,
      // Per-site setting (saltUserIds), off by default.
      dailyRotatingSalt: "Optional",
      openSource: true,
      selfHostable: true,
      scriptSize: "~18KB",
      // The script can be proxied through your own domain (/docs/proxy-guide).
      bypassesAdBlockers: "With proxy",
      apiAccess: true,
      dataImportIntoRybbit: undefined,
    },
  },
} satisfies Record<string, ProductEntry>;

export type ProductSlug = keyof typeof competitors;
export type CompetitorSlug = Exclude<ProductSlug, "rybbit">;

export const rybbit: ProductEntry = competitors.rybbit;

/** Competitors in hub order (every registry entry except Rybbit). */
export const competitorEntries: ProductEntry[] = Object.values(competitors).filter(entry => entry.slug !== "rybbit");

/** Competitors with a Rybbit-vs-X page, in hub order. */
export const comparedCompetitors = competitorEntries.filter(
  (entry): entry is ProductEntry & { comparePath: string } => entry.comparePath !== undefined
);

/** Competitors whose history Rybbit can import. */
export const importableCompetitors = competitorEntries.filter(entry => entry.features.dataImportIntoRybbit === true);
