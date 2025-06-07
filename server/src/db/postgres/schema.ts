import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  foreignKey,
  unique,
} from "drizzle-orm/pg-core";

// User table
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
    stripeCustomerId: text(),
    overMonthlyLimit: boolean().default(false),
    monthlyEventCount: integer().default(0),
  },
  (table) => [
    unique("user_username_unique").on(table.username),
    unique("user_email_unique").on(table.email),
  ]
);

export const verification = pgTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }),
  updatedAt: timestamp({ mode: "string" }),
});

// Sites table
export const sites = pgTable(
  "sites",
  {
    siteId: serial("site_id").primaryKey().notNull(),
    name: text("name").notNull(),
    domains: text("domains").array().notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    organizationId: text("organization_id").references(() => organization.id),
    public: boolean().default(false),
    saltUserIds: boolean().default(false),
    blockBots: boolean().default(true).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "sites_created_by_user_id_fk",
    }),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "sites_organization_id_organization_id_fk",
    }),
  ]
);

// Active sessions table
export const activeSessions = pgTable("active_sessions", {
  sessionId: text("session_id").primaryKey().notNull(),
  siteId: integer("site_id"),
  userId: text("user_id"),
  hostname: text("hostname"),
  startTime: timestamp("start_time").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  pageviews: integer("pageviews").default(0),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  deviceType: text("device_type"),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  language: text("language"),
  referrer: text("referrer"),
});

export const funnels = pgTable(
  "funnels",
  {
    reportId: serial("report_id").primaryKey().notNull(),
    siteId: integer("site_id"),
    userId: text("user_id"),
    data: jsonb(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.siteId],
      foreignColumns: [sites.siteId],
      name: "funnels_site_id_sites_site_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "funnels_user_id_user_id_fk",
    }),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey().notNull(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ mode: "string" }),
    refreshTokenExpiresAt: timestamp({ mode: "string" }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ mode: "string" }).notNull(),
    updatedAt: timestamp({ mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "account_userId_user_id_fk",
    }),
  ]
);

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
  },
  (table) => [unique("organization_slug_unique").on(table.slug)]
);

export const member = pgTable(
  "member",
  {
    id: text().primaryKey().notNull(),
    organizationId: text().notNull(),
    userId: text().notNull(),
    role: text().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "member_organizationId_organization_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "member_userId_user_id_fk",
    }),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    inviterId: text().notNull(),
    organizationId: text().notNull(),
    role: text().notNull(),
    status: text().notNull(),
    expiresAt: timestamp({ mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.inviterId],
      foreignColumns: [user.id],
      name: "invitation_inviterId_user_id_fk",
    }),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "invitation_organizationId_organization_id_fk",
    }),
  ]
);

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
    userId: text().notNull(),
    impersonatedBy: text(),
    activeOrganizationId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_userId_user_id_fk",
    }),
    unique("session_token_unique").on(table.token),
  ]
);

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
  (table) => [
    foreignKey({
      columns: [table.siteId],
      foreignColumns: [sites.siteId],
      name: "goals_site_id_sites_site_id_fk",
    }),
  ]
);
