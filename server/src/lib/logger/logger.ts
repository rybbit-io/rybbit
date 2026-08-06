import "dotenv/config";

import type { FastifyBaseLogger } from "fastify";
import { pino, type LogFn, type LoggerOptions } from "pino";

const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_LOG_FIELDS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "setcookie",
  "credentials",
  "password",
  "passphrase",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
  "clientsecret",
  "licensekey",
  "prevlicensekey",
  "parentlicensekey",
  "email",
  "emails",
  "emailaddress",
  "phone",
  "phonenumber",
  "phonenumbers",
  "webhookurl",
  "slackwebhookurl",
  "payload",
  "body",
  "requestbody",
  "responsebody",
  "responsebodypreview",
  "responseerror",
  "prompt",
  "promptpreview",
  "currentquery",
  "currentquerypreview",
  "generated",
  "generatedpreview",
  "query",
  "querypreview",
  "sql",
  "sqlpreview",
]);

const REDACTED_LOG_PATHS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.secret",
  "payload.license_key",
  "payload.prev_license_key",
  "payload.parent_license_key",
  "email",
  "emailAddress",
  "phoneNumber",
  "webhookUrl",
  "slackWebhookUrl",
  "payload",
  "body",
  "requestBody",
  "responseBody",
  "responseBodyPreview",
  "responseError",
  "prompt",
  "promptPreview",
  "currentQuery",
  "currentQueryPreview",
  "generated",
  "generatedPreview",
  "query",
  "queryPreview",
  "sql",
  "sqlPreview",
  "err.details.responseBodyPreview",
  "err.details.responseError",
] as const;

function normalizedFieldName(field: string): string {
  return field.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function isSensitiveLogField(field: string): boolean {
  const normalized = normalizedFieldName(field);
  if (SENSITIVE_LOG_FIELDS.has(normalized)) return true;

  if (/(password|passphrase|token|apikey|secret|licensekey|authorization|cookie)/.test(normalized)) return true;
  if (/(email|emails|emailaddress|phone|phonenumber|phonenumbers)$/.test(normalized)) return true;
  return /(payload|body|prompt|query|sql|generated)(preview)?$/.test(normalized);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

class NonErrorThrown extends Error {
  readonly thrownType: string;

  constructor(value: unknown) {
    super("A non-Error value was thrown");
    Object.defineProperty(this, "name", { value: "NonErrorThrown", configurable: true });
    this.thrownType = value === null ? "null" : typeof value;
  }
}

function sanitizeError(error: Error, seen: WeakMap<object, unknown>): Error {
  const sanitized = Object.create(Object.getPrototypeOf(error)) as Error;
  seen.set(error, sanitized);
  Object.defineProperties(sanitized, {
    message: { value: error.message, configurable: true, writable: true },
    name: { value: error.name, configurable: true, writable: true },
    stack: { value: error.stack, configurable: true, writable: true },
  });

  for (const field of Object.keys(error)) {
    const value = (error as unknown as Record<string, unknown>)[field];
    (sanitized as unknown as Record<string, unknown>)[field] = sanitizeLogValue(value, field, seen);
  }

  const errorRecord = error as unknown as Record<string, unknown>;
  for (const field of ["cause", "errors"]) {
    if (field in errorRecord && !Object.prototype.propertyIsEnumerable.call(error, field)) {
      (sanitized as unknown as Record<string, unknown>)[field] = sanitizeLogValue(errorRecord[field], field, seen);
    }
  }

  return sanitized;
}

function sanitizeLogValue(value: unknown, field: string | undefined, seen: WeakMap<object, unknown>): unknown {
  if (field && isSensitiveLogField(field)) return REDACTED_VALUE;
  if (value === null || typeof value !== "object") return value;

  const existing = seen.get(value);
  if (existing) return existing;

  if (value instanceof Error) return sanitizeError(value, seen);

  if (Array.isArray(value)) {
    const sanitized: unknown[] = [];
    seen.set(value, sanitized);
    value.forEach(item => sanitized.push(sanitizeLogValue(item, undefined, seen)));
    return sanitized;
  }

  if (!isPlainObject(value)) return value;

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);
  for (const [nestedField, nestedValue] of Object.entries(value)) {
    sanitized[nestedField] = sanitizeLogValue(nestedValue, nestedField, seen);
  }
  return sanitized;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return sanitizeError(error, new WeakMap());
  }

  return new NonErrorThrown(error);
}

function normalizeLogArguments(inputArgs: Parameters<LogFn>): Parameters<LogFn> {
  if (inputArgs.length === 0) return inputArgs;

  const [context, ...remainingArgs] = inputArgs;
  if (context instanceof Error) {
    return [{ err: normalizeError(context) }, ...remainingArgs] as Parameters<LogFn>;
  }

  if (!isPlainObject(context)) return inputArgs;

  const normalized = sanitizeLogValue(context, undefined, new WeakMap()) as Record<string, unknown>;
  if ("err" in context) {
    normalized.err = normalizeError(context.err);
  } else if ("error" in context) {
    normalized.err = normalizeError(context.error);
  }
  delete normalized.error;

  return [normalized, ...remainingArgs] as Parameters<LogFn>;
}

function defaultLogLevel(): string {
  if (process.env.NODE_ENV === "production") return "info";
  if (process.env.NODE_ENV === "test") return "silent";
  return "debug";
}

function createLogger(name: string): FastifyBaseLogger {
  const options: LoggerOptions = {
    name,
    level: process.env.LOG_LEVEL || defaultLogLevel(),
    redact: {
      paths: [...REDACTED_LOG_PATHS],
      censor: REDACTED_VALUE,
    },
    hooks: {
      logMethod(inputArgs, method) {
        method.apply(this, normalizeLogArguments(inputArgs));
      },
    },
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          path: request.url,
          parameters: request.params,
        };
      },
      res(reply) {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
  };

  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,name",
        destination: 1,
      },
    };
  }

  return pino(options) as FastifyBaseLogger;
}

export const logger = createLogger("rybbit");

export const createServiceLogger = (service: string) => {
  return logger.child({ service });
};
