import cors from "@fastify/cors";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  createCorsOptionsDelegate,
  createRejectUntrustedOriginHook,
  getTrustedCorsOrigins,
  isTrackerCorsPath,
  normalizeCorsOrigin,
  TRACKER_PREFLIGHT_MAX_AGE_SECONDS,
} from "./cors.js";

async function buildCorsTestApp(env: NodeJS.ProcessEnv) {
  const app = Fastify();
  await app.register(cors, {
    delegator: createCorsOptionsDelegate(env),
  });
  app.addHook("onRequest", createRejectUntrustedOriginHook(env));

  app.delete("/api/sites/:siteId", async () => ({ success: true }));
  app.get("/api/sites/:siteId/sessions", async () => ({ data: [] }));
  app.post("/api/track", async () => ({ success: true }));
  app.post("/api/session-replay/record/:siteId", async () => ({ success: true }));
  app.post("/api/site/:siteId/feature-flags/evaluate", async () => ({ flags: {} }));
  app.post("/api/mcp", async () => ({ success: true }));
  app.get("/api/version", async () => ({ version: "0.0.0" }));

  await app.ready();
  return app;
}

describe("CORS policy", () => {
  it("allows credentialed management requests only from BASE_URL origin", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://rybbit.example.com/dashboard",
    });

    try {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/sites/1",
        headers: {
          origin: "https://rybbit.example.com",
          "access-control-request-method": "DELETE",
        },
      });

      expect(res.statusCode).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("https://rybbit.example.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    } finally {
      await app.close();
    }
  });

  it("does not emit CORS headers for disallowed management origins", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://rybbit.example.com",
    });

    try {
      const preflight = await app.inject({
        method: "OPTIONS",
        url: "/api/sites/1",
        headers: {
          origin: "https://attacker.example",
          "access-control-request-method": "DELETE",
        },
      });

      expect(preflight.statusCode).toBe(404);
      expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
      expect(preflight.headers["access-control-allow-credentials"]).toBeUndefined();

      const actual = await app.inject({
        method: "DELETE",
        url: "/api/sites/1",
        headers: {
          origin: "https://attacker.example",
        },
      });

      expect(actual.statusCode).toBe(403);
      expect(actual.headers["access-control-allow-origin"]).toBeUndefined();
      expect(actual.headers["access-control-allow-credentials"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("keeps tracking endpoints permissive without allowing credentials", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://rybbit.example.com",
    });

    try {
      const preflight = await app.inject({
        method: "OPTIONS",
        url: "/api/track",
        headers: {
          origin: "https://customer-site.example",
          "access-control-request-method": "POST",
        },
      });

      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers["access-control-allow-origin"]).toBe("https://customer-site.example");
      expect(preflight.headers["access-control-allow-credentials"]).toBeUndefined();

      const actual = await app.inject({
        method: "POST",
        url: "/api/track",
        headers: {
          origin: "https://customer-site.example",
        },
      });

      expect(actual.statusCode).toBe(200);
      expect(actual.headers["access-control-allow-origin"]).toBe("https://customer-site.example");
      expect(actual.headers["access-control-allow-credentials"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("allows public version checks without credentials", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://rybbit.example.com",
    });

    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/version",
        headers: {
          origin: "https://self-hosted.example",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("https://self-hosted.example");
      expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("treats /api/mcp like other authenticated routes: trusted origins or no Origin at all", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://rybbit.example.com",
    });

    try {
      const preflight = await app.inject({
        method: "OPTIONS",
        url: "/api/mcp",
        headers: {
          origin: "https://rybbit.example.com",
          "access-control-request-method": "POST",
          "access-control-request-headers": "Authorization,MCP-Protocol-Version",
        },
      });
      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers["access-control-allow-origin"]).toBe("https://rybbit.example.com");
      expect(preflight.headers["access-control-allow-headers"]).toContain("MCP-Protocol-Version");

      const untrusted = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: { origin: "https://attacker.example" },
      });
      expect(untrusted.statusCode).toBe(403);

      const opaqueOrigin = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: { origin: "null" },
      });
      expect(opaqueOrigin.statusCode).toBe(403);

      // Server-side MCP clients send no Origin header and pass through.
      const serverSideClient = await app.inject({ method: "POST", url: "/api/mcp" });
      expect(serverSideClient.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("allows public session-list requests without credentials", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://demo.rybbit.com",
    });

    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/sites/81/sessions?past_minutes_start=240&past_minutes_end=0&filters=[]&page=1&limit=100",
        headers: {
          origin: "https://docs.rybbit.com",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("https://docs.rybbit.com");
      expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("allows credentialed session-list requests from the dashboard origin", async () => {
    const app = await buildCorsTestApp({
      NODE_ENV: "production",
      BASE_URL: "https://demo.rybbit.com",
    });

    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/sites/81/sessions?past_minutes_start=240&past_minutes_end=0&filters=[]&page=1&limit=100",
        headers: {
          origin: "https://demo.rybbit.com",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("https://demo.rybbit.com");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    } finally {
      await app.close();
    }
  });
});

