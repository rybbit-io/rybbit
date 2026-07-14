import type { FastifyRequest } from "fastify";

interface ApiKeyVerificationResult {
  valid: boolean;
  key?: {
    referenceId?: string | null;
  } | null;
  error?: {
    code?: string;
  } | null;
}

export interface McpAuthenticatorDependencies {
  verifyApiKey: (apiKey: string) => Promise<ApiKeyVerificationResult>;
}

export interface McpAuthContext {
  userId: string;
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

// Dynamic import keeps the MCP module (and its tests) from loading the full
// better-auth dependency chain at import time.
const defaultDependencies: McpAuthenticatorDependencies = {
  verifyApiKey: async apiKey => {
    const { auth } = await import("../lib/auth.js");
    return auth.api.verifyApiKey({ body: { key: apiKey } });
  },
};

/**
 * Verifies the API key once per MCP HTTP request, before any protocol message
 * is processed. Tool calls still go through the REST routes' own auth and
 * access checks; this guard exists so initialize/tools/list never run for an
 * invalid key and so clients get proper HTTP-level 401/429/503 responses.
 */
export function createMcpAuthenticator(dependencies: McpAuthenticatorDependencies = defaultDependencies) {
  return async (request: FastifyRequest): Promise<McpAuthContext> => {
    const apiKey = extractBearerToken(request.headers.authorization);
    if (!apiKey) {
      throw new McpAuthenticationError(
        "Unauthorized: send a Rybbit API key as 'Authorization: Bearer <key>'. Create one under Settings > Account > API Keys.",
        401
      );
    }

    let verification: ApiKeyVerificationResult;
    try {
      verification = await dependencies.verifyApiKey(apiKey);
    } catch {
      throw new McpAuthenticationError("Rybbit could not verify the API key", 503);
    }

    if (!verification.valid) {
      if (verification.error?.code === "RATE_LIMITED") {
        throw new McpAuthenticationError("API key rate limit exceeded", 429);
      }
      throw new McpAuthenticationError("Invalid Rybbit API key", 401);
    }

    const userId = verification.key?.referenceId;
    if (!userId) {
      throw new McpAuthenticationError("API key is not associated with a Rybbit user", 401);
    }

    return { userId };
  };
}

export type McpAuthenticator = ReturnType<typeof createMcpAuthenticator>;
export const authenticateMcpRequest = createMcpAuthenticator();
