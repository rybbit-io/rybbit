import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  unique,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

// User table (BetterAuth)
export const user = pgTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    username: text(),
    email: text().notNull(),
    emailVerified: boolean().notNull(),
    image: text(),
    createdAt: timestamp({ mode: "string" }).notNull(),
    updatedAt: timestamp({ mode: "string" }).notNull(),
    role: text().default("user").notNull(),
    displayUsername: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: timestamp({ mode: "string" }),
    // deprecated
    stripeCustomerId: text(),
    // deprecated
    overMonthlyLimit: boolean().default(false),
    // deprecated
    monthlyEventCount: integer().default(0),
    sendAutoEmailReports: boolean().default(true),
  },
  table => [unique("user_username_unique").on(table.username), unique("user_email_unique").on(table.email)]
);

// Verification table (BetterAuth)
export const verification = pgTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }),
  updatedAt: timestamp({ mode: "string" }),
});

// Sites table
export const sites = pgTable("sites", {
  id: text("id").$defaultFn(() => sql`encode(gen_random_bytes(6), 'hex')`),
  // deprecated - keeping as primary key for backwards compatibility
  siteId: serial("site_id").primaryKey().notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  organizationId: text("organization_id").references(() => organization.id),
  public: boolean().default(false),
  saltUserIds: boolean().default(false),
  blockBots: boolean().default(true).notNull(),
  excludedIPs: jsonb("excluded_ips").default([]), // Array of IP addresses/ranges to exclude
  excludedCountries: jsonb("excluded_countries").default([]), // Array of ISO country codes to exclude (e.g., ["US", "GB"])
  sessionReplay: boolean().default(false),
  webVitals: boolean().default(false),
  trackErrors: boolean().default(false),
  trackOutbound: boolean().default(true),
  trackUrlParams: boolean().default(true),
  trackInitialPageView: boolean().default(true),
  trackSpaNavigation: boolean().default(true),
  trackIp: boolean().default(false),
  apiKey: text("api_key"), // Format: rb_{64_hex_chars} = 67 chars total
  privateLinkKey: text("private_link_key"),
});

// Active sessions table
export const activeSessions = pgTable("active_sessions", {
  sessionId: text("session_id").primaryKey().notNull(),
  siteId: integer("site_id"),
  userId: text("user_id"),
  startTime: timestamp("start_time").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
});

export const funnels = pgTable("funnels", {
  reportId: serial("report_id").primaryKey().notNull(),
  siteId: integer("site_id").references(() => sites.siteId, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  data: jsonb(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// Account table (BetterAuth)
export const account = pgTable("account", {
  id: text().primaryKey().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ mode: "string" }),
  refreshTokenExpiresAt: timestamp({ mode: "string" }),
  scope: text(),
  password: text(),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }).notNull(),
});

// Organization table (BetterAuth)
export const organization = pgTable(
  "organization",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    createdAt: timestamp({ mode: "string" }).notNull(),
    metadata: text(),
    stripeCustomerId: text(),
    monthlyEventCount: integer().default(0),
    overMonthlyLimit: boolean().default(false),
    planOverride: text(), // Plan name override (e.g., "pro1m", "standard500k")
  },
  table => [unique("organization_slug_unique").on(table.slug)]
);

// Member table (BetterAuth)
export const member = pgTable("member", {
  id: text().primaryKey().notNull(),
  organizationId: text()
    .notNull()
    .references(() => organization.id),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text().notNull(),
  createdAt: timestamp({ mode: "string" }).notNull(),
});

// Invitation table (BetterAuth)
export const invitation = pgTable("invitation", {
  id: text().primaryKey().notNull(),
  email: text().notNull(),
  inviterId: text().references(() => user.id, { onDelete: "set null" }),
  organizationId: text()
    .notNull()
    .references(() => organization.id),
  role: text().notNull(),
  status: text().notNull(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
});

// Session table (BetterAuth)
export const session = pgTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp({ mode: "string" }).notNull(),
    token: text().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
    updatedAt: timestamp({ mode: "string" }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
    activeOrganizationId: text(),
  },
  table => [unique("session_token_unique").on(table.token)]
);

