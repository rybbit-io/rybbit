import {
  competitors,
  rybbit,
  type CompetitorSlug,
  type FeatureGroup,
  type FeatureKey,
  type FeatureValue,
} from "./competitors";

// Allowlist of "X vs Y" pages served at /compare/<slug>. Registry facts (feature table,
// pricing, names) come from ./competitors.ts; everything here is pair-specific copy. Every
// factual claim in a pair must be backed by a vendor page listed in its `sources`, checked on
// `verifiedOn`. Leave out anything you can't verify.

export interface VsExtraRow {
  label: string;
  group: FeatureGroup;
  /** Place the row after this canonical feature; otherwise it goes at the end of its group. */
  after?: FeatureKey;
  a: FeatureValue;
  b: FeatureValue;
  /** Rybbit's value; read it from the registry where one exists. */
  rybbit?: FeatureValue;
  /** Vendor pages that back the `a` and `b` values (they must also appear in `sources`). */
  sources: string[];
}

export interface VsFaqItem {
  question: string;
  answer: string;
}

export interface VsLink {
  title: string;
  href: string;
  description: string;
}

export interface VsSource {
  label: string;
  url: string;
}

export interface VsPair {
  slug: string;
  a: CompetitorSlug;
  b: CompetitorSlug;
  /** Page <title> before the " | Rybbit" suffix. At most 62 characters. */
  title: string;
  /** At most 160 characters. */
  metaDescription: string;
  /** One line for the /compare hub. */
  hubDescription: string;
  intro: string;
  /** `bestFor` completes the phrase "Best for …". */
  verdict: {
    summary: string;
    a: { bestFor: string; reason: string };
    b: { bestFor: string; reason: string };
  };
  chooseA: string[];
  chooseB: string[];
  /** Registry features shown in the table. Omit a feature when a vendor page contradicts the registry. */
  features: FeatureKey[];
  extraRows?: VsExtraRow[];
  tableNotes?: string[];
  /** Adds a "Rybbit (our product)" column to the feature table. */
  showRybbitColumn?: boolean;
  faq: VsFaqItem[];
  relatedPosts: VsLink[];
  sources: VsSource[];
  /** ISO date (YYYY-MM-DD) the pair copy was last checked against `sources`. */
  verifiedOn: string;
}

const MAX_TITLE_LENGTH = 62;
const MAX_DESCRIPTION_LENGTH = 160;

