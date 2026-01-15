import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { toNodeHandler } from "better-auth/node";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  collectTelemetry,
  getAdminOrganizations,
  getAdminServiceEventCount,
  getAdminSites,
} from "./api/admin/index.js";
import {
  createFunnel,
  createGoal,
  deleteFunnel,
  deleteGoal,
  generatePdfReport,
  getErrorBucketed,
  getErrorEvents,
  getErrorNames,
  getEventBucketed,
  getEventNames,
  getEventProperties,
  getEvents,

  getFunnel,
  getFunnelStepSessions,
  getFunnels,
  getGoalSessions,
  getGoals,
  getJourneys,
  getLiveUsercount,
  getMetric,
  getOrgEventCount,
  getOutboundLinks,
  getOverview,
  getOverviewBucketed,
  getPageTitles,
  getPerformanceByDimension,
  getPerformanceOverview,
  getPerformanceTimeSeries,
  getRetention,
  getSession,
  getSessionLocations,
  getSessions,
  getUserInfo,
  getUserSessionCount,
  getUsers,
  updateGoal,
} from "./api/analytics/index.js";
import { getConfig } from "./api/getConfig.js";
import {
  connectGSC,
  disconnectGSC,
  getGSCData,
  getGSCStatus,
  gscCallback,
  selectGSCProperty,
} from "./api/gsc/index.js";
import { updateInvitationSiteAccess, updateMemberSiteAccess } from "./api/memberAccess/index.js";
import {
  deleteSessionReplay,
  getSessionReplayEvents,
  getSessionReplays,
  recordSessionReplay,
} from "./api/sessionReplay/index.js";
import {
  addSite,
  batchImportEvents,
  createSiteImport,
  deleteSite,
  deleteSiteImport,
  getSite,
  getSiteExcludedCountries,
  getSiteExcludedIPs,
  getSiteHasData,
  getSiteImports,
  getSiteIsPublic,
  getSitePrivateLinkConfig,
  getSitesFromOrg,
  getTrackingConfig,
  updateSiteConfig,
  updateSitePrivateLinkConfig,
} from "./api/sites/index.js";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  handleWebhook,
  previewSubscriptionUpdate,
  updateSubscription,
} from "./api/stripe/index.js";
import {
  addUserToOrganization,
  createApiKey,
  deleteApiKey,
  getMyOrganizations,
  getUserOrganizations,
  listApiKeys,
  listOrganizationMembers,
  oneClickUnsubscribeMarketing,
  unsubscribeMarketing,
  updateAccountSettings,
} from "./api/user/index.js";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { initPostgres } from "./db/postgres/initPostgres.js";
import {
  allowPublicSiteAccess,
  requireAdmin,
  requireAuth,
  requireOrgAdminFromParams,
  requireOrgMember,
  requireSiteAccess,
  requireSiteAdminAccess,
  resolveSiteId,
} from "./lib/auth-middleware.js";
import { mapHeaders } from "./lib/auth-utils.js";
import { auth } from "./lib/auth.js";
import { IS_CLOUD } from "./lib/const.js";
import { reengagementService } from "./services/reengagement/reengagementService.js";
import { telemetryService } from "./services/telemetryService.js";
import { handleIdentify } from "./services/tracker/identifyService.js";
import { trackEvent } from "./services/tracker/trackEvent.js";
import { weeklyReportService } from "./services/weekyReports/weeklyReportService.js";

