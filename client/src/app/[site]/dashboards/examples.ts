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
    id: "total-sessions-stat",
    title: "Total sessions",
    description: "Single headline count of unique sessions in the selected range.",
    category: "Overview",
    vizType: "stat",
    mapping: { valueColumn: "sessions" },
    sql: `SELECT countDistinct(session_id) AS sessions
FROM scoped_events`,
  },
  {
    id: "unique-users-stat",
    title: "Unique users",
    description: "Anonymous user fingerprints seen in the selected range.",
    category: "Overview",
    vizType: "stat",
    mapping: { valueColumn: "users" },
    sql: `SELECT countDistinct(user_id) AS users
FROM scoped_events
WHERE user_id != ''`,
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
    id: "pages-per-session-stat",
    title: "Pages per session",
    description: "Average pageviews per session, matching the overview-style engagement KPI.",
    category: "Overview",
    vizType: "stat",
    mapping: { valueColumn: "pages_per_session" },
    sql: `SELECT round(avg(pages), 2) AS pages_per_session
FROM (
  SELECT session_id,
         countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)
WHERE pages > 0`,
  },
  {
    id: "avg-session-duration-stat",
    title: "Avg. session duration",
    description: "Average seconds between the first and last event in each session.",
    category: "Overview",
    vizType: "stat",
    mapping: { valueColumn: "avg_seconds", valueFormat: "duration" },
    sql: `SELECT round(avg(duration_seconds)) AS avg_seconds
FROM (
  SELECT session_id,
         dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
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
    id: "bounce-rate-over-time",
    title: "Bounce rate over time",
    description: "Single-pageview session rate per time bucket.",
    category: "Traffic",
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["bounce_rate"] },
    sql: `SELECT toStartOfInterval(session_start, INTERVAL {{bucket}}) AS time,
       round(100 * countIf(pages = 1) / count(), 1) AS bounce_rate
FROM (
  SELECT session_id,
         min(timestamp) AS session_start,
         countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)
WHERE pages > 0
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
  {
    id: "page-titles",
    title: "Top page titles",
    description: "Most common document titles with representative paths.",
    category: "Traffic",
    vizType: "table",
    mapping: {},
    sql: `SELECT page_title,
       any(pathname) AS sample_path,
       countDistinct(session_id) AS sessions,
       countIf(type = 'pageview') AS pageviews
FROM scoped_events
WHERE page_title != ''
GROUP BY page_title
ORDER BY sessions DESC
LIMIT 50`,
  },
  {
    id: "top-hostnames",
    title: "Top hostnames",
    description: "Sessions split by hostname for multi-domain or subdomain sites.",
    category: "Traffic",
    vizType: "bar",
    mapping: { xColumn: "hostname", yColumns: ["sessions"] },
    sql: `SELECT hostname,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE hostname != ''
GROUP BY hostname
ORDER BY sessions DESC
LIMIT 20`,
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
  {
    id: "operating-systems",
    title: "Operating systems",
    description: "Sessions by OS family.",
    category: "Audience",
    vizType: "bar",
    mapping: { xColumn: "operating_system", yColumns: ["sessions"] },
    sql: `SELECT operating_system,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE operating_system != ''
GROUP BY operating_system
ORDER BY sessions DESC
LIMIT 15`,
  },
  {
    id: "top-cities",
    title: "Top cities",
    description: "City-level session concentration.",
    category: "Audience",
    vizType: "hbar",
    mapping: { xColumn: "location", valueColumn: "sessions" },
    sql: `SELECT concat(city, ', ', country) AS location,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE city != '' AND country != ''
GROUP BY location
ORDER BY sessions DESC
LIMIT 30`,
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
  {
    id: "new-vs-returning-users",
    title: "New vs. returning users",
    description: "Users whose first seen bucket is inside the selected range vs later buckets in the same range.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["users"], seriesColumn: "visitor_type" },
    sql: `WITH first_seen AS (
  SELECT user_id,
         min(timestamp) AS first_seen_at
  FROM scoped_events
  WHERE user_id != ''
  GROUP BY user_id
)
SELECT toStartOfInterval(e.timestamp, INTERVAL {{bucket}}) AS time,
       if(
         toStartOfInterval(e.timestamp, INTERVAL {{bucket}}) = toStartOfInterval(f.first_seen_at, INTERVAL {{bucket}}),
         'New in range',
         'Returning in range'
       ) AS visitor_type,
       countDistinct(e.user_id) AS users
FROM scoped_events e
INNER JOIN first_seen f ON e.user_id = f.user_id
WHERE e.user_id != ''
GROUP BY time, visitor_type
ORDER BY time`,
  },
  {
    id: "repeat-visit-distribution",
    title: "Repeat visit distribution",
    description: "How many users had 1, 2, 3, etc. sessions in the selected range.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "sessions_per_user", yColumns: ["users"] },
    sql: `SELECT sessions_per_user,
       count() AS users
FROM (
  SELECT COALESCE(NULLIF(identified_user_id, ''), user_id) AS user_key,
         countDistinct(session_id) AS sessions_per_user
  FROM scoped_events
  WHERE user_id != ''
  GROUP BY user_key
)
GROUP BY sessions_per_user
ORDER BY sessions_per_user
LIMIT 30`,
  },
  {
    id: "common-first-journeys",
    title: "Common first journeys",
    description: "Most common first three page paths in a session.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT arrayStringConcat(journey, ' -> ') AS journey,
       count() AS sessions
FROM (
  SELECT arraySlice(arrayCompact(groupArray(pathname)), 1, 3) AS journey
  FROM (
    SELECT session_id,
           pathname,
           timestamp
    FROM scoped_events
    WHERE type = 'pageview' AND pathname != ''
    ORDER BY session_id, timestamp
  )
  GROUP BY session_id
  HAVING length(journey) >= 2
)
GROUP BY journey
ORDER BY sessions DESC
LIMIT 50`,
  },
  {
    id: "top-page-transitions",
    title: "Top page transitions",
    description: "The most common page-to-next-page moves within sessions.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `WITH ordered_pageviews AS (
  SELECT session_id,
         pathname AS from_path,
         leadInFrame(pathname) OVER (
           PARTITION BY session_id
           ORDER BY timestamp
           ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING
         ) AS to_path
  FROM scoped_events
  WHERE type = 'pageview' AND pathname != ''
)
SELECT from_path,
       to_path,
       count() AS transitions
FROM ordered_pageviews
WHERE to_path != '' AND to_path != from_path
GROUP BY from_path, to_path
ORDER BY transitions DESC
LIMIT 50`,
  },
  {
    id: "landing-page-goal-conversion",
    title: "Landing page to goal conversion",
    description: "Sessions by entry page and whether they fired a chosen custom event. Edit event_name for your goal.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT entry_page,
       count() AS sessions,
       countIf(converted = 1) AS conversions,
       round(100 * countIf(converted = 1) / count(), 1) AS conversion_rate_pct
FROM (
  SELECT session_id,
         argMinIf(pathname, timestamp, type = 'pageview') AS entry_page,
         maxIf(1, type = 'custom_event' AND event_name = 'signup') AS converted
  FROM scoped_events
  GROUP BY session_id
)
WHERE entry_page != ''
GROUP BY entry_page
ORDER BY sessions DESC
LIMIT 50`,
  },
  {
    id: "conversion-rate-over-time",
    title: "Conversion rate over time",
    description: "Share of sessions that fired a chosen custom event per bucket. Edit event_name for your goal.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["conversion_rate_pct"] },
    sql: `SELECT toStartOfInterval(session_start, INTERVAL {{bucket}}) AS time,
       round(100 * countIf(converted = 1) / nullIf(count(), 0), 1) AS conversion_rate_pct
FROM (
  SELECT session_id,
         min(timestamp) AS session_start,
         maxIf(1, type = 'custom_event' AND event_name = 'signup') AS converted
  FROM scoped_events
  GROUP BY session_id
)
GROUP BY time
ORDER BY time`,
  },
  {
    id: "entry-to-exit-pairs",
    title: "Entry to exit pairs",
    description: "Common landing and final page combinations within sessions.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT entry_page,
       exit_page,
       count() AS sessions,
       round(avg(pages), 2) AS avg_pages
FROM (
  SELECT session_id,
         argMinIf(pathname, timestamp, type = 'pageview') AS entry_page,
         argMaxIf(pathname, timestamp, type = 'pageview') AS exit_page,
         countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)
WHERE entry_page != '' AND exit_page != ''
GROUP BY entry_page, exit_page
ORDER BY sessions DESC
LIMIT 50`,
  },
  {
    id: "dead-end-pages",
    title: "Dead-end pages",
    description: "Exit pages that frequently end single-page sessions.",
    category: "Behavior",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT exit_page,
       count() AS exit_sessions,
       countIf(pages = 1) AS dead_end_sessions,
       round(100 * countIf(pages = 1) / nullIf(count(), 0), 1) AS dead_end_rate_pct
FROM (
  SELECT session_id,
         argMaxIf(pathname, timestamp, type = 'pageview') AS exit_page,
         countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)
WHERE exit_page != ''
GROUP BY exit_page
HAVING exit_sessions >= 5
ORDER BY dead_end_rate_pct DESC, exit_sessions DESC
LIMIT 50`,
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
    id: "events-by-type",
    title: "Events by type",
    description: "Raw event volume by tracked event type.",
    category: "Events",
    vizType: "pie",
    mapping: { xColumn: "type", valueColumn: "events" },
    sql: `SELECT type,
       count() AS events
FROM scoped_events
GROUP BY type
ORDER BY events DESC`,
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
  {
    id: "errors-over-time",
    title: "Errors over time",
    description: "JavaScript error count per time bucket.",
    category: "Events",
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["errors"] },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       count() AS errors
FROM scoped_events
WHERE type = 'error'
GROUP BY time
ORDER BY time`,
  },
  {
    id: "error-pages",
    title: "Pages with errors",
    description: "Paths ranked by error volume and affected sessions.",
    category: "Events",
    vizType: "table",
    mapping: {},
    sql: `SELECT pathname,
       count() AS errors,
       countDistinct(session_id) AS affected_sessions
FROM scoped_events
WHERE type = 'error' AND pathname != ''
GROUP BY pathname
ORDER BY errors DESC
LIMIT 50`,
  },
  {
    id: "error-rate-over-time",
    title: "Error rate over time",
    description: "JavaScript errors per 1,000 pageviews per time bucket.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["errors_per_1k_pageviews"] },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       round(1000 * countIf(type = 'error') / nullIf(countIf(type = 'pageview'), 0), 1) AS errors_per_1k_pageviews
FROM scoped_events
GROUP BY time
ORDER BY time`,
  },
  {
    id: "browser-error-rate",
    title: "Browser error rate",
    description: "JavaScript errors per 1,000 pageviews by browser.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT browser,
       pageviews,
       errors,
       round(1000 * errors / nullIf(pageviews, 0), 1) AS errors_per_1k_pageviews
FROM (
  SELECT browser,
         countIf(type = 'pageview') AS pageviews,
         countIf(type = 'error') AS errors
  FROM scoped_events
  WHERE browser != ''
  GROUP BY browser
)
WHERE errors > 0
ORDER BY errors_per_1k_pageviews DESC, errors DESC
LIMIT 30`,
  },
  {
    id: "outbound-ctr-by-page",
    title: "Outbound CTR by page",
    description: "Outbound clicks relative to pageviews by path.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT pathname,
       countIf(type = 'pageview') AS pageviews,
       countIf(type = 'outbound') AS outbound_clicks,
       round(100 * countIf(type = 'outbound') / nullIf(countIf(type = 'pageview'), 0), 1) AS outbound_ctr_pct
FROM scoped_events
WHERE pathname != ''
GROUP BY pathname
HAVING outbound_clicks > 0
ORDER BY outbound_ctr_pct DESC
LIMIT 50`,
  },
  {
    id: "custom-event-property-breakdown",
    title: "Custom event property breakdown",
    description: "Break down a chosen custom event by a chosen property. Edit event_name and property key.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "property_value", yColumns: ["events", "sessions"] },
    sql: `SELECT JSONExtractString(toString(props), 'plan') AS property_value,
       count() AS events,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE type = 'custom_event'
  AND event_name = 'signup'
  AND JSONExtractString(toString(props), 'plan') != ''
GROUP BY property_value
ORDER BY events DESC
LIMIT 30`,
  },
  {
    id: "form-abandonment-by-form",
    title: "Form abandonment by form",
    description: "Sessions with form input activity that did not submit the same form.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT form_name,
       count() AS sessions_with_input,
       countIf(has_submit = 0) AS abandoned_sessions,
       round(100 * countIf(has_submit = 0) / count(), 1) AS abandonment_rate_pct
FROM (
  SELECT session_id,
         JSONExtractString(toString(props), 'formName') AS form_name,
         countIf(type = 'input_change') AS input_events,
         maxIf(1, type = 'form_submit') AS has_submit
  FROM scoped_events
  WHERE type IN ('input_change', 'form_submit')
  GROUP BY session_id, form_name
)
WHERE form_name != '' AND input_events > 0
GROUP BY form_name
ORDER BY abandoned_sessions DESC
LIMIT 50`,
  },
  {
    id: "repeated-button-clicks",
    title: "Repeated button clicks",
    description: "Potential friction: sessions clicking the same button repeatedly on a page.",
    category: "Events",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT pathname,
       JSONExtractString(toString(props), 'text') AS button_text,
       session_id,
       count() AS clicks
FROM scoped_events
WHERE type = 'button_click'
GROUP BY pathname, button_text, session_id
HAVING clicks >= 5
ORDER BY clicks DESC
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
  {
    id: "web-vitals-by-device",
    title: "Web Vitals by device",
    description: "75th-percentile LCP and INP by device type.",
    category: "Performance",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "device_type", yColumns: ["lcp_p75_ms", "inp_p75_ms"] },
    sql: `SELECT device_type,
       round(quantile(0.75)(lcp)) AS lcp_p75_ms,
       round(quantile(0.75)(inp)) AS inp_p75_ms,
       count() AS samples
FROM scoped_events
WHERE type = 'performance'
  AND device_type != ''
  AND (lcp IS NOT NULL OR inp IS NOT NULL)
GROUP BY device_type
ORDER BY lcp_p75_ms DESC`,
  },
  {
    id: "poor-vitals-share",
    title: "Poor Web Vitals share",
    description: "Share of performance samples above common LCP, INP, or CLS thresholds.",
    category: "Performance",
    beyondPrebuilt: true,
    vizType: "stat",
    mapping: { valueColumn: "poor_vitals_pct", valueFormat: "percent" },
    sql: `SELECT round(100 * countIf(lcp > 2500 OR inp > 200 OR cls > 0.1) / nullIf(count(), 0), 1) AS poor_vitals_pct
FROM scoped_events
WHERE type = 'performance'`,
  },
  {
    id: "performance-sample-coverage",
    title: "Performance sample coverage",
    description: "Pages with low Web Vitals sample coverage compared with pageviews.",
    category: "Performance",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT pathname,
       pageviews,
       performance_samples,
       round(100 * performance_samples / nullIf(pageviews, 0), 1) AS coverage_pct
FROM (
  SELECT pathname,
         countIf(type = 'pageview') AS pageviews,
         countIf(type = 'performance') AS performance_samples
  FROM scoped_events
  WHERE pathname != ''
  GROUP BY pathname
)
WHERE pageviews >= 10
ORDER BY coverage_pct ASC, pageviews DESC
LIMIT 50`,
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
  {
    id: "channel-goal-conversion",
    title: "Channel to goal conversion",
    description: "First-touch channel quality for a chosen custom event. Edit event_name for your goal.",
    category: "Marketing",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "channel", yColumns: ["sessions", "conversions"] },
    sql: `SELECT channel,
       count() AS sessions,
       countIf(converted = 1) AS conversions,
       round(100 * countIf(converted = 1) / count(), 1) AS conversion_rate_pct
FROM (
  SELECT session_id,
         argMin(channel, timestamp) AS channel,
         maxIf(1, type = 'custom_event' AND event_name = 'signup') AS converted
  FROM scoped_events
  GROUP BY session_id
)
WHERE channel != ''
GROUP BY channel
ORDER BY conversions DESC`,
  },
  {
    id: "referrer-conversion-quality",
    title: "Referrer conversion quality",
    description: "External referrers ranked by conversion rate for a chosen custom event.",
    category: "Marketing",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT referrer,
       count() AS sessions,
       countIf(converted = 1) AS conversions,
       round(100 * countIf(converted = 1) / nullIf(count(), 0), 1) AS conversion_rate_pct
FROM (
  SELECT session_id,
         argMinIf(referrer, timestamp, referrer != '') AS referrer,
         maxIf(1, type = 'custom_event' AND event_name = 'signup') AS converted
  FROM scoped_events
  GROUP BY session_id
)
WHERE referrer != ''
GROUP BY referrer
HAVING sessions >= 5
ORDER BY conversion_rate_pct DESC, conversions DESC
LIMIT 50`,
  },
  {
    id: "campaign-engagement-quality",
    title: "Campaign engagement quality",
    description: "UTM campaigns ranked by sessions, bounce rate, and pages per session.",
    category: "Marketing",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT campaign,
       count() AS sessions,
       round(avg(pages), 2) AS pages_per_session,
       round(100 * countIf(pages = 1) / count(), 1) AS bounce_rate_pct
FROM (
  SELECT session_id,
         argMin(url_parameters['utm_campaign'], timestamp) AS campaign,
         countIf(type = 'pageview') AS pages
  FROM scoped_events
  GROUP BY session_id
)
WHERE campaign != '' AND pages > 0
GROUP BY campaign
ORDER BY sessions DESC
LIMIT 50`,
  },
  {
    id: "ai-and-paid-traffic-trend",
    title: "AI and paid traffic trend",
    description: "Sessions from AI and paid channels over time.",
    category: "Marketing",
    beyondPrebuilt: true,
    vizType: "line",
    mapping: { xColumn: "time", yColumns: ["sessions"], seriesColumn: "channel" },
    sql: `SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time,
       channel,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE channel IN ('AI', 'Paid AI', 'Paid Search', 'Paid Social', 'Paid Video', 'Paid Shopping')
GROUP BY time, channel
ORDER BY time`,
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
  {
    id: "tag-breakdown",
    title: "Tag breakdown",
    description: "Traffic split by optional site/script tag.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT if(tag = '', '(untagged)', tag) AS script_tag,
       countDistinct(session_id) AS sessions,
       countIf(type = 'pageview') AS pageviews,
       count() AS events
FROM scoped_events
GROUP BY script_tag
ORDER BY sessions DESC
LIMIT 50`,
  },
  {
    id: "imported-vs-native-traffic",
    title: "Imported vs. native traffic",
    description: "Events, pageviews, sessions, and users split by imported data vs native tracking.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT if(isNull(import_id), 'Native tracking', 'Imported data') AS data_source,
       count() AS events,
       countIf(type = 'pageview') AS pageviews,
       countDistinct(session_id) AS sessions,
       countDistinct(user_id) AS users
FROM scoped_events
GROUP BY data_source
ORDER BY events DESC`,
  },
  {
    id: "time-to-conversion",
    title: "Time to conversion",
    description: "Median and p90 seconds from first pageview to a chosen custom event. Edit event_name for your goal.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT round(quantile(0.5)(seconds_to_convert)) AS median_seconds,
       round(quantile(0.9)(seconds_to_convert)) AS p90_seconds,
       count() AS converted_sessions
FROM (
  SELECT session_id,
         minIf(timestamp, type = 'pageview') AS first_pageview_at,
         minIf(timestamp, type = 'custom_event' AND event_name = 'signup') AS converted_at,
         dateDiff('second', first_pageview_at, converted_at) AS seconds_to_convert
  FROM scoped_events
  GROUP BY session_id
  HAVING converted_at > first_pageview_at
)`,
  },
  {
    id: "screen-width-distribution",
    title: "Screen width distribution",
    description: "Sessions grouped into 200px viewport-width buckets.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "bar",
    mapping: { xColumn: "width_bucket", yColumns: ["sessions"] },
    sql: `SELECT intDiv(screen_width, 200) * 200 AS width_bucket_start,
       concat(toString(width_bucket_start), '-', toString(width_bucket_start + 199), 'px') AS width_bucket,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE screen_width > 0
GROUP BY width_bucket_start, width_bucket
ORDER BY width_bucket_start`,
  },
  {
    id: "suspicious-high-rate-sessions",
    title: "Suspicious high-rate sessions",
    description: "Bot-like or noisy sessions with many events per minute, using only scoped_events data.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT session_id,
       user_id,
       count() AS events,
       dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds,
       round(events / greatest(duration_seconds / 60, 1), 1) AS events_per_minute,
       countIf(type = 'pageview') AS pageviews,
       countIf(type = 'error') AS errors
FROM scoped_events
GROUP BY session_id, user_id
HAVING events >= 100 OR events_per_minute >= 60
ORDER BY events_per_minute DESC
LIMIT 50`,
  },
  {
    id: "zero-viewport-traffic",
    title: "Zero viewport traffic",
    description: "Sessions with missing screen dimensions, which can flag instrumentation or automation issues.",
    category: "Power user",
    beyondPrebuilt: true,
    vizType: "table",
    mapping: {},
    sql: `SELECT channel,
       browser,
       operating_system,
       countDistinct(session_id) AS sessions
FROM scoped_events
WHERE screen_width = 0 OR screen_height = 0
GROUP BY channel, browser, operating_system
ORDER BY sessions DESC
LIMIT 50`,
  },
];

export const DASHBOARD_EXAMPLE_CATEGORIES: string[] = Array.from(
  DASHBOARD_EXAMPLES.reduce((set, example) => set.add(example.category), new Set<string>())
);