export const vsPairs: VsPair[] = [
  {
    slug: "matomo-vs-google-analytics",
    a: "matomo",
    b: "google-analytics",
    title: "Matomo vs Google Analytics: Privacy, Price, Features",
    metaDescription:
      "Matomo vs Google Analytics 4, with sources: self-hosting, cookies and consent, data sampling and retention, heatmaps, and what each costs in 2026.",
    hubDescription: "Unsampled, self-hostable analytics vs free GA4 with Google Ads built in",
    intro:
      "Matomo is open-source analytics you can run on your own servers or buy as an EU-hosted cloud. Google Analytics 4 is free and connects natively to Google Ads. Here's how they compare on privacy, data limits, features, and price.",
    verdict: {
      summary:
        "Pick Matomo if you need to control where your analytics data lives. Pick Google Analytics if you advertise on Google and want analytics at no cost.",
      a: {
        bestFor: "data ownership",
        reason:
          "Free to self-host, no data sampling, and a cloud hosted in Frankfurt. Configured for it, Matomo can run without consent in some EU countries, and it offers heatmaps and session recordings.",
      },
      b: {
        bestFor: "Google Ads on a zero budget",
        reason:
          "Free of charge and linked natively to Google Ads. The cost is control: two-year cookies that need consent where the law requires it, sampling above 10 million events per query, and at most 14 months of exploration data.",
      },
    },
    chooseA: [
      "You want analytics on your own servers: the On-Premise edition is free, open source (GPL), and has no limits on users or hits.",
      "You want EU hosting without running servers: Matomo Cloud stores data in Frankfurt, Germany.",
      "You need unsampled reports and long history: Matomo doesn't sample data, and Cloud keeps raw data for 24 months and reports forever.",
      "You want heatmaps, session recordings, or A/B tests in the same tool: they're included in Cloud and sold as paid plugins On-Premise.",
      "You're leaving GA and want your history: the free Google Analytics Importer brings over GA4 and Universal Analytics reports (aggregated, not raw visits).",
      "You need analytics that can run without consent in France, Spain, Italy, or the Netherlands, and accept the privacy-focused setup that requires (unique-visitor counts get less accurate).",
    ],
    chooseB: [
      "You advertise on Google: linking GA4 to Google Ads lets you build Ads conversions from your key events and re-engage visitors based on what they did on your site.",
      "You need analytics at no cost: standard GA4 is free of charge, and only Analytics 360 is paid.",
      "You want raw events in BigQuery: standard properties can export 1 million events a day in daily exports, and streaming export has no event limit (BigQuery bills for storage and queries).",
      "Your team already works in GA4 explorations: funnel, path, cohort, and user lifetime analysis are built in.",
      "You're fine running a consent banner: GA4's cookies need consent where the law requires it, and consent mode models the visitors who decline.",
    ],
    features: [
      "realtime",
      "customEvents",
      "funnels",
      "goals",
      "utmTracking",
      "sessionReplay",
      "cookieFree",
      "openSource",
      "selfHostable",
      "apiAccess",
    ],
    // userJourneys is shown as "User flows" instead: the registry's Matomo value (false, from
    // /compare/matomo) is contradicted by Users Flow on matomo.org/pricing.
    extraRows: [
      {
        label: "User flows",
        group: "analytics",
        after: "funnels",
        a: "Users Flow",
        b: "Path exploration",
        rybbit: rybbit.features.userJourneys,
        sources: ["https://matomo.org/pricing/", "https://support.google.com/analytics/answer/7579450"],
      },
      {
        label: "Heatmaps",
        group: "advanced",
        after: "sessionReplay",
        a: "Click, move & scroll",
        b: false,
        rybbit: rybbit.features.heatmaps,
        sources: [
          "https://plugins.matomo.org/HeatmapSessionRecording",
          "https://support.google.com/analytics/answer/7579450",
        ],
      },
      {
        label: "Data sampling",
        group: "technical",
        a: "None",
        b: "Above 10M events per query",
        rybbit: "None",
        sources: ["https://matomo.org/pricing/", "https://support.google.com/analytics/answer/13331292"],
      },
      {
        label: "Data retention",
        group: "technical",
        a: "Cloud: raw data 24 months, reports forever. Self-hosted: no limit",
        b: "Explorations: 2 or 14 months (up to 50 on 360)",
        // From the Standard and Pro plan lists in components/PricingSection.tsx.
        rybbit: "3 years (Standard), 5 years (Pro)",
        sources: ["https://matomo.org/pricing/", "https://support.google.com/analytics/answer/7667196"],
      },
    ],
    tableNotes: [
      "Matomo Cloud includes funnels, Users Flow, heatmaps, session recordings, and A/B testing, with monthly allowances for heatmaps and recordings. On Matomo On-Premise, these are paid plugins.",
      "Google Analytics values are for standard (free) GA4 properties. Analytics 360 raises limits such as the sampling threshold and data retention.",
    ],
    showRybbitColumn: true,
    faq: [
      {
        question: "Is Matomo better than Google Analytics?",
        answer:
          "It depends on what you need more. Matomo gives you control: you can self-host it or use its Frankfurt-hosted cloud, it doesn't sample data, and it offers heatmaps and session recordings. Google Analytics 4 is free and links natively to Google Ads, but it relies on cookies that need consent where the law requires it, samples queries above 10 million events, and keeps exploration data for at most 14 months on free properties.",
      },
      {
        question: "Is Matomo free?",
        answer:
          "Matomo On-Premise is free forever with unlimited users and hits, and it's open source under the GPL. You pay for your own server, and premium features such as heatmaps, session recordings, funnels, and A/B testing are paid plugins. Matomo Cloud is paid: for US visitors it starts at $26 a month for 50,000 hits, after a 21-day free trial that doesn't need a credit card.",
      },
      {
        question: "Is Google Analytics free?",
        answer:
          "Yes. Google says Google Analytics gives you its tools free of charge. The paid tier, Analytics 360, has no public price; Google sells it through its sales team, with service-level agreements, unsampled results, and higher limits.",
      },
      {
        question: "Do Matomo and Google Analytics need a cookie consent banner?",
        answer:
          "GA4 sets first-party cookies that last two years by default, and Google's terms require you to get consent for them wherever the law requires it; with consent mode, tags send cookieless pings for visitors who decline and Google models the gap. Matomo also uses first-party cookies by default, but it can run without cookies or personal data, and Matomo says that setup can be exempt from consent in France, Spain, Italy, and the Netherlands. For stricter regimes such as Germany, Matomo recommends treating JavaScript tracking as requiring consent.",
      },
      {
        question: "Can I move my Google Analytics data into Matomo?",
        answer:
          "Yes. Matomo's Google Analytics Importer is free and imports both GA4 and Universal Analytics properties. It brings over aggregated reports, not raw visits, so Matomo's Visitor Log, Custom Reports, and segmentation don't work on the imported periods.",
      },
      {
        question: "Does Google Analytics sample data? Does Matomo?",
        answer:
          'GA4 may sample a report, exploration, or API request that covers more than 10 million events on a standard property; Analytics 360 starts at 100 million events per query and can go up to 1 billion. Matomo\'s pricing page lists "No data sampling" for every plan, Cloud and On-Premise.',
      },
      {
        question: "How long do Matomo and Google Analytics keep data?",
        answer:
          "Standard GA4 properties keep event-level data for 2 or 14 months, which limits explorations and funnel reports; standard aggregated reports aren't affected, and Analytics 360 allows up to 50 months. Matomo Cloud keeps raw data for 24 months and report data forever, and a self-hosted Matomo keeps whatever you store.",
      },
      {
        question: "Does Google Analytics have heatmaps or session recordings?",
        answer:
          "No. GA4's analysis tools are its reports and explorations (free form, funnel, path, segment overlap, cohort, user exploration, and user lifetime), with no heatmaps or recordings. Matomo has both: they're included in Matomo Cloud with monthly allowances (1,500 heatmap pageviews and 150 recordings at 50,000 hits) and are a paid plugin for On-Premise.",
      },
    ],
    relatedPosts: [
      {
        title: "How much does Google Analytics cost?",
        href: "/blog/google-analytics-pricing",
        description: "GA4's free limits, Analytics 360 pricing, and the hidden costs",
      },
      {
        title: "Best Google Analytics alternatives",
        href: "/blog/best-google-analytics-alternatives",
        description: "Nine GA4 alternatives compared on price, privacy, and features",
      },
    ],
    sources: [
      { label: "Matomo: Pricing (Cloud and On-Premise)", url: "https://matomo.org/pricing/" },
      { label: "Matomo: Cloud-hosted Matomo", url: "https://matomo.org/matomo-cloud/" },
      { label: "Matomo: How much does Matomo cost?", url: "https://matomo.org/faq/new-to-piwik/faq_145/" },
      {
        label: "Matomo: Using Matomo without consent or a cookie banner",
        url: "https://matomo.org/faq/new-to-piwik/how-do-i-use-matomo-analytics-without-consent-or-cookie-banner/",
      },
      {
        label: "Matomo: CNIL consent exemption",
        url: "https://matomo.org/faq/how-to/how-do-i-configure-matomo-without-tracking-consent-for-french-visitors-cnil-exemption/",
      },
      {
        label: "Matomo: Heatmap & Session Recording plugin",
        url: "https://plugins.matomo.org/HeatmapSessionRecording",
      },
      { label: "Matomo: Google Analytics Importer plugin", url: "https://plugins.matomo.org/GoogleAnalyticsImporter" },
      {
        label: "Matomo: Running the Google Analytics import",
        url: "https://matomo.org/faq/general/running-the-google-analytics-import/",
      },
      {
        label: "Matomo: Limitations of imported Google Analytics data",
        url: "https://matomo.org/faq/general/limitations-when-importing-google-analytics-data/",
      },
      { label: "Google: Google Analytics", url: "https://marketingplatform.google.com/about/analytics/" },
      { label: "Google: Analytics 360", url: "https://marketingplatform.google.com/about/analytics-360/" },
      {
        label: "Google: Analytics Terms of Service",
        url: "https://marketingplatform.google.com/about/analytics/terms/us/",
      },
      { label: "Google: Cookie usage on websites", url: "https://support.google.com/analytics/answer/11397207" },
      { label: "Google: Consent mode", url: "https://support.google.com/analytics/answer/9976101" },
      { label: "Google: About data sampling", url: "https://support.google.com/analytics/answer/13331292" },
      { label: "Google: Data retention", url: "https://support.google.com/analytics/answer/7667196" },
      { label: "Google: Get started with Explorations", url: "https://support.google.com/analytics/answer/7579450" },
      { label: "Google: Realtime report", url: "https://support.google.com/analytics/answer/9271392" },
      { label: "Google: Key events", url: "https://support.google.com/analytics/answer/13128484" },
      { label: "Google: Connect Google Ads to Analytics", url: "https://support.google.com/analytics/answer/9379420" },
      { label: "Google: Set up BigQuery Export", url: "https://support.google.com/analytics/answer/9823238" },
    ],
    verifiedOn: "2026-09-27",
  },
];

