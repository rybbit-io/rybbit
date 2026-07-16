import { randomUUID } from "node:crypto";
import { parseOAuthScopes, statementsFromApiKeyPermissions, type ScopeStatements } from "./scopes.js";

/**
 * Shared bearer-credential resolution for the MCP gate and the REST guards.
 *
 * Leaf module: imports only scopes.js (a leaf) and node:crypto — never auth.js
 * — so the MCP layer and its tests can use it without loading the better-auth
 * init chain. Callers inject the verify/lookup dependencies.
 */

/** Canonical bearer parser. The gate and REST must agree, or a request that
 *  authenticates at one layer fails at the other. Mirrors the REST layer's
 *  historical `startsWith("Bearer ") ? substring(7) : null`. */
export function extractBearerToken(authorization: string | string[] | undefined): string | null {
  if (typeof authorization !== "string") {
    return null;
  }
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }
  return authorization.substring(7) || null;
}

export interface ApiKeyVerification {
  valid: boolean;
  key?: { referenceId?: string | null; permissions?: unknown } | null;
  error?: { code?: string } | null;
}

export type OAuthTokenLookup = {
  userId?: string | null;
  accessTokenExpiresAt?: Date | string | null;
  scopes?: string | null;
} | null;

export interface BearerResolverDeps {
  verifyApiKey: (token: string) => Promise<ApiKeyVerification>;
  getOAuthSession: (token: string) => Promise<OAuthTokenLookup>;
}

export type BearerIdentityStatus = "valid" | "invalid" | "rate_limited" | "verify_error";

export interface BearerIdentity {
  status: BearerIdentityStatus;
  userId?: string;
  /** null = unrestricted (legacy key / full OAuth grant); enforced by callers. */
  statements: ScopeStatements | null;
}

export function isUsableOAuthToken(token: OAuthTokenLookup): token is NonNullable<OAuthTokenLookup> {
  if (!token?.userId) {
    return false;
  }
  // Defense in depth: reject expired tokens even if the lookup returned one.
  return !token.accessTokenExpiresAt || new Date(token.accessTokenExpiresAt).getTime() > Date.now();
}

/**
 * The one credential-resolution ladder: API key, then OAuth access token.
 * Returns identity (userId + scope statements) only — org-role resolution is a
 * cheap DB query the caller does per route, and it never touches the rate
 * limiter, so it does not need deduplicating.
 */
export async function resolveBearerIdentity(token: string, deps: BearerResolverDeps): Promise<BearerIdentity> {
  let verifyError = false;
  let verification: ApiKeyVerification | null = null;
  try {
    verification = await deps.verifyApiKey(token);
  } catch {
    verifyError = true;
  }

  if (verification?.valid && verification.key?.referenceId) {
    return {
      status: "valid",
      userId: verification.key.referenceId,
      statements: statementsFromApiKeyPermissions(verification.key.permissions),
    };
  }

  if (verification?.error?.code === "RATE_LIMITED") {
    return { status: "rate_limited", statements: null };
  }

  // Not a valid API key — try it as an OAuth access token. Tolerate lookup
  // failures (e.g. OAuth tables not migrated yet) so API-key auth is unaffected.
  let oauth: OAuthTokenLookup = null;
  try {
    oauth = await deps.getOAuthSession(token);
  } catch {
    oauth = null;
  }

  if (isUsableOAuthToken(oauth)) {
    return {
      status: "valid",
      userId: oauth.userId as string,
      statements: parseOAuthScopes(typeof oauth.scopes === "string" ? oauth.scopes : null),
    };
  }

  return { status: verifyError ? "verify_error" : "invalid", statements: null };
}

/**
 * In-process handoff so the MCP gate's one verification is not repeated by the
 * REST route it proxies to (better-auth's verifyApiKey has no non-counting
 * mode, so a second call would consume the rate limit twice per tool call).
 *
 * A pure optimization that fails safe: a missing, stale, or mismatched nonce
 * simply falls through to normal verification. The nonce is a crypto-random
 * handle to in-memory state that only the in-process proxy sets, and it is
 * additionally bound to the exact credential — so a forged header can never
 * authenticate as another user.
 */
export const INTERNAL_BEARER_HANDOFF_HEADER = "x-rybbit-mcp-bearer";

interface HandoffEntry {
  token: string;
  identity: BearerIdentity;
}
const handoffs = new Map<string, HandoffEntry>();

export function registerBearerHandoff(token: string, identity: BearerIdentity): string {
  const nonce = randomUUID();
  handoffs.set(nonce, { token, identity });
  return nonce;
}

export function releaseBearerHandoff(nonce: string | undefined): void {
  if (nonce) {
    handoffs.delete(nonce);
  }
}

export function consumeBearerHandoff(
  nonce: string | string[] | undefined,
  token: string | null
): BearerIdentity | null {
  if (typeof nonce !== "string" || !token) {
    return null;
  }
  const entry = handoffs.get(nonce);
  if (!entry || entry.token !== token) {
    return null;
  }
  return entry.identity;
}
