export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface EndpointConfig {
  method: HttpMethod;
  path: string;
  name: string;
  description?: string;
  hasCommonParams: boolean;
  specificParams?: string[];
  requiredParams?: string[];
  pathParams?: string[];
  hasRequestBody?: boolean;
  requestBodyExample?: object;
}

export interface EndpointCategory {
  name: string;
  endpoints: EndpointConfig[];
}

export const endpointCategories: EndpointCategory[] = [
  {
    name: "Sites",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site",
        name: "Get Site",
        description: "Returns details for a specific site",
        hasCommonParams: false,
      },
      {
        method: "DELETE",
        path: "/sites/:site",
        name: "Delete Site",
        description: "Permanently deletes a site and all its data. Requires admin/owner role.",
        hasCommonParams: false,
      },
      {
        method: "PUT",
        path: "/sites/:site/config",
        name: "Update Site Config",
        description: "Updates site configuration settings. Requires admin/owner role.",
        hasCommonParams: false,
        hasRequestBody: true,
        requestBodyExample: {
          public: true,
          blockBots: true,
          excludedCountries: ["CN", "RU"],
        },
      },
      {
        method: "GET",
        path: "/sites/:site/excluded-ips",
        name: "Get Excluded IPs",
        description: "Returns the list of excluded IP addresses",
        hasCommonParams: false,
      },
      {
        method: "GET",
        path: "/sites/:site/excluded-countries",
        name: "Get Excluded Countries",
        description: "Returns the list of excluded country codes",
        hasCommonParams: false,
      },
      {
        method: "GET",
        path: "/sites/:site/private-link-config",
        name: "Get Private Link Config",
        description: "Returns the private link key configuration",
        hasCommonParams: false,
      },
      {
        method: "POST",
        path: "/sites/:site/private-link-config",
        name: "Update Private Link",
        description: "Generates or revokes a private link key. Requires admin/owner role.",
        hasCommonParams: false,
        hasRequestBody: true,
        requestBodyExample: {
          action: "generate_private_link_key",
        },
      },
    ],
  },
  {
    name: "Organizations",
    endpoints: [
      {
        method: "GET",
        path: "/organizations",
        name: "Get My Organizations",
        description: "Returns all organizations the authenticated user is a member of, including all members for each organization",
        hasCommonParams: false,
      },
      {
        method: "POST",
        path: "/organizations/:organizationId/sites",
        name: "Create Site",
        description: "Creates a new site in an organization. Requires admin/owner role.",
        hasCommonParams: false,
        pathParams: ["organizationId"],
        hasRequestBody: true,
        requestBodyExample: {
          domain: "example.com",
          name: "My Website",
          public: false,
          blockBots: true,
          saltUserIds: false,
          excludedIPs: [],
          excludedCountries: [],
          sessionReplay: false,
          webVitals: false,
          trackErrors: false,
          trackOutbound: true,
          trackUrlParams: true,
          trackInitialPageView: true,
          trackSpaNavigation: true,
          trackIp: false,
          trackButtonClicks: false,
          trackCopy: false,
          trackFormInteractions: false,
          tags: [],
        },
      },
      {
        method: "GET",
        path: "/organizations/:organizationId/members",
        name: "Get Organization Members",
        description: "Returns all members of an organization with user details",
        hasCommonParams: false,
        pathParams: ["organizationId"],
      },
      {
        method: "POST",
        path: "/organizations/:organizationId/members",
        name: "Add Organization Member",
        description: "Adds a user to an organization with a specified role",
        hasCommonParams: false,
        pathParams: ["organizationId"],
        hasRequestBody: true,
        requestBodyExample: {
          email: "user@example.com",
          role: "member",
        },
      },
    ],
  },
  {
    name: "Overview",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/overview",
        name: "Get Overview",
        description: "Returns high-level analytics metrics for a site",
        hasCommonParams: true,
      },
      {
        method: "GET",
        path: "/sites/:site/overview-bucketed",
        name: "Get Overview (Time Series)",
        description: "Returns time-series analytics data broken down by time buckets",
        hasCommonParams: true,
        specificParams: ["bucket"],
      },
      {
        method: "GET",
        path: "/sites/:site/metric",
        name: "Get Metric",
        description: "Returns dimensional analytics broken down by a specific parameter",
        hasCommonParams: true,
        specificParams: ["parameter", "limit", "page"],
        requiredParams: ["parameter"],
      },
      {
        method: "GET",
        path: "/sites/:site/live-user-count",
        name: "Get Live Visitors",
        description: "Returns the count of active sessions within the specified time window",
        hasCommonParams: false,
        specificParams: ["minutes"],
      },
    ],
  },
  {
    name: "Events",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/events",
        name: "Get Events",
        description: "Returns a paginated list of events with cursor-based pagination",
        hasCommonParams: true,
        specificParams: ["page_size", "since_timestamp", "before_timestamp"],
      },
      {
        method: "GET",
        path: "/sites/:site/events/names",
        name: "Get Event Names",
        description: "Returns list of unique custom event names with counts",
        hasCommonParams: true,
      },
      {
        method: "GET",
        path: "/sites/:site/events/properties",
        name: "Get Event Properties",
        description: "Returns property key-value pairs for a specific event",
        hasCommonParams: true,
        specificParams: ["event_name"],
        requiredParams: ["event_name"],
      },
      {
        method: "GET",
        path: "/sites/:site/events/outbound",
        name: "Get Outbound Links",
        description: "Returns outbound link clicks with occurrence counts",
        hasCommonParams: true,
      },
    ],
  },
  {
    name: "Errors",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/error-names",
        name: "Get Error Names",
        description: "Returns unique error messages with occurrence and session counts",
        hasCommonParams: true,
        specificParams: ["page", "limit"],
      },
      {
        method: "GET",
        path: "/sites/:site/error-events",
        name: "Get Error Events",
        description: "Returns individual error occurrences with context and stack traces",
        hasCommonParams: true,
        requiredParams: ["errorMessage"],
        specificParams: ["errorMessage", "page", "limit"],
      },
      {
        method: "GET",
        path: "/sites/:site/error-bucketed",
        name: "Get Error Time Series",
        description: "Returns error occurrence counts over time",
        hasCommonParams: true,
        requiredParams: ["errorMessage"],
        specificParams: ["errorMessage", "bucket"],
      },
    ],
  },
  {
    name: "Goals",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/goals",
        name: "Get Goals",
        description: "Returns paginated list of goals with conversion metrics",
        hasCommonParams: true,
        specificParams: ["page", "page_size", "sort", "order"],
      },
      {
        method: "GET",
        path: "/sites/:site/goals/:goalId/sessions",
        name: "Get Goal Sessions",
        description: "Returns sessions that completed a specific goal",
        hasCommonParams: true,
        pathParams: ["goalId"],
        specificParams: ["page", "limit"],
      },
      {
        method: "POST",
        path: "/sites/:site/goals",
        name: "Create Goal",
        description: "Creates a new goal",
        hasCommonParams: false,
        hasRequestBody: true,
        requestBodyExample: {
          name: "My Goal",
          goalType: "path",
          config: {
            pathPattern: "/checkout/success",
          },
        },
      },
      {
        method: "PUT",
        path: "/sites/:site/goals/:goalId",
        name: "Update Goal",
        description: "Updates an existing goal",
        hasCommonParams: false,
        pathParams: ["goalId"],
        hasRequestBody: true,
        requestBodyExample: {
          name: "Updated Goal",
          goalType: "event",
          config: {
            eventName: "purchase",
          },
        },
      },
      {
        method: "DELETE",
        path: "/sites/:site/goals/:goalId",
        name: "Delete Goal",
        description: "Deletes a goal",
        hasCommonParams: false,
        pathParams: ["goalId"],
      },
    ],
  },
  {
    name: "Funnels",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/funnels",
        name: "Get Funnels",
        description: "Returns all saved funnels for a site",
        hasCommonParams: false,
      },
      {
        method: "POST",
        path: "/sites/:site/funnels/analyze",
        name: "Analyze Funnel",
        description: "Analyzes funnel conversion data step-by-step",
        hasCommonParams: true,
        hasRequestBody: true,
        requestBodyExample: {
          steps: [
            { type: "page", value: "/", name: "Homepage" },
            { type: "page", value: "/pricing", name: "Pricing" },
            { type: "page", value: "/signup", name: "Signup" },
          ],
        },
      },
      {
        method: "POST",
        path: "/sites/:site/funnels/:stepNumber/sessions",
        name: "Get Funnel Step Sessions",
        description: "Returns sessions that reached or dropped at a specific funnel step",
        hasCommonParams: true,
        pathParams: ["stepNumber"],
        specificParams: ["mode", "page", "limit"],
        hasRequestBody: true,
        requestBodyExample: {
          steps: [
            { type: "page", value: "/", name: "Homepage" },
            { type: "page", value: "/pricing", name: "Pricing" },
          ],
        },
      },
      {
        method: "POST",
        path: "/sites/:site/funnels",
        name: "Create Funnel",
        description: "Creates a saved funnel",
        hasCommonParams: false,
        hasRequestBody: true,
        requestBodyExample: {
          name: "Conversion Funnel",
          steps: [
            { type: "page", value: "/", name: "Homepage" },
            { type: "page", value: "/signup", name: "Signup" },
          ],
        },
      },
      {
        method: "DELETE",
        path: "/sites/:site/funnels/:funnelId",
        name: "Delete Funnel",
        description: "Deletes a saved funnel",
        hasCommonParams: false,
        pathParams: ["funnelId"],
      },
    ],
  },
  {
    name: "Performance",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/performance/overview",
        name: "Get Performance Overview",
        description: "Returns aggregate Core Web Vitals metrics",
        hasCommonParams: true,
      },
      {
        method: "GET",
        path: "/sites/:site/performance/time-series",
        name: "Get Performance Time Series",
        description: "Returns performance metrics over time",
        hasCommonParams: true,
        specificParams: ["bucket"],
      },
      {
        method: "GET",
        path: "/sites/:site/performance/by-dimension",
        name: "Get Performance by Dimension",
        description: "Returns performance breakdown by dimension",
        hasCommonParams: true,
        requiredParams: ["dimension"],
        specificParams: ["dimension", "page", "limit", "sort_by", "sort_order"],
      },
    ],
  },
  {
    name: "Sessions",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/sessions",
        name: "Get Sessions",
        description: "Returns a paginated list of sessions",
        hasCommonParams: true,
        specificParams: ["page", "limit", "user_id", "identified_only"],
      },
      {
        method: "GET",
        path: "/sites/:site/sessions/:sessionId",
        name: "Get Session",
        description: "Returns detailed session information with events",
        hasCommonParams: false,
        pathParams: ["sessionId"],
        specificParams: ["limit", "offset"],
      },
      {
        method: "GET",
        path: "/sites/:site/session-locations",
        name: "Get Session Locations",
        description: "Returns aggregated session locations for map visualization",
        hasCommonParams: true,
      },
    ],
  },
  {
    name: "Users",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/users",
        name: "Get Users",
        description: "Returns a paginated list of users",
        hasCommonParams: true,
        specificParams: ["page", "page_size", "sort_by", "sort_order", "identified_only"],
      },
      {
        method: "GET",
        path: "/sites/:site/users/session-count",
        name: "Get User Session Count",
        description: "Returns daily session counts for a specific user",
        hasCommonParams: false,
        specificParams: ["user_id", "time_zone"],
      },
      {
        method: "GET",
        path: "/sites/:site/users/:userId",
        name: "Get User Info",
        description: "Returns detailed user profile information",
        hasCommonParams: false,
        pathParams: ["userId"],
      },
    ],
  },
  {
    name: "Misc",
    endpoints: [
      {
        method: "GET",
        path: "/sites/:site/retention",
        name: "Get Retention",
        description: "Returns cohort-based retention analysis",
        hasCommonParams: false,
        specificParams: ["mode", "range"],
      },
      {
        method: "GET",
        path: "/sites/:site/journeys",
        name: "Get Journeys",
        description: "Returns most common page navigation paths",
        hasCommonParams: true,
        specificParams: ["steps", "limit"],
      },
    ],
  },
];