// Fail the build on copy that breaks the SERP limits or cites an unlisted source.
for (const pair of vsPairs) {
  const problems: string[] = [];
  if (!pair.slug.includes("-vs-")) problems.push("slug must contain -vs-");
  if (pair.a === pair.b) problems.push("a and b must differ");
  if (pair.title.length > MAX_TITLE_LENGTH)
    problems.push(`title is ${pair.title.length} chars (max ${MAX_TITLE_LENGTH})`);
  if (pair.metaDescription.length > MAX_DESCRIPTION_LENGTH) {
    problems.push(`meta description is ${pair.metaDescription.length} chars (max ${MAX_DESCRIPTION_LENGTH})`);
  }
  const sourceUrls = new Set(pair.sources.map(source => source.url));
  for (const row of pair.extraRows ?? []) {
    for (const url of row.sources) {
      if (!sourceUrls.has(url)) problems.push(`row "${row.label}" cites ${url}, which isn't in sources`);
    }
  }
  if (problems.length > 0) throw new Error(`Invalid vs pair "${pair.slug}": ${problems.join("; ")}`);
}

export function getVsPair(slug: string): VsPair | undefined {
  return vsPairs.find(pair => pair.slug === slug);
}

/** Display name for a pair, e.g. "Matomo vs Google Analytics". */
export function vsPairName(pair: VsPair): string {
  return `${competitors[pair.a].name} vs ${competitors[pair.b].name}`;
}
