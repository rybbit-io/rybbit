import cors from "@fastify/cors";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  createCorsOptionsDelegate,
  createRejectUntrustedOriginHook,
  getTrustedCorsOrigins,
  normalizeCorsOrigin,
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
