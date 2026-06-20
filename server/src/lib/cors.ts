import type { FastifyReply, FastifyRequest } from "fastify";

const corsMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"];
const corsAllowedHeaders = ["Content-Type", "Authorization", "X-Requested-With", "x-captcha-response", "x-private-key"];

type CorsOptions = {
  origin: boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
};

type CorsDelegateCallback = (error: Error | null, options?: CorsOptions) => void;

const commonCorsOptions = {
  methods: corsMethods,
  allowedHeaders: corsAllowedHeaders,
};

const devTrustedOrigins = ["http://localhost:3002", "http://127.0.0.1:3002"];
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function cleanEnvUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^['"]|['"]$/g, "");
}

export function normalizeCorsOrigin(value: string | undefined): string | null {
  const cleaned = cleanEnvUrl(value);
  if (!cleaned) {
    return null;
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

// Trusted origins are static config (BASE_URL / NODE_ENV); cache per env object so
// the URL parse + Set build runs once instead of on every request.
const trustedOriginsCache = new WeakMap<NodeJS.ProcessEnv, string[]>();

export function getTrustedCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const cached = trustedOriginsCache.get(env);
  if (cached) {
    return cached;
  }

  const origins = new Set<string>();
  const baseUrlOrigin = normalizeCorsOrigin(env.BASE_URL);

  if (baseUrlOrigin) {
    origins.add(baseUrlOrigin);
  }

  if (env.NODE_ENV !== "production") {
    for (const origin of devTrustedOrigins) {
      origins.add(origin);
    }
  }

  const result = [...origins];
  trustedOriginsCache.set(env, result);
  return result;
}

function getRequestPath(request: FastifyRequest): string {
  return (request.url || "/").split("?")[0] || "/";
}

export function isPublicCorsPath(path: string): boolean {
  return (
    path === "/api/track" ||
    path === "/api/identify" ||
    path === "/api/version" ||
    path.startsWith("/api/session-replay/record/") ||
    path.startsWith("/api/site/tracking-config/") ||
    /^\/api\/sites\/[^/]+\/sessions$/.test(path) ||
    /^\/api\/sites\/[^/]+\/embed-stats$/.test(path) ||
    /^\/api\/site\/[^/]+\/feature-flags\/evaluate$/.test(path)
  );
}

export function getCorsOptionsForRequest(
  request: FastifyRequest,
  env: NodeJS.ProcessEnv = process.env
): CorsOptions {
  const requestOrigin = normalizeCorsOrigin(request.headers.origin);
  if (!requestOrigin) {
    return {
      ...commonCorsOptions,
      origin: false,
      credentials: false,
    };
  }

  if (isPublicCorsPath(getRequestPath(request))) {
    // These paths are reachable from any origin (e.g. embedded widgets), but they
    // are also hit by the authenticated dashboard, which sends cookies. Reflect any
    // origin, but only allow credentials for trusted origins so the dashboard's
    // credentialed requests get `Access-Control-Allow-Credentials: true` while
    // arbitrary embed origins stay credential-less.
    return {
      ...commonCorsOptions,
      origin: true,
      credentials: getTrustedCorsOrigins(env).includes(requestOrigin),
    };
  }

  return {
    ...commonCorsOptions,
    origin: getTrustedCorsOrigins(env).includes(requestOrigin),
    credentials: true,
  };
}

export function shouldRejectUntrustedOrigin(
  request: FastifyRequest,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!unsafeMethods.has(request.method)) {
    return false;
  }

  const requestOrigin = normalizeCorsOrigin(request.headers.origin);
  if (!requestOrigin || isPublicCorsPath(getRequestPath(request))) {
    return false;
  }

  return !getTrustedCorsOrigins(env).includes(requestOrigin);
}

export function createCorsOptionsDelegate(env: NodeJS.ProcessEnv = process.env) {
  return (request: FastifyRequest, callback: CorsDelegateCallback) => {
    callback(null, getCorsOptionsForRequest(request, env));
  };
}

export function createRejectUntrustedOriginHook(env: NodeJS.ProcessEnv = process.env) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (shouldRejectUntrustedOrigin(request, env)) {
      return reply.status(403).send({ error: "Origin not allowed" });
    }
  };
}