describe("tracker preflight caching", () => {
  const env = { NODE_ENV: "production", BASE_URL: "https://app.rybbit.example" };

  function preflight(app: Awaited<ReturnType<typeof buildCorsTestApp>>, url: string, origin: string, method = "POST") {
    return app.inject({
      method: "OPTIONS",
      url,
      headers: {
        origin,
        "access-control-request-method": method,
        "access-control-request-headers": "content-type",
      },
    });
  }

  it("lets browsers cache tracker preflights from any origin", async () => {
    const app = await buildCorsTestApp(env);

    try {
      for (const url of [
        "/api/track",
        "/api/session-replay/record/abc123",
        "/api/site/abc123/feature-flags/evaluate",
      ]) {
        const res = await preflight(app, url, "https://customer.example");

        expect(res.statusCode).toBe(204);
        expect(res.headers["access-control-allow-origin"]).toBe("https://customer.example");
        expect(res.headers["access-control-max-age"]).toBe(String(TRACKER_PREFLIGHT_MAX_AGE_SECONDS));
      }
    } finally {
      await app.close();
    }
  });

  it("keeps the browser default for dashboard and other public routes", async () => {
    const app = await buildCorsTestApp(env);

    try {
      const management = await preflight(app, "/api/sites/1", "https://app.rybbit.example", "DELETE");
      expect(management.statusCode).toBe(204);
      expect(management.headers["access-control-max-age"]).toBeUndefined();

      const sessions = await preflight(app, "/api/sites/81/sessions", "https://docs.rybbit.com", "GET");
      expect(sessions.statusCode).toBe(204);
      expect(sessions.headers["access-control-max-age"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("matches only the endpoints the tracking script calls", () => {
    expect(isTrackerCorsPath("/api/track")).toBe(true);
    expect(isTrackerCorsPath("/api/identify")).toBe(true);
    expect(isTrackerCorsPath("/api/session-replay/record/abc")).toBe(true);
    expect(isTrackerCorsPath("/api/site/tracking-config/abc")).toBe(true);
    expect(isTrackerCorsPath("/api/site/abc/feature-flags/evaluate")).toBe(true);

    expect(isTrackerCorsPath("/api/version")).toBe(false);
    expect(isTrackerCorsPath("/api/sites/abc/sessions")).toBe(false);
    expect(isTrackerCorsPath("/api/sites/abc/feature-flags/evaluate")).toBe(false);
    expect(isTrackerCorsPath("/api/site/abc/feature-flags/evaluate/extra")).toBe(false);
  });
});

describe("trusted CORS origins", () => {
  it("normalizes quoted URLs to origins", () => {
    expect(normalizeCorsOrigin('"https://rybbit.example.com/path"')).toBe("https://rybbit.example.com");
    expect(normalizeCorsOrigin("javascript:alert(1)")).toBeNull();
  });

  it("uses BASE_URL in production and localhost client origins in development", () => {
    expect(
      getTrustedCorsOrigins({
        NODE_ENV: "production",
        BASE_URL: "https://rybbit.example.com",
      })
    ).toEqual(["https://rybbit.example.com"]);

    expect(
      getTrustedCorsOrigins({
        NODE_ENV: "development",
        BASE_URL: "https://rybbit.example.com",
      })
    ).toEqual(["https://rybbit.example.com", "http://localhost:3002", "http://127.0.0.1:3002"]);
  });
});