// API Key table (BetterAuth)
export const apiKey = pgTable("apikey", {
  id: text().primaryKey().notNull(),
  name: text(),
  start: text(),
  prefix: text(),
  key: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer(),
  refillAmount: integer(),
  lastRefillAt: timestamp({ mode: "string" }),
  enabled: boolean().notNull().default(true),
  rateLimitEnabled: boolean().notNull().default(false),
  rateLimitTimeWindow: integer(),
  rateLimitMax: integer(),
  requestCount: integer().notNull().default(0),
  remaining: integer(),
  lastRequest: timestamp({ mode: "string" }),
  expiresAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }).notNull(),
  permissions: text(),
  metadata: jsonb(),
});

// Goals table for tracking conversion goals
export const goals = pgTable(
  "goals",
  {
    goalId: serial("goal_id").primaryKey().notNull(),
    siteId: integer("site_id").notNull(),
    name: text("name"), // Optional, user-defined name for the goal
    goalType: text("goal_type").notNull(), // 'path' or 'event'
    // Configuration specific to the goal type
    config: jsonb("config").notNull().$type<{
      // For 'path' type
      pathPattern?: string; // e.g., "/pricing", "/product/*/view", "/docs/**"
      // For 'event' type
      eventName?: string; // e.g., "signup_completed", "file_downloaded"
      eventPropertyKey?: string; // Optional property key to match
      eventPropertyValue?: string | number | boolean; // Optional property value to match (exact match)
    }>(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.siteId],
      foreignColumns: [sites.siteId],
      name: "goals_site_id_sites_site_id_fk",
    }).onDelete("cascade"),
  ]
);

// Telemetry table for tracking self-hosted instances
export const telemetry = pgTable("telemetry", {
  id: serial("id").primaryKey().notNull(),
  instanceId: text("instance_id").notNull(),
  timestamp: timestamp("timestamp", { mode: "string" }).notNull().defaultNow(),
  version: text("version").notNull(),
  tableCounts: jsonb("table_counts").notNull().$type<Record<string, number>>(),
  clickhouseSizeGb: real("clickhouse_size_gb").notNull(),
});

// Uptime monitor definitions
export const uptimeMonitors = pgTable("uptime_monitors", {
  id: serial("id").primaryKey().notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  name: text("name"),
  monitorType: text("monitor_type").notNull(), // 'http', 'tcp'

  // Common settings
  intervalSeconds: integer("interval_seconds").notNull(),
  enabled: boolean("enabled").default(true),

  // HTTP/HTTPS specific configuration
  httpConfig: jsonb("http_config").$type<{
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH";
    headers?: Record<string, string>;
    body?: string;
    auth?: {
      type: "none" | "basic" | "bearer" | "api_key" | "custom_header";
      credentials?: {
        username?: string;
        password?: string;
        token?: string;
        headerName?: string;
        headerValue?: string;
      };
    };
    followRedirects?: boolean;
    timeoutMs?: number;
    ipVersion?: "any" | "ipv4" | "ipv6";
    userAgent?: string;
  }>(),

  // TCP specific configuration
  tcpConfig: jsonb("tcp_config").$type<{
    host: string;
    port: number;
    timeoutMs?: number;
  }>(),

  // Validation rules
  validationRules: jsonb("validation_rules").notNull().default([]).$type<
    Array<
      | {
          type: "status_code";
          operator: "equals" | "not_equals" | "in" | "not_in";
          value: number | number[];
        }
      | {
          type: "response_time";
          operator: "less_than" | "greater_than";
          value: number;
        }
      | {
          type: "response_body_contains" | "response_body_not_contains";
          value: string;
          caseSensitive?: boolean;
        }
      | {
          type: "header_exists";
          header: string;
        }
      | {
          type: "header_value";
          header: string;
          operator: "equals" | "contains";
          value: string;
        }
      | {
          type: "response_size";
          operator: "less_than" | "greater_than";
          value: number;
        }
    >
  >(),

  // Multi-region configuration
  monitoringType: text("monitoring_type").default("local"), // 'local' or 'global'
  selectedRegions: jsonb("selected_regions").default(["local"]).$type<string[]>(),

  // Metadata
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
});

