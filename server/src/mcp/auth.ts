import type { FastifyRequest } from "fastify";
import {
  extractBearerToken,
  resolveBearerIdentity,
  type BearerIdentity,
  type BearerResolverDeps,
} from "../lib/bearerAuth.js";
import type { ScopeStatements } from "../lib/scopes.js";

export { extractBearerToken };
export type McpAuthenticatorDependencies = BearerResolverDeps;

export interface McpAuthContext {
  userId: string;
  /** null = unrestricted credential (legacy key / full OAuth grant). */
  scopes: ScopeStatements | null;
  /** The resolved identity, so the endpoint can register a proxy handoff. */
  identity: BearerIdentity;
}

export class McpAuthenticationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 429 | 503
  ) {
    super(message);
    this.name = "McpAuthenticationError";
  }
}

// Dynamic imports keep the MCP module (and its tests) from loading the full
// better-auth dependency chain at import time.
const defaultDependencies: McpAuthenticatorDependencies = {
  verifyApiKey: async apiKey => {
    const { auth } = await import("../lib/auth.js");
    return auth.api.verifyApiKey({ body: { key: apiKey } });
  },
  getOAuthSession: async bearerToken => {
    const { auth } = await import("../lib/auth.js");
    return auth.api.getMcpSession({ headers: new Headers({ authorization: `Bearer ${bearerToken}` }) });
  },
};

/**
 * Verifies the bearer credential once per MCP HTTP request, before any
 * protocol message is processed: first as a Rybbit API key, then as an OAuth
 * access token issued by the better-auth MCP plugin. Tool calls still go
 * through the REST routes' own auth and access checks; this guard exists so
 * initialize/tools/list never run for an invalid credential and so clients get
 * proper HTTP-level 401/429/503 responses.
 */
export function createMcpAuthenticator(dependencies: McpAuthenticatorDependencies = defaultDependencies) {
  return async (request: FastifyRequest): Promise<McpAuthContext> => {
    const bearerToken = extractBearerToken(request.headers.authorization);
    if (!bearerToken) {
      throw new McpAuthenticationError(
        "Unauthorized: send a Rybbit API key as 'Authorization: Bearer <key>' (Settings > Account > API Keys), or connect with an OAuth-capable MCP client.",
        401
      );
    }

    const identity = await resolveBearerIdentity(bearerToken, dependencies);
    switch (identity.status) {
      case "valid":
        return { userId: identity.userId!, scopes: identity.statements, identity };
      case "rate_limited":
        throw new McpAuthenticationError("API key rate limit exceeded", 429);
      case "verify_error":
        throw new McpAuthenticationError("Rybbit could not verify the API key", 503);
      default:
        throw new McpAuthenticationError("Invalid or expired credentials", 401);
    }
  };
}

export type McpAuthenticator = ReturnType<typeof createMcpAuthenticator>;
export const authenticateMcpRequest = createMcpAuthenticator();