// Flatten all endpoints for easy lookup
export const allEndpoints: EndpointConfig[] = endpointCategories.flatMap(cat => cat.endpoints);

// Parameter metadata for dynamic form generation
export const parameterMetadata: Record<
  string,
  { label: string; type: "text" | "number" | "select"; options?: string[]; placeholder?: string }
> = {
  bucket: {
    label: "Bucket",
    type: "select",
    options: ["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour", "day", "week", "month", "year"],
  },
  parameter: {
    label: "Parameter",
    type: "select",
    options: [
      "pathname",
      "page_title",
      "country",
      "region",
      "city",
      "browser",
      "operating_system",
      "device_type",
      "referrer",
      "channel",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "language",
      "entry_page",
      "exit_page",
      "event_name",
    ],
  },
  dimension: {
    label: "Dimension",
    type: "select",
    options: ["pathname", "country", "browser", "operating_system", "device_type"],
  },
  mode: {
    label: "Mode",
    type: "select",
    options: ["day", "week", "reached", "dropped"],
  },
  sort: {
    label: "Sort By",
    type: "select",
    options: ["goalId", "name", "goalType", "createdAt"],
  },
  sort_by: {
    label: "Sort By",
    type: "select",
    options: ["first_seen", "last_seen", "pageviews", "sessions", "events"],
  },
  sort_order: {
    label: "Sort Order",
    type: "select",
    options: ["asc", "desc"],
  },
  order: {
    label: "Order",
    type: "select",
    options: ["asc", "desc"],
  },
  page: { label: "Page", type: "number", placeholder: "1" },
  limit: { label: "Limit", type: "number", placeholder: "10" },
  page_size: { label: "Page Size", type: "number", placeholder: "10" },
  minutes: { label: "Minutes", type: "number", placeholder: "5" },
  steps: { label: "Steps", type: "number", placeholder: "3" },
  range: { label: "Range (days)", type: "number", placeholder: "90" },
  offset: { label: "Offset", type: "number", placeholder: "0" },
  since_timestamp: { label: "Since Timestamp", type: "text", placeholder: "ISO 8601, e.g. 2024-01-31T14:00:00.000Z" },
  before_timestamp: { label: "Before Timestamp", type: "text", placeholder: "ISO 8601, e.g. 2024-01-31T14:00:00.000Z" },
  event_name: { label: "Event Name", type: "text", placeholder: "e.g., purchase" },
  errorMessage: { label: "Error Message", type: "text", placeholder: "Error message to filter by" },
  user_id: { label: "User ID", type: "text", placeholder: "User ID" },
  time_zone: { label: "Time Zone", type: "text", placeholder: "America/New_York" },
  identified_only: { label: "Identified Only", type: "select", options: ["true", "false"] },
  // Path params
  orgId: { label: "Organization ID", type: "text", placeholder: "org_abc123" },
  goalId: { label: "Goal ID", type: "number", placeholder: "Goal ID" },
  funnelId: { label: "Funnel ID", type: "number", placeholder: "Funnel ID" },
  sessionId: { label: "Session ID", type: "text", placeholder: "Session ID" },
  userId: { label: "User ID", type: "text", placeholder: "User ID" },
  stepNumber: { label: "Step Number", type: "number", placeholder: "Step number (1-indexed)" },
  siteId: { label: "Site ID", type: "number", placeholder: "Site ID" },
  organizationId: { label: "Organization ID", type: "text", placeholder: "org_abc123" },
  // Sites-specific params
  action: {
    label: "Action",
    type: "select",
    options: ["generate_private_link_key", "revoke_private_link_key"],
  },
  // Organizations-specific params
  role: {
    label: "Role",
    type: "select",
    options: ["admin", "member", "owner"],
  },
};

// Method colors for UI
export const methodColors: Record<HttpMethod, string> = {
  GET: "bg-green-500/20 text-green-600 dark:text-green-400",
  POST: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  PUT: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  DELETE: "bg-red-500/20 text-red-600 dark:text-red-400",
};
