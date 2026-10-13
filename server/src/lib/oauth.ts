import { mcp } from "@better-auth/mcp";
import { getOAuthProviderApi } from "@better-auth/oauth-provider";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { z } from "zod";
import { ALL_SCOPE_STRINGS, OIDC_STANDARD_SCOPES } from "./scopes.js";

export function getAuthBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.BASE_URL || env.BETTER_AUTH_URL || "http://localhost:3002")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/auth$/, "");
}

function hasNonHttpsRedirectUri(redirectUris: unknown): boolean {
  if (!Array.isArray(redirectUris)) return false;
  return redirectUris.some(uri => {
    // Parse like the provider does, so the scheme seen here is the one it
    // validates. Unparseable entries are left for the provider to reject.
    try {
      return typeof uri === "string" && new URL(uri).protocol !== "https:";
    } catch {
      return false;
    }
  });
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
      hooks: {
        before: [
          {
            matcher: (ctx: { path?: string }) => ctx.path === "/oauth2/register",
            // The provider defaults an omitted application_type to "web",
            // which forbids http://localhost callbacks. Most MCP clients
            // register a loopback callback and never send the field, so infer
            // "native" for them. Native validation still vets every URI.
            handler: createAuthMiddleware(async ctx => {
              const body = ctx.body as { application_type?: unknown; redirect_uris?: unknown } | undefined;
              if (!body || body.application_type !== undefined || !hasNonHttpsRedirectUri(body.redirect_uris)) return;
              return { context: { body: { ...body, application_type: "native" } } };
            }),
          },
        ],
      },
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
