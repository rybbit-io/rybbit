import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createOAuthWellKnownRoutes, getResourceMetadataUrl, type OAuthWellKnownDependencies } from "./wellKnown.js";

const AS_METADATA = {
  issuer: "https://rybbit.example.com",
  authorization_endpoint: "https://rybbit.example.com/api/auth/mcp/authorize",
  token_endpoint: "https://rybbit.example.com/api/auth/mcp/token",
  registration_endpoint: "https://rybbit.example.com/api/auth/mcp/register",
};

const PR_METADATA = {
  resource: "https://rybbit.example.com/api/mcp",
  authorization_servers: ["https://rybbit.example.com"],
  bearer_methods_supported: ["header"],
};

describe("oauth well-known routes", () => {
  let app: FastifyInstance;

  async function buildApp(overrides: Partial<OAuthWellKnownDependencies> = {}) {
    app = Fastify();
    app.register(
      createOAuthWellKnownRoutes({
        getAuthorizationServerMetadata: async () => AS_METADATA,
        getProtectedResourceMetadata: async () => PR_METADATA,
        ...overrides,
      })
    );
    await app.ready();
    return app;
  }

  afterEach(async () => {
    await app?.close();
  });

  it("serves authorization server metadata at every discovery variant clients try", async () => {
    await buildApp();

    for (const url of [
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-authorization-server/api/mcp",
      "/.well-known/openid-configuration",
      "/.well-known/openid-configuration/api/mcp",
    ]) {
      const response = await app.inject({ method: "GET", url });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.headers["cache-control"]).toContain("max-age");
      expect(response.json()).toEqual(AS_METADATA);
    }
  });

  it("serves protected resource metadata at both path variants", async () => {
    await buildApp();

    const root = await app.inject({ method: "GET", url: "/.well-known/oauth-protected-resource" });
    expect(root.statusCode).toBe(200);
    expect(root.json()).toEqual(PR_METADATA);

    // RFC 9728 path-appended form for the /api/mcp resource
    const suffixed = await app.inject({ method: "GET", url: "/.well-known/oauth-protected-resource/api/mcp" });
    expect(suffixed.statusCode).toBe(200);
    expect(suffixed.json()).toEqual(PR_METADATA);
  });

  it("returns 404 when metadata is unavailable", async () => {
    await buildApp({ getAuthorizationServerMetadata: async () => null });
    const response = await app.inject({ method: "GET", url: "/.well-known/oauth-authorization-server" });

    expect(response.statusCode).toBe(404);
  });

  it("returns 500 without leaking details when metadata building throws", async () => {
    await buildApp({
      getProtectedResourceMetadata: async () => {
        throw new Error("db exploded at 10.0.0.5");
      },
    });
    const response = await app.inject({ method: "GET", url: "/.well-known/oauth-protected-resource" });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("10.0.0.5");
  });
});

describe("getResourceMetadataUrl", () => {
  it("builds the metadata URL from BASE_URL, tolerating trailing slashes", () => {
    expect(getResourceMetadataUrl({ BASE_URL: "https://rybbit.example.com" } as NodeJS.ProcessEnv)).toBe(
      "https://rybbit.example.com/.well-known/oauth-protected-resource"
    );
    expect(getResourceMetadataUrl({ BASE_URL: "https://rybbit.example.com/" } as NodeJS.ProcessEnv)).toBe(
      "https://rybbit.example.com/.well-known/oauth-protected-resource"
    );
  });

  it("returns null when BASE_URL is not configured", () => {
    expect(getResourceMetadataUrl({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
