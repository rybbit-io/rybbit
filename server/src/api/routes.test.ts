import Fastify, { type RouteOptions } from "fastify";
import { describe, expect, it, vi } from "vitest";

// Cloud-only SDK clients are constructed at import time; they need a key to
// construct, never to register a route.
vi.hoisted(() => {
  process.env.RESEND_API_KEY ||= "re_test";
  process.env.STRIPE_SECRET_KEY ||= "sk_test";
});
// Load the real route table with the infrastructure clients stubbed: no
// database, cache or auth provider is contacted — the test only registers
// routes and reads what each one declares.
vi.mock("../db/postgres/postgres.js", () => ({ db: {}, sql: {} }));
vi.mock("../db/redis/redis.js", () => ({
  dashboardCacheRedis: { status: "end", eval: vi.fn() },
  apiRateLimitRedis: { status: "end", eval: vi.fn() },
}));
vi.mock("../lib/auth.js", () => ({ auth: { api: {} } }));

vi.mock("../lib/const.js", async importOriginal => ({
  ...(await importOriginal<typeof import("../lib/const.js")>()),
  // Register the cloud-only billing routes too.
  IS_CLOUD: true,
}));

import { PERMISSIONS } from "@rybbit/shared";
import type { RouteAccess } from "../lib/auth-middleware.js";
import { apiRoutes } from "./routes.js";

async function collectRoutes() {
  const routes: { method: string; url: string; access: RouteAccess | undefined }[] = [];
  const app = Fastify();
  app.addHook("onRoute", (route: RouteOptions) => {
    for (const method of [route.method].flat()) {
      if (method === "HEAD") continue;
      routes.push({ method, url: route.url, access: route.config?.access });
    }
  });
  await app.register(apiRoutes, { prefix: "/api" });
  await app.ready();
  await app.close();
  return routes;
}

const describeAccess = (access: RouteAccess | undefined) => {
  if (!access) return "UNDECLARED";
  if (typeof access === "string") return access;
  const minRole = PERMISSIONS[access.permission].minRole;
  if (access.level === "site") {
    return `site ${access.permission} [${minRole}+]${access.allowPublic ? " (or public)" : ""}`;
  }
  return `org ${access.permission} [${minRole}+]`;
};

describe("API route table", () => {
  it("declares who may call every route", async () => {
    const routes = await collectRoutes();

    expect(routes.length).toBeGreaterThan(100);
    expect(routes.filter(route => !route.access)).toEqual([]);
  });

  // The whole access matrix in one reviewable place: any change to who may
  // call an endpoint shows up as a diff here.
  it("pins the access each route requires", async () => {
    const routes = await collectRoutes();
    const table = routes
      .map(route => `${route.method.padEnd(6)} ${route.url} → ${describeAccess(route.access)}`)
      .sort();

    expect(table).toMatchSnapshot();
  });
});
