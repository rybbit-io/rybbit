import cluster from "node:cluster";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { toNodeHandler } from "better-auth/node";
import Fastify, { type FastifyRequest } from "fastify";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { apiRateLimitRedis } from "./db/redis/redis.js";
import { initPostgres } from "./db/postgres/initPostgres.js";
import { mapHeaders } from "./lib/auth-utils.js";
import { registerApiErrorResponses } from "./lib/api-errors.js";
import { apiRoutes } from "./api/routes.js";
import type { OrgRole, ScopeStatements } from "@rybbit/shared";
import { auth } from "./lib/auth.js";
import { oauthWellKnownRoutes } from "./mcp/wellKnown.js";
import { createCorsOptionsDelegate, createRejectUntrustedOriginHook } from "./lib/cors.js";
import { IS_CLOUD } from "./lib/const.js";
import { logger } from "./lib/logger/logger.js";
import { registerRequestLogging } from "./lib/logger/requestLogging.js";
import { identityBackfillQueue } from "./services/tracker/identityBackfillQueue.js";
import { lifecycleEmailService } from "./services/lifecycleEmails/lifecycleEmailService.js";
import { telemetryService } from "./services/telemetryService.js";
import { handleIdentify } from "./services/tracker/identifyService.js";
import { trackEvent } from "./services/tracker/trackEvent.js";
import { startSiteBaselineRefresh } from "./services/tracker/botBlocking/siteBaseline.js";
import { usageService } from "./services/usageService.js";
import { unclaimedSiteCleanupService } from "./services/sites/unclaimedSiteCleanupService.js";
import { weeklyReportService } from "./services/weekyReports/weeklyReportService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = Fastify({
  disableRequestLogging: true,
  loggerInstance: logger,
  maxParamLength: 1500,
  trustProxy: true,
  bodyLimit: 10 * 1024 * 1024, // 10MB limit for session replay data
});

registerRequestLogging(server);
registerApiErrorResponses(server);

server.register(cors, {
  delegator: createCorsOptionsDelegate(),
});
server.addHook("onRequest", createRejectUntrustedOriginHook());

// @fastify/rate-limit types FastifyContextConfig, which makes the homegrown
// `rawBody` route flag (read by the Stripe webhook body parser) a type error
// unless it is declared alongside.
declare module "fastify" {
  interface FastifyContextConfig {
    rawBody?: boolean;
  }
}

// Opt-in per-route rate limiting (routes declare config.rateLimit). Runs in
// preHandler so authenticated routes can key on the user instead of the IP.
server.register(rateLimit, {
  global: false,
  hook: "preHandler",
  keyGenerator: (request: FastifyRequest) => request.user?.id ?? request.ip,
  // Shared store so the limit holds across cluster workers; fall open if Redis
  // is unreachable rather than blocking the request.
  redis: apiRateLimitRedis,
  skipOnError: true,
});

// Serve static files
server.register(fastifyStatic, {
  root: join(__dirname, "../public"),
  prefix: "/", // or whatever prefix you need
});

server.register(
  async (fastify, options) => {
    await fastify.register(fastify => {
      const authHandler = toNodeHandler(options.auth);

      fastify.addContentTypeParser(
        "application/json",
        /* c8 ignore next 3 */
        (_request, _payload, done) => {
          done(null, null);
        }
      );

      // OAuth token requests (RFC 6749) are application/x-www-form-urlencoded;
      // pass them through untouched too or Fastify 415s before the better-auth
      // handler can read the raw stream.
      fastify.addContentTypeParser(
        "application/x-www-form-urlencoded",
        /* c8 ignore next 3 */
        (_request, _payload, done) => {
          done(null, null);
        }
      );

      fastify.all("/api/auth/*", async (request, reply: any) => {
        reply.raw.setHeaders(mapHeaders(reply.getHeaders()));
        await authHandler(request.raw, reply.raw);
      });
      fastify.all("/auth/*", async (request, reply: any) => {
        reply.raw.setHeaders(mapHeaders(reply.getHeaders()));
        await authHandler(request.raw, reply.raw);
      });
    });
  },
  { auth: auth! }
);

