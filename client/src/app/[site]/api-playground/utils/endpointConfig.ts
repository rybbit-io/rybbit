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
    name: "Overview",
    endpoints: [
      {
        method: "GET",
        path: "/overview/:site",
        name: "Get Overview",
        description: "Returns high-level analytics metrics for a site",
        hasCommonParams: true,
      },
      {
        method: "GET",
        path: "/overview-bucketed/:site",
        name: "Get Overview (Time Series)",
        description: "Returns time-series analytics data broken down by time buckets",
        hasCommonParams: true,
        specificParams: ["bucket"],
      },
      {
        method: "GET",
        path: "/metric/:site",
        name: "Get Metric",
        description: "Returns dimensional analytics broken down by a specific parameter",
        hasCommonParams: true,
        specificParams: ["parameter", "limit", "page"],
        requiredParams: ["parameter"],
      },
      {
        method: "GET",
        path: "/live-user-count/:site",
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
        path: "/events/:site",
        name: "Get Events",
        description: "Returns a paginated list of events",
        hasCommonParams: true,
        specificParams: ["page", "page_size"],
      },
      {
        method: "GET",
        path: "/events/names/:site",
        name: "Get Event Names",
        description: "Returns list of unique custom event names with counts",
        hasCommonParams: true,
      },
      {
        method: "GET",
        path: "/events/properties/:site",
        name: "Get Event Properties",
        description: "Returns property key-value pairs for a specific event",
        hasCommonParams: true,
        specificParams: ["event_name"],
        requiredParams: ["event_name"],
      },
      {
        method: "GET",
        path: "/events/outbound/:site",
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
        path: "/error-names/:site",
        name: "Get Error Names",
        description: "Returns unique error messages with occurrence and session counts",
        hasCommonParams: true,
        specificParams: ["page", "limit"],
      },
      {
        method: "GET",
        path: "/error-events/:site",
        name: "Get Error Events",
        description: "Returns individual error occurrences with context and stack traces",
        hasCommonParams: true,
        requiredParams: ["errorMessage"],
        specificParams: ["errorMessage", "page", "limit"],
      },
      {
        method: "GET",
        path: "/error-bucketed/:site",
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
        path: "/goals/:site",
        name: "Get Goals",
        description: "Returns paginated list of goals with conversion metrics",
        hasCommonParams: true,
        specificParams: ["page", "page_size", "sort", "order"],
      },
      {
        method: "GET",
        path: "/goals/:goalId/sessions/:site",
        name: "Get Goal Sessions",
        description: "Returns sessions that completed a specific goal",
        hasCommonParams: true,
        pathParams: ["goalId"],
        specificParams: ["page", "limit"],
      },
      {
        method: "POST",
        path: "/goals/:site",
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
        path: "/goals/:goalId/:site",
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
        path: "/goals/:goalId/:site",
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
        path: "/funnels/:site",
        name: "Get Funnels",
        description: "Returns all saved funnels for a site",
        hasCommonParams: false,
      },
      {
        method: "POST",
        path: "/funnels/analyze/:site",
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
        path: "/funnels/:stepNumber/sessions/:site",
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
        path: "/funnels/:site",
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
        path: "/funnels/:funnelId/:site",
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
        path: "/performance/overview/:site",
        name: "Get Performance Overview",
        description: "Returns aggregate Core Web Vitals metrics",
        hasCommonParams: true,
      },
      {
        method: "GET",
        path: "/performance/time-series/:site",
        name: "Get Performance Time Series",
        description: "Returns performance metrics over time",
        hasCommonParams: true,
        specificParams: ["bucket"],
      },
      {
        method: "GET",
        path: "/performance/by-dimension/:site",
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
        path: "/sessions/:site",
        name: "Get Sessions",
        description: "Returns a paginated list of sessions",
        hasCommonParams: true,
        specificParams: ["page", "limit", "user_id", "identified_only"],
      },
      {
        method: "GET",
        path: "/sessions/:sessionId/:site",
        name: "Get Session",
        description: "Returns detailed session information with events",
        hasCommonParams: false,
        pathParams: ["sessionId"],
        specificParams: ["limit", "offset"],
      },
      {
        method: "GET",
        path: "/session-locations/:site",
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
        path: "/users/:site",
        name: "Get Users",
        description: "Returns a paginated list of users",
        hasCommonParams: true,
        specificParams: ["page", "page_size", "sort_by", "sort_order", "identified_only"],
      },
      {
        method: "GET",
        path: "/users/session-count/:site",
        name: "Get User Session Count",
        description: "Returns daily session counts for a specific user",
        hasCommonParams: false,
        specificParams: ["user_id", "time_zone"],
      },
      {
        method: "GET",
        path: "/users/:userId/:site",
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
        path: "/retention/:site",
        name: "Get Retention",
        description: "Returns cohort-based retention analysis",
        hasCommonParams: false,
        specificParams: ["mode", "range"],
      },
      {
        method: "GET",
        path: "/journeys/:site",
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
  event_name: { label: "Event Name", type: "text", placeholder: "e.g., purchase" },
  errorMessage: { label: "Error Message", type: "text", placeholder: "Error message to filter by" },
  user_id: { label: "User ID", type: "text", placeholder: "User ID" },
  time_zone: { label: "Time Zone", type: "text", placeholder: "America/New_York" },
  identified_only: { label: "Identified Only", type: "select", options: ["true", "false"] },
  // Path params
  goalId: { label: "Goal ID", type: "number", placeholder: "Goal ID" },
  funnelId: { label: "Funnel ID", type: "number", placeholder: "Funnel ID" },
  sessionId: { label: "Session ID", type: "text", placeholder: "Session ID" },
  userId: { label: "User ID", type: "text", placeholder: "User ID" },
  stepNumber: { label: "Step Number", type: "number", placeholder: "Step number (1-indexed)" },
};

// Method colors for UI
export const methodColors: Record<HttpMethod, string> = {
  GET: "bg-green-500/20 text-green-600 dark:text-green-400",
  POST: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  PUT: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  DELETE: "bg-red-500/20 text-red-600 dark:text-red-400",
};
