import type { FastifyRequest } from "fastify";
import { parseOAuthScopes, statementsFromApiKeyPermissions, type ScopeStatements } from "../lib/scopes.js";

interface ApiKeyVerificationResult {
  valid: boolean;
  key?: {
    referenceId?: string | null;
    permissions?: unknown;
  } | null;
  error?: {
    code?: string;
  } | null;
}

export type OAuthTokenResult = {
  userId?: string | null;
  accessTokenExpiresAt?: Date | string | null;
  scopes?: string | null;
} | null;

export interface McpAuthenticatorDependencies {
  verifyApiKey: (apiKey: string) => Promise<ApiKeyVerificationResult>;
  getOAuthSession: (bearerToken: string) => Promise<OAuthTokenResult>;
}

export interface McpAuthContext {
  userId: string;
  /** null = unrestricted credential (legacy key / full OAuth grant). */
  scopes: ScopeStatements | null;
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

export function extractBearerToken(authorization: string | string[] | undefined): string | null {
  if (typeof authorization !== "string") {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
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

export function isUsableOAuthToken(token: OAuthTokenResult): token is NonNullable<OAuthTokenResult> {
  if (!token?.userId) {
    return false;
  }
  // Defense in depth: reject expired tokens even if the lookup returned one.
  return !token.accessTokenExpiresAt || new Date(token.accessTokenExpiresAt).getTime() > Date.now();
}

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

    let verification: ApiKeyVerificationResult | null = null;
    let verificationFailed = false;
    try {
      verification = await dependencies.verifyApiKey(bearerToken);
    } catch {
      verificationFailed = true;
    }

    if (verification?.valid) {
      const userId = verification.key?.referenceId;
      if (!userId) {
        throw new McpAuthenticationError("API key is not associated with a Rybbit user", 401);
      }
      return { userId, scopes: statementsFromApiKeyPermissions(verification.key?.permissions) };
    }

    if (verification?.error?.code === "RATE_LIMITED") {
      throw new McpAuthenticationError("API key rate limit exceeded", 429);
    }

    // Not a valid API key — try it as an OAuth access token. Tolerate lookup
    // failures (e.g. self-hosted instances that have not migrated the OAuth
    // tables yet) so API-key behavior is unaffected.
    let oauthToken: OAuthTokenResult = null;
    try {
      oauthToken = await dependencies.getOAuthSession(bearerToken);
    } catch {
      oauthToken = null;
    }

    if (isUsableOAuthToken(oauthToken)) {
      return { userId: oauthToken.userId as string, scopes: parseOAuthScopes(oauthToken.scopes) };
    }

    if (verificationFailed) {
      throw new McpAuthenticationError("Rybbit could not verify the API key", 503);
    }
    throw new McpAuthenticationError("Invalid or expired credentials", 401);
  };
}

export type McpAuthenticator = ReturnType<typeof createMcpAuthenticator>;
export const authenticateMcpRequest = createMcpAuthenticator();
