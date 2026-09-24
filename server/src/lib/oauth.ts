import { mcp } from "@better-auth/mcp";
import { getOAuthProviderApi } from "@better-auth/oauth-provider";
import { createAuthEndpoint } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { z } from "zod";
import { ALL_SCOPE_STRINGS, OIDC_STANDARD_SCOPES } from "./scopes.js";

export function getAuthBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.BASE_URL || env.BETTER_AUTH_URL || "http://localhost:3002")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/auth$/, "");
}

export function createOAuthPlugins(baseUrl: string) {
  const resource = `${baseUrl}/api/mcp`;
  const url = new URL(baseUrl);
  const supportsOAuth =
    url.protocol === "https:" ||
    (url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "[::1]" || /^127\./.test(url.hostname)));
  const options = {
    loginPage: `${baseUrl}/login`,
    consentPage: `${baseUrl}/auth/consent`,
    resource,
    resources: [resource],
    // Separate stores let the migration preserve 1.6 tokens and consent for
    // rollback without ever accepting them through the 1.7 verifier.
    schema: {
      oauthAccessToken: { modelName: "oauthAccessTokenV2" },
      oauthConsent: { modelName: "oauthConsentV2" },
    },
    scopes: [...OIDC_STANDARD_SCOPES, ...ALL_SCOPE_STRINGS],
    grantTypes: ["authorization_code", "refresh_token"] as ("authorization_code" | "refresh_token")[],
    // Existing MCP clients use DCR. Keep it explicitly enabled after 1.7.
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    // There is one public resource. Imported 1.6 clients have no resource
    // join rows; issued tokens are still bound to this resource and verified.
    enforcePerClientResources: false,
  };
  return [
    // Non-TLS LAN self-hosting still supports password sessions and API keys.
    // Better Auth 1.7 requires HTTPS (or loopback) for an OAuth resource.
    ...(supportsOAuth ? [jwt(), mcp(options)] : []),
    {
      id: "rybbit-oauth",
      endpoints: {
        // Keep verification inside a Better Auth endpoint context so the
        // provider checks signatures, expiry, linked sessions and client state.
        // JWTs have no per-token revocation check; see the rollout notes.
        // This capability is never exposed as an HTTP route.
        verifyRybbitOAuthToken: createAuthEndpoint(
          "/rybbit/verify-oauth",
          {
            method: "POST",
            body: z.object({ token: z.string() }),
            metadata: { SERVER_ONLY: true },
          },
          async ctx => {
            if (!supportsOAuth) return null;
            const token = await getOAuthProviderApi(ctx, options).requireActiveAccessToken(ctx.body.token);
            const audiences = Array.isArray(token.aud) ? token.aud : [token.aud];
            // These routes accept Bearer only. A bound token must never bypass
            // proof validation by being presented as an ordinary bearer token.
            if (!token.sub || !token.exp || token.cnf || !audiences.includes(resource)) return null;
            return {
              userId: token.sub,
              accessTokenExpiresAt: new Date(token.exp * 1000),
              scopes: typeof token.scope === "string" ? token.scope : "",
            };
          }
        ),
      },
    },
  ];
}
