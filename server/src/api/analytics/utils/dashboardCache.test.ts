import Fastify, { FastifyInstance } from "fastify";
import RedisMock from "ioredis-mock";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDashboardCache } from "./dashboardCache.js";

const apps: FastifyInstance[] = [];
const clients: InstanceType<typeof RedisMock>[] = [];
let port = 16379;
function mockRedis() {
  const redis = new RedisMock({ port: port++ });
  Object.defineProperty(redis, "status", { value: "ready", writable: true });
  clients.push(redis);
  return redis;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  clients.splice(0).forEach(redis => redis.disconnect());
  vi.restoreAllMocks();
});

describe("dashboard response cache", () => {
  it("shares one query across concurrent viewers on separate backend workers", async () => {
    const redis = mockRedis();
    const query = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 75));
      return { data: { users: 42, sessions: 51 } };
    });
    const authorize = vi.fn(async () => {});
    // Separate factories and Fastify instances: no shared in-process promises.
    const workers = Array.from({ length: 2 }, () => {
      const app = Fastify();
      const cached = createDashboardCache({ redis, namespace: "test" });
      app.get("/sites/:siteId/overview-lite", cached({ preHandler: [authorize] }), async () => query());
      apps.push(app);
      return app;
    });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        workers[i % 2].inject("/sites/1/overview-lite?past_minutes_start=1440&past_minutes_end=0")
      )
    );
    expect(results.every(response => response.statusCode === 200)).toBe(true);
    expect(results.map(response => response.json())).toEqual(Array(20).fill({ data: { users: 42, sessions: 51 } }));
    expect(authorize).toHaveBeenCalledTimes(20);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("checks authorization on every cache hit and uses expanded segment filters", async () => {
    const redis = mockRedis();
    const cached = createDashboardCache({ redis, namespace: "test" });
    const app = Fastify();
    apps.push(app);
    let allowed = true;
    let country = "KR";
    const query = vi.fn(async () => ({ data: country }));
    app.get(
      "/sites/:siteId/overview",
      cached({
        preHandler: [
          async (_request, reply) => {
            if (!allowed) return reply.code(403).send({ error: "Forbidden" });
          },
          async request => {
            (request.query as Record<string, unknown>).filters = [{ country }];
          },
        ],
      }),
      query
    );
    const url = "/sites/1/overview?segment=saved-segment";
    expect((await app.inject(url)).json()).toEqual({ data: "KR" });
    expect((await app.inject(url)).headers["x-rybbit-cache"]).toBe("HIT");
    allowed = false;
    expect((await app.inject(url)).statusCode).toBe(403);
    expect(query).toHaveBeenCalledTimes(1);
    allowed = true;
    country = "US";
    expect((await app.inject(url)).json()).toEqual({ data: "US" });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("separates Sites, endpoints, filters, both time bounds, timezone, bucket and pagination", async () => {
    const redis = mockRedis();
    const cached = createDashboardCache({ redis, namespace: "test" });
    const app = Fastify();
    apps.push(app);
    const query = vi.fn(async request => ({
      data: { site: request.params, query: request.query, call: query.mock.calls.length },
    }));
    app.get("/sites/:siteId/overview", cached({}), query);
    app.get("/sites/:siteId/overview-lite", cached({}), query);
    const base =
      "/sites/1/overview?past_minutes_start=1440&past_minutes_end=0&time_zone=UTC&bucket=hour&page=1&parameter=country";
    const changes = [
      base.replace("/1/", "/2/"),
      base.replace("overview?", "overview-lite?"),
      base.replace("1440", "2880"),
      base.replace("end=0", "end=60"),
      base.replace("UTC", "Asia%2FKolkata"),
      base.replace("hour", "day"),
      base.replace("page=1", "page=2"),
      base.replace("country", "device_type"),
      base + "&filters=KR",
    ];
    const first = await app.inject(base);
    expect((await app.inject(base)).payload).toBe(first.payload);
    for (const url of changes) expect((await app.inject(url)).payload).not.toBe(first.payload);
    expect(query).toHaveBeenCalledTimes(changes.length + 1);
  });

  it("shares equivalent query-string orders, but never caches across deployments", async () => {
    const redis = mockRedis();
    const query = vi.fn(async () => ({ data: 42 }));
    for (const namespace of ["database-a", "database-b"]) {
      const app = Fastify();
      apps.push(app);
      app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace })({}), query);
      await app.inject("/sites/1/overview?start_date=2026-09-19&end_date=2026-09-20");
      expect(
        (await app.inject("/sites/1/overview?end_date=2026-09-20&start_date=2026-09-19")).headers["x-rybbit-cache"]
      ).toBe("HIT");
    }
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("bounds freshness from query start and does not extend expiry on hits", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const query = vi.fn(async () => {
      now += 400;
      return { data: 42 };
    });
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test", ttlMs: 1000 })({}), query);
    const url = "/sites/1/overview";
    await app.inject(url);
    const key = (await redis.keys("dashboard:v1:*")).find(key => !key.includes(":done:") && !key.endsWith(":lock"))!;
    expect(await redis.pttl(key)).toBe(600);
    now += 500;
    expect((await app.inject(url)).headers["x-rybbit-cache"]).toBe("HIT");
    expect(await redis.pttl(key)).toBe(100);
    now += 101;
    await app.inject(url);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("does not cache a query that outlives the freshness budget", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const query = vi.fn(async () => {
      now += 2000;
      return { data: 42 };
    });
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test", ttlMs: 1000 })({}), query);
    await app.inject("/sites/1/overview");
    await app.inject("/sites/1/overview");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("does not cache errors, and releases the lease so retries can succeed", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    const query = vi.fn().mockRejectedValueOnce(new Error("ClickHouse down")).mockResolvedValue({ data: 42 });
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test" })({}), query);
    expect((await app.inject("/sites/1/overview")).statusCode).toBe(500);
    expect((await app.inject("/sites/1/overview")).json()).toEqual({ data: 42 });
    expect((await app.inject("/sites/1/overview")).headers["x-rybbit-cache"]).toBe("HIT");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight failure with waiters without caching it for later requests", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    const query = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 75));
      throw new Error("ClickHouse unavailable");
    });
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test" })({}), query);
    const results = await Promise.all(Array.from({ length: 10 }, () => app.inject("/sites/1/overview")));
    expect(results.every(response => response.statusCode === 500)).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    await app.inject("/sites/1/overview");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it.each(["disabled", "disconnected", "redis-error", "no-cache", "no-store"])(
    "serves live results when %s",
    async mode => {
      const redis = mockRedis();
      if (mode === "disconnected") Object.defineProperty(redis, "status", { value: "reconnecting" });
      if (mode === "redis-error") vi.spyOn(redis, "eval").mockRejectedValue(new Error("Redis down"));
      const app = Fastify();
      apps.push(app);
      const query = vi.fn(async () => ({ data: 42 }));
      app.get(
        "/sites/:siteId/overview",
        createDashboardCache({ redis, namespace: "test", ttlMs: mode === "disabled" ? 0 : 30_000 })({}),
        query
      );
      for (let i = 0; i < 2; i++)
        expect(
          (
            await app.inject({
              url: "/sites/1/overview",
              headers: mode.startsWith("no-") ? { "cache-control": mode } : {},
            })
          ).json()
        ).toEqual({ data: 42 });
      expect(query).toHaveBeenCalledTimes(2);
    }
  );

  it("does not cache oversized responses", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    const query = vi.fn(async () => ({ data: "x".repeat(100) }));
    app.get(
      "/sites/:siteId/overview",
      createDashboardCache({ redis, namespace: "test", maxResponseBytes: 50 })({}),
      query
    );
    await app.inject("/sites/1/overview");
    await app.inject("/sites/1/overview");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("still serves a successful query when Redis fails during publication", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    const query = vi.fn(async () => ({ data: 42 }));
    query.mockImplementationOnce(async () => {
      vi.spyOn(redis, "eval").mockRejectedValueOnce(new Error("Redis write failed"));
      return { data: 42 };
    });
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test" })({}), query);
    const url = "/sites/1/overview";
    expect((await app.inject(url)).json()).toEqual({ data: 42 });
    expect((await app.inject(url)).json()).toEqual({ data: 42 });
    expect((await app.inject(url)).headers["x-rybbit-cache"]).toBe("HIT");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("prevents an expired lock owner from overwriting a newer result", async () => {
    const redis = mockRedis();
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    let finishFirst!: () => void;
    const blocked = new Promise<void>(resolve => {
      finishFirst = resolve;
    });
    const query = vi.fn(async () => {
      if (query.mock.calls.length === 1) {
        await blocked;
        return { data: "old" };
      }
      return { data: "new" };
    });
    const app = Fastify();
    apps.push(app);
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test", lockMs: 50 })({}), query);
    const first = app.inject("/sites/1/overview").then(response => response.json());
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    // Simulate a paused/crashed worker whose heartbeat did not run in time.
    now += 51;
    expect((await app.inject("/sites/1/overview")).json()).toEqual({ data: "new" });
    finishFirst();
    expect(await first).toEqual({ data: "old" });
    expect((await app.inject("/sites/1/overview")).json()).toEqual({ data: "new" });
  });

  it("renews the lease while a slow query is still running", async () => {
    const redis = mockRedis();
    const app = Fastify();
    apps.push(app);
    const query = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 180));
      return { data: 42 };
    });
    app.get("/sites/:siteId/overview", createDashboardCache({ redis, namespace: "test", lockMs: 90 })({}), query);
    const first = app.inject("/sites/1/overview").then(response => response.json());
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    await new Promise(resolve => setTimeout(resolve, 100));
    const second = await app.inject("/sites/1/overview");
    expect(await first).toEqual(second.json());
    expect(query).toHaveBeenCalledTimes(1);
  });
});