// Monitor status tracking
export const uptimeMonitorStatus = pgTable(
  "uptime_monitor_status",
  {
    monitorId: integer("monitor_id")
      .primaryKey()
      .notNull()
      .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
    lastCheckedAt: timestamp("last_checked_at", { mode: "string" }),
    nextCheckAt: timestamp("next_check_at", { mode: "string" }),
    currentStatus: text("current_status").default("unknown"), // 'up', 'down', 'unknown'
    consecutiveFailures: integer("consecutive_failures").default(0),
    consecutiveSuccesses: integer("consecutive_successes").default(0),
    uptimePercentage24h: real("uptime_percentage_24h"),
    uptimePercentage7d: real("uptime_percentage_7d"),
    uptimePercentage30d: real("uptime_percentage_30d"),
    averageResponseTime24h: real("average_response_time_24h"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.monitorId],
      foreignColumns: [uptimeMonitors.id],
      name: "uptime_monitor_status_monitor_id_uptime_monitors_id_fk",
    }),
    check("uptime_monitor_status_current_status_check", sql`current_status IN ('up', 'down', 'unknown')`),
    check("uptime_monitor_status_uptime_24h_check", sql`uptime_percentage_24h >= 0 AND uptime_percentage_24h <= 100`),
    check("uptime_monitor_status_uptime_7d_check", sql`uptime_percentage_7d >= 0 AND uptime_percentage_7d <= 100`),
    check("uptime_monitor_status_uptime_30d_check", sql`uptime_percentage_30d >= 0 AND uptime_percentage_30d <= 100`),
    index("uptime_monitor_status_updated_at_idx").on(table.updatedAt),
  ]
);

