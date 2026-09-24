import {
  ALL_SCOPE_STRINGS,
  isValidScopePair,
  OIDC_STANDARD_SCOPES,
  SCOPE_MATRIX,
  SCOPE_RESOURCES,
  type ScopeAction,
  type ScopeRequirement,
  type ScopeResource,
  type ScopeStatements,
} from "@rybbit/shared";
import { role } from "better-auth/plugins/access";
import { z } from "zod";

/**
 * Enforcement helpers for the scope taxonomy defined in @rybbit/shared.
 *
 * The same resource:action pairs serve both credential types: API keys store
 * them as a Record<resource, actions[]> in better-auth's `permissions` field,
 * OAuth tokens carry them as space-separated "resource:action" scope strings.
 *
 * Semantics:
 * - `null` statements = UNRESTRICTED (legacy credentials created before scopes
 *   existed, or credentials deliberately issued with full access).
 * - `{}` statements = deny-all. Never conflate the two.
 * - `write` implies `read` on the same resource (a goals:write credential can
 *   list goals). Checked in hasScope, not stored.
 * - Scopes only constrain bearer credentials; cookie sessions bypass them.
 * - Scopes never elevate: role requirements (org admin/owner) still apply.
 *
 * Leaf module: keep free of ./auth.js imports so the MCP tools and their tests
 * can load it without dragging in the better-auth init chain.
 */
// Re-export the shared taxonomy so existing server imports keep resolving here.
export { ALL_SCOPE_STRINGS, OIDC_STANDARD_SCOPES, SCOPE_MATRIX };
export type { ScopeAction, ScopeRequirement, ScopeResource, ScopeStatements };

const isValidPair = isValidScopePair;

export function scopeToString(requirement: ScopeRequirement): string {
  return `${requirement.resource}:${requirement.action}`;
}

export function toScopeStrings(statements: ScopeStatements): string[] {
  return Object.entries(statements).flatMap(([resource, actions]) =>
    (actions ?? []).map(action => `${resource}:${action}`)
  );
}

/**
 * OAuth scope string (space-separated) → statements.
 * Standard OIDC scopes are stripped first; if nothing custom remains the
 * credential predates scoping (or requested none) and is UNRESTRICTED (null).
 * When custom entries are present, unknown ones are dropped but the result
 * stays non-null — a token carrying only unknown custom scopes gets {} and is
 * denied everything (fail closed).
 */
export function parseOAuthScopes(scope: string | null | undefined): ScopeStatements | null {
  const custom = (scope ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter(entry => !(OIDC_STANDARD_SCOPES as readonly string[]).includes(entry));

  if (custom.length === 0) {
    return null;
  }

  const statements: ScopeStatements = {};
  for (const entry of custom) {
    const [resource, action, ...rest] = entry.split(":");
    if (!resource || !action || rest.length > 0 || !isValidPair(resource, action)) {
      continue;
    }
    const existing = statements[resource] ?? [];
    if (!existing.includes(action as ScopeAction)) {
      statements[resource] = [...existing, action as ScopeAction];
    }
  }
  return statements;
}

/**
 * API-key permissions (the PARSED object from verifyApiKey's result.key) →
 * statements. null/undefined = legacy key = UNRESTRICTED. Anything else keeps
 * only valid resource/action entries; malformed input yields {} (fail closed).
 */
export function statementsFromApiKeyPermissions(permissions: unknown): ScopeStatements | null {
  if (permissions === null || permissions === undefined) {
    return null;
  }

  const statements: ScopeStatements = {};
  if (typeof permissions === "object" && !Array.isArray(permissions)) {
    for (const [resource, actions] of Object.entries(permissions)) {
      if (!Array.isArray(actions)) continue;
      const valid = actions.filter(
        (action): action is ScopeAction => typeof action === "string" && isValidPair(resource, action)
      );
      if (valid.length > 0) {
        statements[resource as ScopeResource] = [...new Set(valid)];
      }
    }
  }
  return statements;
}

/**
 * Does the credential satisfy the requirement? null = unrestricted. A `read`
 * requirement is satisfied by `write` on the same resource. Delegates the
 * subset match to better-auth's access matcher.
 */
export function hasScope(statements: ScopeStatements | null, requirement: ScopeRequirement): boolean {
  if (statements === null) {
    return true;
  }
  const matcher = role(statements as Record<string, string[]>);
  if (matcher.authorize({ [requirement.resource]: [requirement.action] }).success) {
    return true;
  }
  if (requirement.action === "read") {
    return matcher.authorize({ [requirement.resource]: ["write"] }).success;
  }
  return false;
}

/**
 * Body schema for scoped API-key creation. Omit `permissions` entirely for a
 * full-access key; an empty object would create a key that can do nothing, so
 * it is rejected.
 */
export const apiKeyPermissionsSchema = z
  .record(z.string(), z.array(z.string()).min(1, "Each resource needs at least one action"))
  .superRefine((value, ctx) => {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Omit permissions entirely for full access; an empty permissions object would deny everything",
      });
      return;
    }
    for (const [resource, actions] of entries) {
      if (!SCOPE_RESOURCES.includes(resource as ScopeResource)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown resource "${resource}". Valid resources: ${SCOPE_RESOURCES.join(", ")}`,
        });
        continue;
      }
      for (const action of actions) {
        if (!isValidPair(resource, action)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid action "${action}" for resource "${resource}". Valid: ${(SCOPE_MATRIX[resource as ScopeResource] as readonly string[]).join(", ")}`,
          });
        }
      }
    }
  }) as z.ZodType<ScopeStatements>;
