// Scope taxonomy for bearer credentials (API keys and OAuth access tokens).
// Pure data — no runtime dependencies — so both the server (enforcement,
// zod validation) and the client (scope picker) can share one source of truth.

export const SCOPE_MATRIX = {
  analytics: ["read"],
  sessions: ["read"],
  events: ["read"],
  users: ["read", "write"],
  goals: ["read", "write"],
  funnels: ["read", "write"],
  dashboards: ["read", "write"],
  flags: ["read", "write"],
  experiments: ["read", "write"],
  sites: ["read", "write"],
  gsc: ["read", "write"],
  org: ["read", "write"],
  replay: ["read", "write"],
  sql: ["read"],
  ingest: ["write"],
} as const;

export type ScopeResource = keyof typeof SCOPE_MATRIX;
export type ScopeAction = "read" | "write";
export type ScopeStatements = Partial<Record<ScopeResource, ScopeAction[]>>;
export interface ScopeRequirement {
  resource: ScopeResource;
  action: ScopeAction;
}

export const OIDC_STANDARD_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

export const SCOPE_RESOURCES = Object.keys(SCOPE_MATRIX) as ScopeResource[];

/** Every valid "resource:action" string, e.g. "analytics:read", "goals:write". */
export const ALL_SCOPE_STRINGS: readonly string[] = SCOPE_RESOURCES.flatMap(resource =>
  (SCOPE_MATRIX[resource] as readonly string[]).map(action => `${resource}:${action}`)
);

/** Human-readable metadata for a resource, for the scope-picker UI. */
export interface ScopeDescriptor {
  resource: ScopeResource;
  label: string;
  description: string;
}

// Ordered for display; every SCOPE_MATRIX resource must appear here.
export const SCOPE_DESCRIPTORS: ScopeDescriptor[] = [
  { resource: "analytics", label: "Analytics", description: "Traffic overview, metrics, retention, journeys, performance, and errors" },
  { resource: "sessions", label: "Sessions", description: "Visitor sessions and their locations" },
  { resource: "events", label: "Events", description: "Raw events, custom event names, and properties" },
  { resource: "users", label: "Users", description: "Visitor profiles and traits; write covers identify and deletion" },
  { resource: "goals", label: "Goals", description: "Conversion goals" },
  { resource: "funnels", label: "Funnels", description: "Saved and ad-hoc conversion funnels" },
  { resource: "dashboards", label: "Dashboards", description: "Saved dashboards" },
  { resource: "flags", label: "Feature flags", description: "Feature flag definitions and evaluation" },
  { resource: "experiments", label: "Experiments", description: "A/B experiments and their results" },
  { resource: "sites", label: "Sites", description: "Site configuration; write covers create, update, and delete" },
  { resource: "gsc", label: "Search Console", description: "Google Search Console connection and data" },
  { resource: "org", label: "Organization", description: "Members and teams; write covers management" },
  { resource: "replay", label: "Session replay", description: "Recorded replays; write covers deletion" },
  { resource: "sql", label: "Custom SQL", description: "Read-only ClickHouse queries" },
  { resource: "ingest", label: "Event ingestion", description: "Trusted server-side event tracking" },
];

export function isValidScopePair(resource: string, action: string): resource is ScopeResource {
  const actions = SCOPE_MATRIX[resource as ScopeResource] as readonly string[] | undefined;
  return !!actions && actions.includes(action);
}
