import type { FastifyInstance, FastifyReply } from "fastify";

export interface OAuthWellKnownDependencies {
  getAuthorizationServerMetadata: () => Promise<object | null>;
  getProtectedResourceMetadata: () => Promise<object | null>;
}

// Dynamic imports keep this module (and its tests) from loading the full
// better-auth dependency chain at import time.
const defaultDependencies: OAuthWellKnownDependencies = {
  getAuthorizationServerMetadata: async () => {
    const { auth } = await import("../lib/auth.js");
    return auth.api.getMcpOAuthConfig();
  },
  getProtectedResourceMetadata: async () => {
    const { auth } = await import("../lib/auth.js");
    return auth.api.getMCPProtectedResource();
  },
};

/**
 * The RFC 9728 protected-resource-metadata URL advertised in WWW-Authenticate
 * challenges from /api/mcp, so OAuth-capable MCP clients can discover the
 * authorization server. Null when BASE_URL is not configured.
 */
export function getResourceMetadataUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const baseUrl = env.BASE_URL?.trim().replace(/\/$/, "");
  return baseUrl ? `${baseUrl}/.well-known/oauth-protected-resource` : null;
}

/**
 * Root-level OAuth discovery documents (RFC 8414 authorization-server metadata
 * and RFC 9728 protected-resource metadata). The better-auth MCP plugin serves
 * the same documents under /api/auth/*, but clients look for them at the
 * domain root, so they are re-exposed here. The path-suffixed
 * /.well-known/oauth-protected-resource/api/mcp variant covers clients that
 * append the resource path per RFC 9728 section 3.1.
 */
export function createOAuthWellKnownRoutes(dependencies: OAuthWellKnownDependencies = defaultDependencies) {
  return async function oauthWellKnownRoutes(fastify: FastifyInstance) {
    const send = async (reply: FastifyReply, load: () => Promise<object | null>) => {
      try {
        const metadata = await load();
        if (!metadata) {
          return reply.status(404).send({ error: "OAuth discovery metadata is not available" });
        }
        return reply.header("Cache-Control", "public, max-age=3600").send(metadata);
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to build OAuth discovery metadata");
        return reply.status(500).send({ error: "Failed to build OAuth discovery metadata" });
      }
    };

    // MCP clients try several discovery documents: RFC 8414 authorization
    // server metadata, OIDC discovery, and the path-inserted variants of both
    // for the /api/mcp resource. Serve the same metadata at all of them — the
    // better-auth MCP plugin's metadata is OIDC-compatible.
    const authorizationServerPaths = [
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-authorization-server/api/mcp",
      "/.well-known/openid-configuration",
      "/.well-known/openid-configuration/api/mcp",
    ];
    for (const path of authorizationServerPaths) {
      fastify.get(path, (_request, reply) => send(reply, dependencies.getAuthorizationServerMetadata));
    }

    fastify.get("/.well-known/oauth-protected-resource", (_request, reply) =>
      send(reply, dependencies.getProtectedResourceMetadata)
    );
    fastify.get("/.well-known/oauth-protected-resource/api/mcp", (_request, reply) =>
      send(reply, dependencies.getProtectedResourceMetadata)
    );
  };
}

export const oauthWellKnownRoutes = createOAuthWellKnownRoutes();