// Pre-composed middleware chains for common auth patterns
// Cast as any to work around Fastify's type inference limitations with preHandler
const publicSite = { preHandler: [resolveSiteId, allowPublicSiteAccess] as any };
const authSite = { preHandler: [resolveSiteId, requireSiteAccess] as any };
const adminSite = { preHandler: [resolveSiteId, requireSiteAdminAccess] as any };
const authOnly = { preHandler: [requireAuth] as any };
const adminOnly = { preHandler: [requireAdmin] as any };
const orgMember = { preHandler: [requireOrgMember] as any };
const orgAdminParams = { preHandler: [requireOrgAdminFromParams] as any };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = Fastify({
  disableRequestLogging: true,
  logger: {
    // level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info"),
    level: "debug",
    transport: {
      target: "pino-pretty",
      level: process.env.LOG_LEVEL || "debug",
      options: {
        colorize: true,
        singleLine: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,name",
        destination: 1, // stdout
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
  },
  maxParamLength: 1500,
  trustProxy: true,
  bodyLimit: 10 * 1024 * 1024, // 10MB limit for session replay data
});

server.register(cors, {
  origin: (_origin, callback) => {
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-captcha-response", "x-private-key"],
  credentials: true,
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

// Serve analytics scripts with generic names to avoid ad-blocker detection
server.get("/api/script.js", async (_, reply) => reply.sendFile("script.js"));
server.get("/api/replay.js", async (_, reply) => reply.sendFile("rrweb.min.js"));
server.get("/api/metrics.js", async (_, reply) => reply.sendFile("web-vitals.iife.js"));

// Domain-specific route plugins
async function analyticsRoutes(fastify: FastifyInstance) {
  // WEB & PRODUCT ANALYTICS

  // This endpoint gets called a lot so we don't want to log it
  fastify.get("/sites/:siteId/live-user-count", { logLevel: "silent", ...publicSite }, getLiveUsercount);
  fastify.get("/sites/:siteId/overview", publicSite, getOverview);
  fastify.get("/sites/:siteId/overview-bucketed", publicSite, getOverviewBucketed);
  fastify.get("/sites/:siteId/metric", publicSite, getMetric);
  fastify.get("/sites/:siteId/page-titles", publicSite, getPageTitles);
  fastify.get("/sites/:siteId/error-names", publicSite, getErrorNames);
  fastify.get("/sites/:siteId/error-events", publicSite, getErrorEvents);
  fastify.get("/sites/:siteId/error-bucketed", publicSite, getErrorBucketed);
  fastify.get("/sites/:siteId/retention", publicSite, getRetention);
  fastify.get("/sites/:siteId/has-data", publicSite, getSiteHasData);
  fastify.get("/sites/:siteId/is-public", publicSite, getSiteIsPublic);
  fastify.get("/sites/:siteId/sessions", publicSite, getSessions);
  fastify.get("/sites/:siteId/sessions/:sessionId", publicSite, getSession);
  fastify.get("/sites/:siteId/events", publicSite, getEvents);
  fastify.get("/sites/:siteId/events/bucketed", publicSite, getEventBucketed);
  fastify.get("/sites/:siteId/users", publicSite, getUsers);

  fastify.get("/sites/:siteId/users/session-count", publicSite, getUserSessionCount);
  fastify.get("/sites/:siteId/users/:userId", publicSite, getUserInfo);
  fastify.get("/sites/:siteId/session-locations", publicSite, getSessionLocations);
  fastify.get("/sites/:siteId/funnels", publicSite, getFunnels);
  fastify.get("/sites/:siteId/journeys", publicSite, getJourneys);
  fastify.post("/sites/:siteId/funnels/analyze", publicSite, getFunnel);
  fastify.post("/sites/:siteId/funnels/:stepNumber/sessions", publicSite, getFunnelStepSessions);
  fastify.post("/sites/:siteId/funnels", authSite, createFunnel);
  fastify.delete("/sites/:siteId/funnels/:funnelId", authSite, deleteFunnel);
  fastify.get("/sites/:siteId/goals", publicSite, getGoals);
  fastify.get("/sites/:siteId/goals/:goalId/sessions", publicSite, getGoalSessions);
  fastify.post("/sites/:siteId/goals", authSite, createGoal);
  fastify.delete("/sites/:siteId/goals/:goalId", authSite, deleteGoal);
  fastify.put("/sites/:siteId/goals/:goalId", authSite, updateGoal);
  fastify.get("/sites/:siteId/events/names", publicSite, getEventNames);
  fastify.get("/sites/:siteId/events/properties", publicSite, getEventProperties);
  fastify.get("/sites/:siteId/events/outbound", publicSite, getOutboundLinks);
  fastify.get("/org-event-count/:organizationId", orgMember, getOrgEventCount);
  fastify.get("/sites/:siteId/performance/overview", publicSite, getPerformanceOverview);
  fastify.get("/sites/:siteId/performance/time-series", publicSite, getPerformanceTimeSeries);
  fastify.get("/sites/:siteId/performance/by-dimension", publicSite, getPerformanceByDimension);
  fastify.get("/sites/:siteId/export/pdf", publicSite, generatePdfReport);
}

async function sessionReplayRoutes(fastify: FastifyInstance) {
  // Session Replay
  fastify.post("/session-replay/record/:siteId", recordSessionReplay); // Public - tracking endpoint
  fastify.get("/sites/:siteId/session-replay/list", publicSite, getSessionReplays);
  fastify.get("/sites/:siteId/session-replay/:sessionId", publicSite, getSessionReplayEvents);
  fastify.delete("/sites/:siteId/session-replay/:sessionId", authSite, deleteSessionReplay);
}

async function sitesRoutes(fastify: FastifyInstance) {
  // Sites
  fastify.get("/sites/:siteId", publicSite, getSite);
  fastify.put("/sites/:siteId/config", adminSite, updateSiteConfig);
  fastify.delete("/sites/:siteId", adminSite, deleteSite);
  fastify.get("/sites/:siteId/private-link-config", adminSite, getSitePrivateLinkConfig);
  fastify.post("/sites/:siteId/private-link-config", adminSite, updateSitePrivateLinkConfig);
  fastify.get("/site/tracking-config/:siteId", getTrackingConfig); // Public - used by tracking script
  fastify.get("/sites/:siteId/excluded-ips", authSite, getSiteExcludedIPs);
  fastify.get("/sites/:siteId/excluded-countries", authSite, getSiteExcludedCountries);

  // Site Imports
  fastify.get("/sites/:siteId/imports", adminSite, getSiteImports);
  fastify.post("/sites/:siteId/imports", adminSite, createSiteImport);
  fastify.post("/sites/:siteId/imports/:importId/events", adminSite, batchImportEvents);
  fastify.delete("/sites/:siteId/imports/:importId", adminSite, deleteSiteImport);
}

async function organizationsRoutes(fastify: FastifyInstance) {
  // Organizations
  fastify.get("/organizations", getMyOrganizations);
  fastify.get("/organizations/:organizationId/sites", orgMember, getSitesFromOrg);
  fastify.post("/organizations/:organizationId/sites", orgAdminParams, addSite);
  fastify.get("/organizations/:organizationId/members", orgMember, listOrganizationMembers);
  fastify.post("/organizations/:organizationId/members", orgMember, addUserToOrganization);

  // Member site access management (admin/owner only)
  fastify.put("/organizations/:organizationId/members/:memberId/sites", orgAdminParams, updateMemberSiteAccess);

  // Invitation site access management (admin/owner only)
  fastify.put(
    "/organizations/:organizationId/invitations/:invitationId/sites",
    orgAdminParams,
    updateInvitationSiteAccess
  );
}

async function userRoutes(fastify: FastifyInstance) {
  // User
  fastify.get("/config", getConfig); // Public - returns app config
  fastify.get("/user/organizations", authOnly, getUserOrganizations);
  fastify.post("/user/account-settings", authOnly, updateAccountSettings);
  fastify.post("/user/unsubscribe-marketing", authOnly, unsubscribeMarketing);
  fastify.get("/user/unsubscribe-marketing-oneclick", oneClickUnsubscribeMarketing); // Public - for link clicks
  fastify.post("/user/unsubscribe-marketing-oneclick", oneClickUnsubscribeMarketing); // Public - for List-Unsubscribe header
  fastify.get("/user/api-keys", authOnly, listApiKeys);
  fastify.post("/user/api-keys", authOnly, createApiKey);
  fastify.delete("/user/api-keys/:keyId", authOnly, deleteApiKey);
}

async function gscRoutes(fastify: FastifyInstance) {
  // GOOGLE SEARCH CONSOLE
  fastify.get("/sites/:siteId/gsc/connect", authSite, connectGSC);
  fastify.get("/gsc/callback", gscCallback); // Public - OAuth callback
  fastify.get("/sites/:siteId/gsc/status", publicSite, getGSCStatus);
  fastify.delete("/sites/:siteId/gsc/disconnect", authSite, disconnectGSC);
  fastify.post("/sites/:siteId/gsc/select-property", authSite, selectGSCProperty);
  fastify.get("/sites/:siteId/gsc/data", publicSite, getGSCData);
}

async function stripeAdminRoutes(fastify: FastifyInstance) {
  // STRIPE & ADMIN
  if (IS_CLOUD) {
    // Stripe Routes
    fastify.post("/stripe/create-checkout-session", authOnly, createCheckoutSession);
    fastify.post("/stripe/create-portal-session", authOnly, createPortalSession);
    fastify.post("/stripe/preview-subscription-update", authOnly, previewSubscriptionUpdate);
    fastify.post("/stripe/update-subscription", authOnly, updateSubscription);
    fastify.get("/stripe/subscription", authOnly, getSubscription);
    fastify.post("/stripe/webhook", { config: { rawBody: true } }, handleWebhook); // Public - Stripe webhook

    // Admin Routes
    fastify.get("/admin/sites", adminOnly, getAdminSites);
    fastify.get("/admin/organizations", adminOnly, getAdminOrganizations);
    fastify.get("/admin/service-event-count", adminOnly, getAdminServiceEventCount);
    fastify.post("/admin/telemetry", collectTelemetry); // Public - telemetry collection

    // AppSumo Routes
    const { activateAppSumoLicense, handleAppSumoWebhook } = await import("./api/as/index.js");

    fastify.post("/as/activate", authOnly, activateAppSumoLicense);
    fastify.post("/as/webhook", handleAppSumoWebhook); // Public - AppSumo webhook
  }
}

// Main API routes plugin - registers all domain plugins
async function apiRoutes(fastify: FastifyInstance) {
  await fastify.register(analyticsRoutes);
  await fastify.register(sessionReplayRoutes);
  await fastify.register(sitesRoutes);
  await fastify.register(organizationsRoutes);
  await fastify.register(userRoutes);
  await fastify.register(gscRoutes);
  await fastify.register(stripeAdminRoutes);

  // Health check
  fastify.get("/health", { logLevel: "silent" }, (_: FastifyRequest, reply: FastifyReply) => reply.send("OK"));
}

server.post("/api/track", trackEvent);
server.post("/api/identify", handleIdentify);

// Register API routes with /api prefix
server.register(apiRoutes, { prefix: "/api" });

const start = async () => {
  try {
    await Promise.all([initializeClickhouse(), initPostgres()]);

    telemetryService.startTelemetryCron();
    if (IS_CLOUD && process.env.NODE_ENV !== "development") {
      weeklyReportService.startWeeklyReportCron();
      reengagementService.startReengagementCron();
    }

    // Start the server first
    await server.listen({ port: 3001, host: "0.0.0.0" });
    server.log.info("Server is listening on http://0.0.0.0:3001");

    // if (process.env.NODE_ENV === "production") {
    //   // Initialize uptime monitoring service in the background (non-blocking)
    //   uptimeService
    //     .initialize()
    //     .then(() => {
    //       server.log.info("Uptime monitoring service initialized successfully");
    //     })
    //     .catch((error) => {
    //       server.log.error("Failed to initialize uptime service:", error);
    //       // Continue running without uptime monitoring
    //     });
    // }
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
    // Stop accepting new connections
    await server.close();
    server.log.info("Server closed");

    // Shutdown uptime service
    // await uptimeService.shutdown();
    // server.log.info("Uptime service shut down");

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
  }
}
