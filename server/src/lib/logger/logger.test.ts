import type { LogFn, LoggerOptions } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { childLogger, childMock, pinoMock, rootLogger } = vi.hoisted(() => {
  const childLogger = { kind: "child" };
  const childMock = vi.fn(() => childLogger);
  const rootLogger = { child: childMock };
  const pinoMock = vi.fn((_options: LoggerOptions) => rootLogger);

  return { childLogger, childMock, pinoMock, rootLogger };
});

vi.mock("pino", () => ({ pino: pinoMock }));

const originalNodeEnv = process.env.NODE_ENV;
const originalLogLevel = process.env.LOG_LEVEL;

async function importLogger(nodeEnv: string, logLevel = "") {
  process.env.NODE_ENV = nodeEnv;
  process.env.LOG_LEVEL = logLevel;
  vi.resetModules();
  pinoMock.mockClear();
  childMock.mockClear();

  const loggerModule = await import("./logger.js");
  const options = pinoMock.mock.calls[0]?.[0];
  if (!options) throw new Error("Logging runtime did not create the root logger");

  return { loggerModule, options };
}

function applyLogMethodHook(options: LoggerOptions, inputArgs: unknown[]): unknown[] {
  let normalizedArgs: unknown[] | undefined;
  const method = function (...args: unknown[]) {
    normalizedArgs = args;
  } as LogFn;

  options.hooks?.logMethod?.call(rootLogger as never, inputArgs as Parameters<LogFn>, method, 50);

  if (!normalizedArgs) throw new Error("Logging runtime did not invoke the Pino log method");
  return normalizedArgs;
}

beforeEach(() => {
  process.env.LOG_LEVEL = "";
});

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;

  if (originalLogLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLogLevel;
});

describe("logging runtime", () => {
  it("uses structured info logging in production", async () => {
    const { options } = await importLogger("production");

    expect(options).toMatchObject({
      name: "rybbit",
      level: "info",
      redact: { censor: "[REDACTED]" },
    });
    expect(options).not.toHaveProperty("transport");
  });

  it("uses readable debug logging in development", async () => {
    const { options } = await importLogger("development");

    expect(options).toMatchObject({
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: { colorize: true, singleLine: true, destination: 1 },
      },
    });
  });

  it("is silent by default in tests", async () => {
    const { options } = await importLogger("test");

    expect(options).toMatchObject({ level: "silent" });
    expect(options).not.toHaveProperty("transport");
  });

  it("lets LOG_LEVEL override the environment default", async () => {
    const { options } = await importLogger("production", "warn");

    expect(options).toMatchObject({ level: "warn" });
  });

  it("creates background children from the shared root", async () => {
    const { loggerModule } = await importLogger("test");

    expect(loggerModule.createServiceLogger("uptime")).toBe(childLogger);
    expect(childMock).toHaveBeenCalledWith({ service: "uptime" });
  });

  it("keeps request and response serialization in the shared runtime", async () => {
    const { options } = await importLogger("production");

    expect(
      options.serializers?.req({
        method: "GET",
        url: "/api/sites/1",
        params: { siteId: 1 },
        headers: { authorization: "secret" },
      })
    ).toEqual({
      method: "GET",
      url: "/api/sites/1",
      path: "/api/sites/1",
      parameters: { siteId: 1 },
    });
    expect(options.serializers?.res({ statusCode: 204 })).toEqual({ statusCode: 204 });
  });

  it("normalizes direct and structured errors to the canonical err field", async () => {
    const { options } = await importLogger("production");
    const failure = Object.assign(new Error("database unavailable"), {
      code: "ECONNREFUSED",
      details: { requestId: "provider-request", responseBodyPreview: "private provider response" },
    });

    const [directContext] = applyLogMethodHook(options, [failure, "Direct failure"]);
    const [structuredContext] = applyLogMethodHook(options, [{ error: failure, siteId: 42 }, "Structured failure"]);

    expect(directContext).toMatchObject({
      err: expect.objectContaining({
        message: "database unavailable",
        code: "ECONNREFUSED",
        details: { requestId: "provider-request", responseBodyPreview: "[REDACTED]" },
      }),
    });
    expect(structuredContext).toMatchObject({
      err: expect.objectContaining({ message: "database unavailable", code: "ECONNREFUSED" }),
      siteId: 42,
    });
    expect(structuredContext).not.toHaveProperty("error");
  });

  it("turns non-Error failures into safe errors without logging the thrown value", async () => {
    const { options } = await importLogger("production");
    const [context] = applyLogMethodHook(options, [
      { err: { token: "secret", reason: "provider failed" } },
      "Provider failure",
    ]);

    expect(context).toMatchObject({
      err: expect.objectContaining({
        name: "NonErrorThrown",
        message: "A non-Error value was thrown",
        thrownType: "object",
      }),
    });
    expect(JSON.stringify(context)).not.toContain("secret");
    expect(JSON.stringify(context)).not.toContain("provider failed");
  });

  it("recursively censors sensitive structured fields without mutating caller data", async () => {
    const { options } = await importLogger("production");
    const input = {
      eventType: "activate",
      integration: {
        auth: { newPassword: "password-secret" },
        contact: { recipientEmail: "person@example.com" },
      },
      promptPreview: "show revenue by customer",
    };

    const [context] = applyLogMethodHook(options, [input, "Safe event"]);

    expect(context).toEqual({
      eventType: "activate",
      integration: {
        auth: { newPassword: "[REDACTED]" },
        contact: { recipientEmail: "[REDACTED]" },
      },
      promptPreview: "[REDACTED]",
    });
    expect(input.integration.auth.newPassword).toBe("password-secret");
  });

  it("emits a normalized, redacted JSON event through Pino", async () => {
    const { options } = await importLogger("production");
    const { pino: actualPino } = await vi.importActual<typeof import("pino")>("pino");
    const output: string[] = [];
    class ProviderError extends Error {
      details = { requestId: "provider-request", responseBodyPreview: "private provider response" };
    }

    const outputLogger = actualPino(
      { ...options, base: undefined, timestamp: false },
      { write: (line: string) => output.push(line) }
    );
    outputLogger
      .child({ email: "person@example.com" })
      .error(
        { error: new ProviderError("provider failed"), nested: { apiKey: "api-secret" } },
        "Provider request failed"
      );

    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0])).toMatchObject({
      level: 50,
      email: "[REDACTED]",
      nested: { apiKey: "[REDACTED]" },
      err: {
        type: "ProviderError",
        message: "provider failed",
        details: { requestId: "provider-request", responseBodyPreview: "[REDACTED]" },
      },
      msg: "Provider request failed",
    });
  });
});
