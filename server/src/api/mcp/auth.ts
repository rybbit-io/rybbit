import type { FastifyRequest } from "fastify";

import type { AnalyticsAccessContext, AnalyticsSiteAccess } from "../../services/analytics/analyticsQueryService.js";

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
  resolveSites: (request: FastifyRequest) => Promise<unknown[]>;
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

const defaultDependencies: McpAuthenticatorDependencies = {
  verifyApiKey: async apiKey => {
    const { auth } = await import("../../lib/auth.js");
    return auth.api.verifyApiKey({ body: { key: apiKey } });
  },
  resolveSites: async request => {
    const { getSitesUserHasAccessTo } = await import("../../lib/auth-utils.js");
    return getSitesUserHasAccessTo(request);
  },
};

function toSiteAccess(site: any): AnalyticsSiteAccess {
  return {
    siteId: Number(site.siteId),
    organizationId: typeof site.organizationId === "string" ? site.organizationId : null,
    name: typeof site.name === "string" ? site.name : `Site ${site.siteId}`,
    domain: typeof site.domain === "string" ? site.domain : "",
    type: site.type === "web" || site.type === "mobile" ? site.type : null,
  };
}

export function createMcpAuthenticator(dependencies: McpAuthenticatorDependencies = defaultDependencies) {
  return async (request: FastifyRequest): Promise<AnalyticsAccessContext> => {
    const apiKey = extractBearerToken(request.headers.authorization);
    if (!apiKey) {
      throw new McpAuthenticationError("Provide a Rybbit API key as an Authorization Bearer token", 401);
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

    request.user = { id: userId };
    let resolvedSites: unknown[];
    try {
      resolvedSites = await dependencies.resolveSites(request);
    } catch {
      throw new McpAuthenticationError("Rybbit could not resolve site access", 503);
    }

    const sites = resolvedSites
      .map(toSiteAccess)
      .filter(site => Number.isInteger(site.siteId) && site.siteId > 0)
      .sort((left, right) => left.siteId - right.siteId);

    return { userId, sites };
  };
}

export type McpAuthenticator = ReturnType<typeof createMcpAuthenticator>;
export const authenticateMcpRequest = createMcpAuthenticator();
