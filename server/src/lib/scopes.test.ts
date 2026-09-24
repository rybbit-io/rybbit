import { describe, expect, it } from "vitest";
import {
  ALL_SCOPE_STRINGS,
  apiKeyPermissionsSchema,
  hasScope,
  parseOAuthScopes,
  scopeToString,
  statementsFromApiKeyPermissions,
  toScopeStrings,
} from "./scopes.js";

describe("parseOAuthScopes", () => {
  it("treats legacy and standard-only scope strings as unrestricted (null)", () => {
    expect(parseOAuthScopes(null)).toBeNull();
    expect(parseOAuthScopes(undefined)).toBeNull();
    expect(parseOAuthScopes("")).toBeNull();
    expect(parseOAuthScopes("openid")).toBeNull();
    expect(parseOAuthScopes("openid profile email offline_access")).toBeNull();
  });

  it("parses custom scopes alongside standard ones", () => {
    expect(parseOAuthScopes("openid goals:write")).toEqual({ goals: ["write"] });
    expect(parseOAuthScopes("goals:read goals:write sites:read")).toEqual({
      goals: ["read", "write"],
      sites: ["read"],
    });
  });

  it("drops unknown custom scopes without becoming unrestricted", () => {
    // Custom entries were present, so the result must stay non-null: a token
    // carrying only unknown scopes is denied everything, never unrestricted.
    expect(parseOAuthScopes("openid bogus:thing")).toEqual({});
    expect(parseOAuthScopes("sql:write")).toEqual({});
    expect(parseOAuthScopes("ingest:read")).toEqual({});
    expect(parseOAuthScopes("goals:read:extra")).toEqual({});
  });

  it("deduplicates repeated scopes", () => {
    expect(parseOAuthScopes("goals:read goals:read")).toEqual({ goals: ["read"] });
  });
});

describe("statementsFromApiKeyPermissions", () => {
  it("treats null/undefined (legacy keys) as unrestricted", () => {
    expect(statementsFromApiKeyPermissions(null)).toBeNull();
    expect(statementsFromApiKeyPermissions(undefined)).toBeNull();
  });

  it("keeps valid entries and drops invalid ones", () => {
    expect(statementsFromApiKeyPermissions({ goals: ["read", "write"], sites: ["read"] })).toEqual({
      goals: ["read", "write"],
      sites: ["read"],
    });
    expect(statementsFromApiKeyPermissions({ goals: ["read"], bogus: ["write"], sql: ["write"] })).toEqual({
      goals: ["read"],
    });
  });

  it("fails closed on malformed input", () => {
    expect(statementsFromApiKeyPermissions("goals:read")).toEqual({});
    expect(statementsFromApiKeyPermissions(42)).toEqual({});
    expect(statementsFromApiKeyPermissions(["goals:read"])).toEqual({});
    expect(statementsFromApiKeyPermissions({ goals: "write" })).toEqual({});
    expect(statementsFromApiKeyPermissions({})).toEqual({});
  });
});

describe("hasScope", () => {
  it("null statements are unrestricted", () => {
    expect(hasScope(null, { resource: "goals", action: "write" })).toBe(true);
    expect(hasScope(null, { resource: "sql", action: "read" })).toBe(true);
  });

  it("empty statements deny everything", () => {
    // The null vs {} distinction is the core invariant of the scope system.
    expect(hasScope({}, { resource: "analytics", action: "read" })).toBe(false);
    expect(hasScope({}, { resource: "goals", action: "write" })).toBe(false);
  });

  it("matches exact grants and denies missing ones", () => {
    const statements = { goals: ["read" as const], sites: ["write" as const] };
    expect(hasScope(statements, { resource: "goals", action: "read" })).toBe(true);
    expect(hasScope(statements, { resource: "goals", action: "write" })).toBe(false);
    expect(hasScope(statements, { resource: "analytics", action: "read" })).toBe(false);
  });

  it("write implies read on the same resource", () => {
    const statements = { sites: ["write" as const] };
    expect(hasScope(statements, { resource: "sites", action: "read" })).toBe(true);
    expect(hasScope(statements, { resource: "sites", action: "write" })).toBe(true);
    expect(hasScope(statements, { resource: "goals", action: "read" })).toBe(false);
  });
});

describe("scope string round-trips", () => {
  it("toScopeStrings inverts parseOAuthScopes", () => {
    const statements = { goals: ["read" as const, "write" as const], analytics: ["read" as const] };
    const strings = toScopeStrings(statements);
    expect(strings.sort()).toEqual(["analytics:read", "goals:read", "goals:write"]);
    expect(parseOAuthScopes(strings.join(" "))).toEqual(statements);
  });

  it("every ALL_SCOPE_STRINGS entry parses back to itself", () => {
    for (const scope of ALL_SCOPE_STRINGS) {
      const parsed = parseOAuthScopes(scope);
      expect(parsed).not.toBeNull();
      expect(toScopeStrings(parsed!)).toEqual([scope]);
    }
  });

  it("scopeToString formats requirements", () => {
    expect(scopeToString({ resource: "org", action: "write" })).toBe("org:write");
  });
});

describe("apiKeyPermissionsSchema", () => {
  it("accepts valid permission records", () => {
    expect(apiKeyPermissionsSchema.safeParse({ goals: ["read", "write"], analytics: ["read"] }).success).toBe(true);
  });

  it("rejects the empty object", () => {
    const result = apiKeyPermissionsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects unknown resources and invalid actions", () => {
    expect(apiKeyPermissionsSchema.safeParse({ bogus: ["read"] }).success).toBe(false);
    expect(apiKeyPermissionsSchema.safeParse({ sql: ["write"] }).success).toBe(false);
    expect(apiKeyPermissionsSchema.safeParse({ ingest: ["read"] }).success).toBe(false);
    expect(apiKeyPermissionsSchema.safeParse({ goals: [] }).success).toBe(false);
  });
});