// Alert configuration (scaffolding)
export const uptimeAlerts = pgTable(
  "uptime_alerts",
  {
    id: serial("id").primaryKey().notNull(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
    alertType: text("alert_type").notNull(), // 'email', 'webhook', 'slack', etc.
    alertConfig: jsonb("alert_config").notNull(), // Type-specific configuration
    conditions: jsonb("conditions").notNull().$type<{
      consecutiveFailures?: number;
      responseTimeThresholdMs?: number;
      uptimePercentageThreshold?: number;
    }>(),
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  table => [
    foreignKey({
      columns: [table.monitorId],
      foreignColumns: [uptimeMonitors.id],
      name: "uptime_alerts_monitor_id_uptime_monitors_id_fk",
    }),
  ]
);

// Alert history (scaffolding)
export const uptimeAlertHistory = pgTable(
  "uptime_alert_history",
  {
    id: serial("id").primaryKey().notNull(),
    alertId: integer("alert_id")
      .notNull()
      .references(() => uptimeAlerts.id, { onDelete: "cascade" }),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
    triggeredAt: timestamp("triggered_at", { mode: "string" }).defaultNow(),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
    alertData: jsonb("alert_data"), // Context about what triggered the alert
  },
  table => [
    foreignKey({
      columns: [table.alertId],
      foreignColumns: [uptimeAlerts.id],
      name: "uptime_alert_history_alert_id_uptime_alerts_id_fk",
    }),
    foreignKey({
      columns: [table.monitorId],
      foreignColumns: [uptimeMonitors.id],
      name: "uptime_alert_history_monitor_id_uptime_monitors_id_fk",
    }),
  ]
);

// Agent regions for VPS-based monitoring
export const agentRegions = pgTable("agent_regions", {
  code: text("code").primaryKey().notNull(), // Region code (e.g., 'us-east', 'europe')
  name: text("name").notNull(), // Region display name
  endpointUrl: text("endpoint_url").notNull(), // Agent endpoint URL
  enabled: boolean("enabled").default(true),
  lastHealthCheck: timestamp("last_health_check", { mode: "string" }),
  isHealthy: boolean("is_healthy").default(true),
});

// Uptime incidents table
export const uptimeIncidents = pgTable("uptime_incidents", {
  id: serial("id").primaryKey().notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
  region: text("region"), // Region where incident occurred

  // Incident timing
  startTime: timestamp("start_time", { mode: "string" }).notNull(),
  endTime: timestamp("end_time", { mode: "string" }), // null if ongoing

  // Status
  status: text("status").notNull().default("active"), // 'active', 'acknowledged', 'resolved'

  // Acknowledgement details
  acknowledgedBy: text("acknowledged_by").references(() => user.id, { onDelete: "set null" }),
  acknowledgedAt: timestamp("acknowledged_at", { mode: "string" }),

  // Resolution details
  resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),

  // Error details
  lastError: text("last_error"),
  lastErrorType: text("last_error_type"),
  failureCount: integer("failure_count").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// Notification channels table
export const notificationChannels = pgTable("notification_channels", {
  id: serial("id").primaryKey().notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  type: text("type").notNull(), // 'email', 'discord', 'slack', 'sms'
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true),

  // Channel-specific configuration
  config: jsonb("config").notNull().$type<{
    // Email config
    email?: string;

    // Discord config
    webhookUrl?: string;

    // Slack config
    slackWebhookUrl?: string;
    slackChannel?: string;

    // SMS config (placeholder)
    phoneNumber?: string;
    provider?: string;
  }>(),

  // Monitor selection and notification settings
  monitorIds: jsonb("monitor_ids").$type<number[] | null>(), // null = all monitors
  triggerEvents: jsonb("trigger_events").notNull().default(["down", "recovery"]).$type<string[]>(), // 'down', 'recovery', 'degraded'
  cooldownMinutes: integer("cooldown_minutes").default(5), // Minimum time between notifications
  lastNotifiedAt: timestamp("last_notified_at", { mode: "string" }),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
});

// Google Search Console connections table
export const gscConnections = pgTable("gsc_connections", {
  siteId: integer("site_id")
    .primaryKey()
    .notNull()
    .references(() => sites.siteId, { onDelete: "cascade" }),

  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),

  // Which GSC property this connection is for
  gscPropertyUrl: text("gsc_property_url").notNull(),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// User profiles - stores identified user traits (email, name, custom fields)
export const userProfiles = pgTable(
  "user_profiles",
  {
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.siteId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // The identified user ID from identify() call
    traits: jsonb("traits").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.siteId, table.userId] }),
    index("user_profiles_site_idx").on(table.siteId),
  ]
);

// User aliases - maps anonymous IDs to identified users (multi-device support)
export const userAliases = pgTable(
  "user_aliases",
  {
    id: serial("id").primaryKey().notNull(),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.siteId, { onDelete: "cascade" }),
    anonymousId: text("anonymous_id").notNull(), // Hash of IP+UserAgent (device fingerprint)
    userId: text("user_id").notNull(), // The identified user ID
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_aliases_site_anon_unique").on(table.siteId, table.anonymousId),
    index("user_aliases_user_idx").on(table.siteId, table.userId),
    index("user_aliases_anon_idx").on(table.siteId, table.anonymousId),
  ]
);

export const importPlatforms = ["umami", "simple_analytics"] as const;

export const importPlatformEnum = pgEnum("import_platform_enum", importPlatforms);

export const importStatus = pgTable(
  "import_status",
  {
    importId: uuid("import_id").primaryKey().notNull().defaultRandom(),
    siteId: integer("site_id").notNull(),
    organizationId: text("organization_id").notNull(),
    platform: importPlatformEnum("platform").notNull(),
    importedEvents: integer("imported_events").notNull().default(0),
    skippedEvents: integer("skipped_events").notNull().default(0),
    invalidEvents: integer("invalid_events").notNull().default(0),
    startedAt: timestamp("started_at", { mode: "string" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "string" }),
  },
  table => [
    foreignKey({
      columns: [table.siteId],
      foreignColumns: [sites.siteId],
      name: "import_status_site_id_sites_site_id_fk",
    }),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "import_status_organization_id_organization_id_fk",
    }),
  ]
);
