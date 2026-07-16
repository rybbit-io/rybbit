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

export function isValidScopePair(resource: string, action: string): resource is ScopeResource {
  const actions = SCOPE_MATRIX[resource as ScopeResource] as readonly string[] | undefined;
  return !!actions && actions.includes(action);
}
