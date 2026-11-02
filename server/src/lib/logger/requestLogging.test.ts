import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { pino } from "pino";
import { afterEach, describe, expect, it } from "vitest";
import { registerRequestLogging } from "./requestLogging.js";

type LogEvent = Record<string, unknown>;

const apps: Array<ReturnType<typeof Fastify>> = [];

function createApp() {
  const events: LogEvent[] = [];
  const logger = pino(
    { base: undefined, level: "trace", timestamp: false },
    {
      write(line: string) {
        events.push(JSON.parse(line) as LogEvent);
      },
    }
  );
  const app = Fastify({ disableRequestLogging: true, loggerInstance: logger });
  registerRequestLogging(app as unknown as FastifyInstance);
  apps.push(app);

  return { app, events };
}

function requestEvents(events: LogEvent[]) {
  return events.filter(event => typeof event.msg === "string" && event.msg.startsWith("Request "));
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
});

describe("request lifecycle logging", () => {
  it("logs successful requests with correlation and timing context", async () => {
    const { app, events } = createApp();
    app.get("/sites/:siteId", (_request, reply) => reply.status(204).send());

    await app.inject({ method: "GET", url: "/sites/42?token=secret" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({
        level: 30,
        method: "GET",
        url: "/sites/42",
        route: "/sites/:siteId",
        statusCode: 204,
        reqId: "req-1",
        responseTimeMs: expect.any(Number),
        msg: "Request completed",
      }),
    ]);
  });

  it("logs successful ingestion requests at debug", async () => {
    const { app, events } = createApp();
    app.post("/api/track", () => ({ success: true }));

    await app.inject({ method: "POST", url: "/api/track" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({ level: 20, route: "/api/track", statusCode: 200, msg: "Request completed" }),
    ]);
  });

  it("logs successful tracker config and flag requests at debug", async () => {
    const { app, events } = createApp();
    app.get("/api/site/tracking-config/:siteId", () => ({ sessionReplay: false }));
    app.post("/api/site/:siteId/feature-flags/evaluate", () => ({ flags: {} }));

    await app.inject({ method: "GET", url: "/api/site/tracking-config/abc" });
    await app.inject({ method: "POST", url: "/api/site/abc/feature-flags/evaluate" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({ level: 20, route: "/api/site/tracking-config/:siteId", statusCode: 200 }),
      expect.objectContaining({ level: 20, route: "/api/site/:siteId/feature-flags/evaluate", statusCode: 200 }),
    ]);
  });

  it("keeps tracker config failures at their normal level", async () => {
    const { app, events } = createApp();
    app.get("/api/site/tracking-config/:siteId", (_request, reply) => reply.status(404).send({ error: "not found" }));

    await app.inject({ method: "GET", url: "/api/site/tracking-config/missing" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({ level: 40, statusCode: 404, msg: "Request completed with client error" }),
    ]);
  });

  it("logs answered CORS preflights at debug and rejected ones at warn", async () => {
    const { app, events } = createApp();
    await app.register(cors, {
      delegator: (request, callback) =>
        callback(null, { origin: request.headers.origin === "https://allowed.example" }),
    });
    app.post("/api/track", () => ({ success: true }));

    await app.inject({
      method: "OPTIONS",
      url: "/api/track",
      headers: { origin: "https://allowed.example", "access-control-request-method": "POST" },
    });
    await app.inject({
      method: "OPTIONS",
      url: "/api/track",
      headers: { origin: "https://blocked.example", "access-control-request-method": "POST" },
    });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({ level: 20, method: "OPTIONS", statusCode: 204, msg: "Request completed" }),
      expect.objectContaining({ level: 40, method: "OPTIONS", statusCode: 404 }),
    ]);
  });

  it("logs handled response failures from their status code", async () => {
    const { app, events } = createApp();
    app.get("/unavailable", (_request, reply) => reply.status(503).send({ error: "unavailable" }));

    await app.inject({ method: "GET", url: "/unavailable" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({
        level: 50,
        statusCode: 503,
        msg: "Request completed with server error",
      }),
    ]);
  });

  it("logs thrown failures once with the serialized error", async () => {
    const { app, events } = createApp();
    app.get("/broken", async () => {
      throw new Error("boom");
    });

    await app.inject({ method: "GET", url: "/broken" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({
        level: 50,
        statusCode: 500,
        err: expect.objectContaining({ message: "boom" }),
        msg: "Request failed",
      }),
    ]);
  });

  it("logs thrown client failures at warn", async () => {
    const { app, events } = createApp();
    app.get("/invalid", async () => {
      const error = new Error("invalid") as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    });

    await app.inject({ method: "GET", url: "/invalid" });

    expect(requestEvents(events)).toEqual([
      expect.objectContaining({ level: 40, statusCode: 400, msg: "Request failed" }),
    ]);
  });

  it("respects silent route logging", async () => {
    const { app, events } = createApp();
    app.get("/health", { logLevel: "silent" }, () => "OK");

    await app.inject({ method: "GET", url: "/health" });

    expect(requestEvents(events)).toEqual([]);
  });
});
