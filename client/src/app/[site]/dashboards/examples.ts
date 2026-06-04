import type { DashboardCardMapping, DashboardVizType } from "@rybbit/shared";

export type DashboardExample = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** True for analyses that aren't available on the prebuilt analytics pages. */
  beyondPrebuilt?: boolean;
  sql: string;
  vizType: DashboardVizType;
  mapping: DashboardCardMapping;
};

/**
 * Curated example queries shown in the card editor to help users get started.
 * All read from `scoped_events`, are auto-scoped to the global time range, and
 * use {{bucket}} for time-series granularity. Site-specific paths (e.g.
 * '/pricing') are placeholders meant to be edited.
 */
export const DASHBOARD_EXAMPLES: DashboardExample[] = [
  // ── Overview ─────────────────────────────────────────────────────────────--
  {
    id: "total-pageviews-stat",
    title: "Total pageviews",
    description: "Single headline number for the selected range.",
    category: "Overview",
    vizType: "stat",
    mapping: { valueColumn: "pageviews" },
    sql: `SELECT countIf(type = 'pageview') AS pageviews
FROM scoped_events`,
  },
  {
    id: "bounce-rate-stat",
    title: "Bounce rate",
    description: "Share of sessions with a single pageview.",
    category: "Overview",
    vizType: "stat",
    mapping: { valueColumn: "bounce_rate", valueFormat: "percent" },
    sql: `SELECT round(100 * countIf(pages = 1) / count(), 1) AS bounce_rate
FROM (
  SELECT session_id, countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)`,
  },
  {
    id: "visitors-by-country-map",
    title: "Visitors by country (map)",
    description: "Sessions shaded onto a world map.",
    category: "Overview",
    vizType: "map",
    mapping: { countryColumn: "country", valueColumn: "sessions" },
    sql: `SELECT country,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE country != ''
GROUP BY country`,
  },
  {
    id: "device-type-donut",
    title: "Device type (donut)",
    description: "Share of sessions by device class.",
    category: "Overview",
    vizType: "pie",
    mapping: { xColumn: "device_type", valueColumn: "sessions" },
    sql: `SELECT device_type,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE device_type != ''
GROUP BY device_type
ORDER BY sessions DESC`,
  },
  {
    id: "top-pages-bar-list",
    title: "Top pages (bar list)",
    description: "Most-viewed paths as a ranked list.",
    category: "Overview",
    vizType: "hbar",
    mapping: { xColumn: "pathname", valueColumn: "pageviews" },
    sql: `SELECT pathname,
       countIf(type = 'pageview') AS pageviews
FROM scoped_events
GROUP BY pathname
ORDER BY pageviews DESC
LIMIT 30`,
  },
  {
    id: "daily-pageviews-calendar",
    title: "Daily pageviews (calendar)",
    description: "Per-day activity heatmap. Use a wide range for the best effect.",
    category: "Overview",
    vizType: "calendar",
    mapping: { dateColumn: "day", valueColumn: "pageviews" },
    sql: `SELECT toDate(timestamp) AS day,
       countIf(type = 'pageview') AS pageviews
FROM scoped_events
GROUP BY day
ORDER BY day`,
  },

  // ── Traffic ────────────────────────────────────────────────────────────────
  {
    id: "pageviews-over-time",
    title: "Pageviews over time",
    description: "Pageview count per time bucket.",
    category: "Traffic",
    vizType: "area",
    mapping: { xColumn: "time", yColumns: ["pageviews"] },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       countIf(type = 'pageview') AS pageviews
FROM scoped_events
GROUP BY time
ORDER BY time`,
  },
  {
    id: "sessions-vs-users",
    title: "Sessions vs. users over time",
    description: "Unique sessions and unique visitors side by side.",
    category: "Traffic",
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["sessions", "users"] },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       countDistinct(session_id) AS sessions,
       countDistinct(user_id) AS users
FROM scoped_events
GROUP BY time
ORDER BY time`,
  },
  {
    id: "top-pages",
    title: "Top pages",
    description: "Most viewed paths.",
    category: "Traffic",
    vizType: "bar",
    mapping: { xColumn: "pathname", yColumns: ["pageviews"] },
    sql: `SELECT pathname,
       countIf(type = 'pageview') AS pageviews
FROM scoped_events
GROUP BY pathname
ORDER BY pageviews DESC
LIMIT 20`,
  },
  {
    id: "acquisition-channels",
    title: "Acquisition channels",
    description: "Sessions grouped by derived marketing channel.",
    category: "Traffic",
    vizType: "bar",
    mapping: { xColumn: "channel", yColumns: ["sessions"] },
    sql: `SELECT channel,
       countDistinct(session_id) AS sessions
FROM scoped_events
GROUP BY channel
ORDER BY sessions DESC`,
  },
  {
    id: "top-referrers",
    title: "Top referrers",
    description: "External sites sending traffic.",
    category: "Traffic",
    vizType: "table",
    mapping: {},
    sql: `SELECT referrer,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE referrer != ''
GROUP BY referrer
ORDER BY sessions DESC
LIMIT 50`,
  },

  // ── Audience ─────────────────────────────────────────────────────────────--
  {
    id: "top-countries",
    title: "Top countries",
    description: "Sessions by visitor country.",
    category: "Audience",
    vizType: "bar",
    mapping: { xColumn: "country", yColumns: ["sessions"] },
    sql: `SELECT country,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE country != ''
GROUP BY country
ORDER BY sessions DESC
LIMIT 20`,
  },
  {
    id: "browser-breakdown",
    title: "Browser breakdown",
    description: "Sessions by browser family.",
    category: "Audience",
    vizType: "bar",
    mapping: { xColumn: "browser", yColumns: ["sessions"] },
    sql: `SELECT browser,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE browser != ''
GROUP BY browser
ORDER BY sessions DESC
LIMIT 15`,
  },
  {
    id: "device-type",
    title: "Device type split",
    description: "Sessions by device class.",
    category: "Audience",
    vizType: "bar",
    mapping: { xColumn: "device_type", yColumns: ["sessions"] },
    sql: `SELECT device_type,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE device_type != ''
GROUP BY device_type
ORDER BY sessions DESC`,
  },

  // ── Behavior (beyond prebuilt) ──────────────────────────────────────────────
  {
    id: "traffic-heatmap",
    title: "Traffic by hour & weekday",
    description: "Pageviews bucketed by day of week (1=Mon) and hour of day — find your peak times.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT toDayOfWeek(timestamp) AS weekday,
       toHour(timestamp) AS hour,
       countIf(type = 'pageview') AS pageviews
FROM scoped_events
GROUP BY weekday, hour
ORDER BY weekday, hour`,
  },
  {
    id: "entry-pages",
    title: "Entry (landing) pages",
    description: "First page viewed in each session.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT entry_page,
       countDistinct(session_id) AS sessions
FROM (
  SELECT session_id,
         argMin(pathname, timestamp) AS entry_page
  FROM scoped_events
  WHERE type = 'pageview'
  GROUP BY session_id
)
GROUP BY entry_page
ORDER BY sessions DESC
LIMIT 20`,
  },
  {
    id: "exit-pages",
    title: "Exit pages",
    description: "Last page viewed in each session.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT exit_page,
       countDistinct(session_id) AS sessions
FROM (
  SELECT session_id,
         argMax(pathname, timestamp) AS exit_page
  FROM scoped_events
  WHERE type = 'pageview'
  GROUP BY session_id
)
GROUP BY exit_page
ORDER BY sessions DESC
LIMIT 20`,
  },
  {
    id: "pages-per-session",
    title: "Pages-per-session distribution",
    description: "How many pages visitors view before leaving.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "pages_viewed", yColumns: ["sessions"] },
    sql: `SELECT pages_viewed,
       count() AS sessions
FROM (
  SELECT session_id,
         countIf(type = 'pageview') AS pages_viewed
  FROM scoped_events
  GROUP BY session_id
)
WHERE pages_viewed > 0
GROUP BY pages_viewed
ORDER BY pages_viewed
LIMIT 30`,
  },
  {
    id: "bounce-rate-by-landing",
    title: "Bounce rate by landing page",
    description: "Single-pageview sessions per entry page.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT entry_page,
       count() AS sessions,
       countIf(pages = 1) AS bounces,
       round(100 * countIf(pages = 1) / count(), 1) AS bounce_rate_pct
FROM (
  SELECT session_id,
         argMin(pathname, timestamp) AS entry_page,
         countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)
GROUP BY entry_page
ORDER BY sessions DESC
LIMIT 20`,
  },
  {
    id: "avg-session-duration",
    title: "Avg. session duration over time",
    description: "Mean seconds between first and last event per session.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["avg_seconds"] },
    sql: `SELECT toStartOfInterval(session_start, INTERVAL {{bucket}}) AS time,
       round(avg(duration_seconds)) AS avg_seconds
FROM (
  SELECT session_id,
         min(timestamp) AS session_start,
         dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
  FROM scoped_events
  GROUP BY session_id
)
GROUP BY time
ORDER BY time`,
  },
  {
    id: "path-to-path-conversion",
    title: "Path → path conversion",
    description: "Of sessions that viewed /pricing, how many also reached /signup. Edit the paths for your site.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT count() AS pricing_sessions,
       countIf(has_signup = 1) AS converted,
       round(100 * countIf(has_signup = 1) / count(), 1) AS conversion_rate_pct
FROM (
  SELECT session_id,
         maxIf(1, pathname = '/pricing') AS has_pricing,
         maxIf(1, pathname = '/signup') AS has_signup
  FROM scoped_events
  WHERE type = 'pageview'
  GROUP BY session_id
)
WHERE has_pricing = 1`,
  },

  // ── Events & interactions ───────────────────────────────────────────────────
  {
    id: "custom-events-over-time",
    title: "Custom events over time",
    description: "Top custom events split into series.",
    category: "Events",
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["events"], seriesColumn: "event_name" },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       event_name,
       count() AS events
FROM scoped_events
WHERE type = 'custom_event'
GROUP BY time, event_name
ORDER BY time`,
  },
  {
    id: "outbound-links",
    title: "Outbound link clicks",
    description: "Where visitors click off to.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT JSONExtractString(toString(props), 'url') AS destination,
       count() AS clicks
FROM scoped_events
WHERE type = 'outbound'
GROUP BY destination
ORDER BY clicks DESC
LIMIT 50`,
  },
  {
    id: "button-clicks",
    title: "Most-clicked buttons",
    description: "Tracked button clicks by label text.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT JSONExtractString(toString(props), 'text') AS button_text,
       count() AS clicks
FROM scoped_events
WHERE type = 'button_click'
GROUP BY button_text
ORDER BY clicks DESC
LIMIT 30`,
  },
  {
    id: "form-submissions",
    title: "Form submissions",
    description: "Submit events grouped by form name.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT JSONExtractString(toString(props), 'formName') AS form_name,
       count() AS submissions
FROM scoped_events
WHERE type = 'form_submit'
GROUP BY form_name
ORDER BY submissions DESC
LIMIT 30`,
  },
  {
    id: "copied-text",
    title: "Most-copied text",
    description: "Snippets visitors copy from your pages.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT JSONExtractString(toString(props), 'text') AS copied_text,
       count() AS copies
FROM scoped_events
WHERE type = 'copy'
GROUP BY copied_text
ORDER BY copies DESC
LIMIT 30`,
  },
  {
    id: "js-errors",
    title: "JavaScript errors",
    description: "Error events by name and message.",
    category: "Events",
    vizType: "table",
    mapping: {},
    sql: `SELECT event_name AS error,
       JSONExtractString(toString(props), 'message') AS message,
       count() AS occurrences,
       countDistinct(session_id) AS affected_sessions
FROM scoped_events
WHERE type = 'error'
GROUP BY error, message
ORDER BY occurrences DESC
LIMIT 50`,
  },

  // ── Performance ────────────────────────────────────────────────────────────
  {
    id: "web-vitals-over-time",
    title: "Web Vitals (p75) over time",
    description: "75th-percentile LCP and INP per bucket.",
    category: "Performance",
    beyondPrebuilt: true,
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["lcp_p75", "inp_p75"] },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       round(quantile(0.75)(lcp)) AS lcp_p75,
       round(quantile(0.75)(inp)) AS inp_p75
FROM scoped_events
WHERE type = 'performance'
GROUP BY time
ORDER BY time`,
  },
  {
    id: "slowest-pages",
    title: "Slowest pages by LCP",
    description: "Pages ranked by 75th-percentile Largest Contentful Paint.",
    category: "Performance",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT pathname,
       round(quantile(0.75)(lcp)) AS lcp_p75_ms,
       count() AS samples
FROM scoped_events
WHERE type = 'performance' AND lcp IS NOT NULL
GROUP BY pathname
ORDER BY lcp_p75_ms DESC
LIMIT 20`,
  },

  // ── Marketing ──────────────────────────────────────────────────────────────
  {
    id: "utm-campaigns",
    title: "UTM campaign performance",
    description: "Sessions by utm_campaign.",
    category: "Marketing",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "campaign", yColumns: ["sessions"] },
    sql: `SELECT url_parameters['utm_campaign'] AS campaign,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE url_parameters['utm_campaign'] != ''
GROUP BY campaign
ORDER BY sessions DESC
LIMIT 20`,
  },
  {
    id: "utm-source-medium",
    title: "UTM source / medium",
    description: "Sessions broken down by source and medium.",
    category: "Marketing",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT url_parameters['utm_source'] AS source,
       url_parameters['utm_medium'] AS medium,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE url_parameters['utm_source'] != ''
GROUP BY source, medium
ORDER BY sessions DESC
LIMIT 30`,
  },

  // ── Power user ─────────────────────────────────────────────────────────────
  {
    id: "identified-users",
    title: "Most active identified users",
    description: "Cross-session activity for users set via identify().",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT identified_user_id,
       count() AS events,
       countDistinct(session_id) AS sessions,
       max(timestamp) AS last_seen
FROM scoped_events
WHERE identified_user_id != ''
GROUP BY identified_user_id
ORDER BY events DESC
LIMIT 50`,
  },
  {
    id: "languages",
    title: "Visitor languages",
    description: "Sessions by browser language.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "language", yColumns: ["sessions"] },
    sql: `SELECT language,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE language != ''
GROUP BY language
ORDER BY sessions DESC
LIMIT 15`,
  },
];

export const DASHBOARD_EXAMPLE_CATEGORIES: string[] = Array.from(
  DASHBOARD_EXAMPLES.reduce((set, example) => set.add(example.category), new Set<string>())
);
