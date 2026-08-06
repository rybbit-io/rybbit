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