// OAuth discovery documents for MCP clients (RFC 8414 + RFC 9728). Clients
// look these up at the domain root; the underlying metadata comes from the
// better-auth MCP plugin.
server.register(oauthWellKnownRoutes);

// Serve analytics scripts with generic names to avoid ad-blocker detection.
// Cache them so browsers stop revalidating on every page load — without this they
// default to max-age=0, so each tracked page hit fires a conditional request that
// lands on caddy and the backend. script.js gets a short TTL so tracker updates
// still propagate quickly; the vendored libs rarely change and get a longer TTL.
server.get("/api/script.js", async (_, reply) => reply.sendFile("script.js", { maxAge: "1h" }));
server.get("/api/replay.js", async (_, reply) => reply.sendFile("rrweb.min.js", { maxAge: "1d" }));
server.get("/api/metrics.js", async (_, reply) => reply.sendFile("web-vitals.iife.js", { maxAge: "1d" }));

server.post("/api/track", trackEvent);
server.post("/api/identify", handleIdentify);

// Register API routes with /api prefix
server.register(apiRoutes, { prefix: "/api" });

const start = async () => {
  try {
    // When running as a cluster worker, the primary process already initialized the databases
    if (!cluster.isWorker) {
      await Promise.all([initializeClickhouse(), initPostgres()]);
    }

    // Every process runs this: the ClickHouse refresh is elected through Redis,
    // and each worker mirrors the shared result for the site-flood rules.
    startSiteBaselineRefresh();

    // Cron jobs should only run on the primary process (or in single-process mode)
    if (!cluster.isWorker) {
      telemetryService.startTelemetryCron();
      usageService.startUsageCheckCron();
      unclaimedSiteCleanupService.startCleanupCron();
      if (IS_CLOUD && process.env.NODE_ENV !== "development") {
        weeklyReportService.startWeeklyReportCron();
        lifecycleEmailService.startLifecycleCron();
      }
    }

    // Start the server first
    await server.listen({ port: 3001, host: "0.0.0.0" });
    server.log.info(`Server is listening on http://0.0.0.0:3001 (PID: ${process.pid})`);

    // Listen for IPC messages from the cluster primary process
    if (cluster.isWorker) {
      process.on("message", (message: { type: string; siteIds: number[] }) => {
        if (message?.type === "sites-over-limit") {
          usageService.setSitesOverLimit(new Set(message.siteIds));
          server.log.debug(`Received ${message.siteIds.length} sites-over-limit from primary`);
        } else if (message?.type === "sites-without-plan") {
          usageService.setSitesWithoutPlan(new Set(message.siteIds));
          server.log.debug(`Received ${message.siteIds.length} sites-without-plan from primary`);
        } else if (message?.type === "sites-without-replay") {
          usageService.setSitesWithoutReplay(new Set(message.siteIds));
          server.log.debug(`Received ${message.siteIds.length} sites-without-replay from primary`);
        }
      });
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    server.log.warn(`${signal} received during shutdown, forcing exit...`);
    process.exit(1);
  }

  isShuttingDown = true;
  server.log.info(`${signal} received, shutting down gracefully...`);

  // Set a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    server.log.error("Shutdown timeout exceeded, forcing exit...");
    process.exit(1);
  }, 10000); // 10 second timeout

  try {
    unclaimedSiteCleanupService.stopCleanupCron();
    // Stop accepting new connections
    await server.close();
    server.log.info("Server closed");

    // Identity backfills are buffered for several minutes to keep mutation
    // submissions rare; without this, a deploy drops whatever is still pending.
    await identityBackfillQueue.drainCompletely();

    // Clear the timeout since we're done
    clearTimeout(forceExitTimeout);

    process.exit(0);
  } catch (error) {
    server.log.error(error, "Error during shutdown");
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

declare module "fastify" {
  interface FastifyRequest {
    user?: any; // Or define a more specific user type
    /** Set by the auth guards when the bearer credential is an org-owned API key. */
    apiKeyOrganizationId?: string;
    /** True when the request was authenticated with a bearer credential (API key or OAuth token). */
    bearerAuth?: boolean;
    /** Scope statements of that credential; null = unrestricted. */
    bearerStatements?: ScopeStatements | null;
    /** The role a permission guard admitted the caller with, on the site or organization it checked. */
    accessRole?: OrgRole;
  }
}
