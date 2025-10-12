import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { collectTelemetry } from "./api/admin/collectTelemetry.js";
import { getAdminOrganizations } from "./api/admin/getAdminOrganizations.js";
import { getAdminSites } from "./api/admin/getAdminSites.js";
import { getEventNames } from "./api/analytics/events/getEventNames.js";
import { getEventProperties } from "./api/analytics/events/getEventProperties.js";
import { getEvents } from "./api/analytics/events/getEvents.js";
import { getOutboundLinks } from "./api/analytics/events/getOutboundLinks.js";
import { createFunnel } from "./api/analytics/funnels/createFunnel.js";
import { deleteFunnel } from "./api/analytics/funnels/deleteFunnel.js";
import { getFunnel } from "./api/analytics/funnels/getFunnel.js";
import { getFunnels } from "./api/analytics/funnels/getFunnels.js";
import { getErrorBucketed } from "./api/analytics/getErrorBucketed.js";
import { getErrorEvents } from "./api/analytics/getErrorEvents.js";
import { getErrorNames } from "./api/analytics/getErrorNames.js";
import { getJourneys } from "./api/analytics/getJourneys.js";
import { getSessionLocations } from "./api/analytics/getSessionLocations.js";
import { getLiveUsercount } from "./api/analytics/getLiveUsercount.js";
import { getOrgEventCount } from "./api/analytics/getOrgEventCount.js";
import { getOverview } from "./api/analytics/getOverview.js";
import { getOverviewBucketed } from "./api/analytics/getOverviewBucketed.js";
import { getPageTitles } from "./api/analytics/getPageTitles.js";
import { getRetention } from "./api/analytics/getRetention.js";
import { getSession } from "./api/analytics/getSession.js";
import { getSessions } from "./api/analytics/getSessions.js";
import { getSingleCol } from "./api/analytics/getSingleCol.js";
import { getUserInfo } from "./api/analytics/getUserInfo.js";
import { getUserSessionCount } from "./api/analytics/getUserSessionCount.js";
import { getUserSessions } from "./api/analytics/getUserSessions.js";
import { getUsers } from "./api/analytics/getUsers.js";
import { createGoal } from "./api/analytics/goals/createGoal.js";
import { deleteGoal } from "./api/analytics/goals/deleteGoal.js";
import { getGoals } from "./api/analytics/goals/getGoals.js";
import { updateGoal } from "./api/analytics/goals/updateGoal.js";
import { getPerformanceByDimension } from "./api/analytics/performance/getPerformanceByDimension.js";
import { getPerformanceOverview } from "./api/analytics/performance/getPerformanceOverview.js";
import { getPerformanceTimeSeries } from "./api/analytics/performance/getPerformanceTimeSeries.js";
import { getConfig } from "./api/getConfig.js";
import { getSessionReplayEvents } from "./api/sessionReplay/getSessionReplayEvents.js";
import { getSessionReplays } from "./api/sessionReplay/getSessionReplays.js";
import { recordSessionReplay } from "./api/sessionReplay/recordSessionReplay.js";
import { addSite } from "./api/sites/addSite.js";
import { updateSiteConfig } from "./api/sites/updateSiteConfig.js";
import { deleteSite } from "./api/sites/deleteSite.js";
import { getSite } from "./api/sites/getSite.js";
import { getSiteApiConfig } from "./api/sites/getSiteApiConfig.js";
import { getSiteExcludedIPs } from "./api/sites/getSiteExcludedIPs.js";
import { getSiteHasData } from "./api/sites/getSiteHasData.js";
import { getSiteIsPublic } from "./api/sites/getSiteIsPublic.js";
import { getSitesFromOrg } from "./api/sites/getSitesFromOrg.js";
import { updateSiteApiConfig } from "./api/sites/updateSiteApiConfig.js";
import { createCheckoutSession } from "./api/stripe/createCheckoutSession.js";
import { createPortalSession } from "./api/stripe/createPortalSession.js";
import { getSubscription } from "./api/stripe/getSubscription.js";
import { previewSubscriptionUpdate } from "./api/stripe/previewSubscriptionUpdate.js";
import { updateSubscription } from "./api/stripe/updateSubscription.js";
import { handleWebhook } from "./api/stripe/webhook.js";
import { addUserToOrganization } from "./api/user/addUserToOrganization.js";
import { getUserOrganizations } from "./api/user/getUserOrganizations.js";
import { listOrganizationMembers } from "./api/user/listOrganizationMembers.js";
import { updateAccountSettings } from "./api/user/updateAccountSettings.js";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { initPostgres } from "./db/postgres/initPostgres.js";
import { getSessionFromReq, mapHeaders } from "./lib/auth-utils.js";
import { auth } from "./lib/auth.js";
import { IS_CLOUD } from "./lib/const.js";
import { siteConfig } from "./lib/siteConfig.js";
import { trackEvent } from "./services/tracker/trackEvent.js";
// need to import telemetry service here to start it
import { telemetryService } from "./services/telemetryService.js";
import { weeklyReportService } from "./services/weekyReports/weeklyReportService.js";
import { extractSiteId } from "./utils.js";
import { getTrackingConfig } from "./api/sites/getTrackingConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const hasAxiom = !!(process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN);

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info"),
    transport:
      process.env.NODE_ENV === "production" && IS_CLOUD && hasAxiom
        ? {
            targets: [
              // Send to Axiom
              {
                target: "@axiomhq/pino",
                level: process.env.LOG_LEVEL || "info",
                options: {
                  dataset: process.env.AXIOM_DATASET,
                  token: process.env.AXIOM_TOKEN,
                },
              },
              // Pretty print to stdout for Docker logs
              {
                target: "pino-pretty",
                level: process.env.LOG_LEVEL || "info",
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: "HH:MM:ss",
                  ignore: "pid,hostname,name",
                  destination: 1, // stdout
                },
              },
            ],
          }
        : process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                singleLine: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname,name",
              },
            }
          : undefined, // Production without Axiom - plain JSON to stdout
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          path: request.url,
          parameters: request.params,
          headers: request.headers,
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
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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

const PUBLIC_ROUTES: string[] = [
  "/api/health",
  "/api/track",
  "/track",
  "/api/script.js",
  "/api/script-full.js",
  "/api/replay.js",
  "/api/metrics.js",
  "/api/config",
  "/api/auth",
  "/api/auth/callback/google",
  "/api/auth/callback/github",
  "/api/stripe/webhook",
  "/api/session-replay/record",
  "/api/admin/telemetry",
  "/api/site/:siteId/tracking-config",
];

// Define analytics routes that can be public
const ANALYTICS_ROUTES = [
  "/api/live-user-count/",
  "/api/overview/",
  "/api/overview-bucketed/",
  "/api/error-bucketed/",
  "/api/single-col/",
  "/api/page-titles/",
  "/api/retention/",
  "/api/site-has-data/",
  "/api/site-is-public/",
  "/api/sessions/",
  "/api/session/",
  "/api/users/",
  "/api/user/info/",
  "/api/user/session-count/",
  "/api/session-locations/",
  "/api/funnels/",
  "/api/funnel/",
  "/api/journeys/",
  "/api/goals/",
  "/api/goal/",
  "/api/analytics/events/names/",
  "/api/analytics/events/properties/",
  "/api/events/",
  "/api/events/outbound/",
  "/api/get-site",
  "/api/performance/overview/",
  "/api/performance/time-series/",
  "/api/performance/by-path/",
  "/api/performance/by-dimension/",
  "/api/error-names/",
  "/api/error-events/",
  "/api/error-bucketed/",
  "/api/session-replay/",
];

server.addHook("onRequest", async (request, reply) => {
  const { url } = request.raw;

  if (!url) return;

  let processedUrl = url;

  // Bypass auth for public routes (now including the prepended /api)
  if (PUBLIC_ROUTES.some(route => processedUrl.includes(route))) {
    return;
  }

  // Check if it's an analytics route and get site ID (now including the prepended /api)
  if (ANALYTICS_ROUTES.some(route => processedUrl.startsWith(route))) {
    const siteId = extractSiteId(processedUrl);

    if (siteId && (await siteConfig.getConfig(siteId))?.public) {
      // Skip auth check for public sites
      return;
    }
  }

  try {
    const session = await getSessionFromReq(request);

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized 1" });
    }

    // Attach session user info to request
    request.user = session.user;
  } catch (err) {
    console.error("Auth Error:", err);
    return reply.status(500).send({ error: "Auth check failed" });
  }
});

// Serve analytics scripts with generic names to avoid ad-blocker detection
server.get("/api/script.js", async (_, reply) => reply.sendFile("script.js"));
server.get("/api/replay.js", async (_, reply) => reply.sendFile("rrweb.min.js"));
server.get("/api/metrics.js", async (_, reply) => reply.sendFile("web-vitals.iife.js"));

// WEB & PRODUCT ANALYTICS

// This endpoint gets called a lot so we don't want to log it
server.get("/api/live-user-count/:site", { logLevel: "silent" }, getLiveUsercount);
server.get("/api/overview/:site", getOverview);
server.get("/api/overview-bucketed/:site", getOverviewBucketed);
server.get("/api/single-col/:site", getSingleCol);
server.get("/api/page-titles/:site", getPageTitles);
server.get("/api/error-names/:site", getErrorNames);
server.get("/api/error-events/:site", getErrorEvents);
server.get("/api/error-bucketed/:site", getErrorBucketed);
server.get("/api/retention/:site", getRetention);
server.get("/api/site-has-data/:site", getSiteHasData);
server.get("/api/site-is-public/:site", getSiteIsPublic);
server.get("/api/sessions/:site", getSessions);
server.get("/api/session/:sessionId/:site", getSession);
server.get("/api/events/:site", getEvents);
server.get("/api/users/:site", getUsers);
server.get("/api/user/:userId/sessions/:site", getUserSessions);
server.get("/api/user/session-count/:site", getUserSessionCount);
server.get("/api/user/info/:userId/:site", getUserInfo);
server.get("/api/session-locations/:site", getSessionLocations);
server.get("/api/funnels/:site", getFunnels);
server.get("/api/journeys/:site", getJourneys);
server.post("/api/funnel/:site", getFunnel);
server.post("/api/funnel/create/:site", createFunnel);
server.delete("/api/funnel/:funnelId", deleteFunnel);
server.get("/api/goals/:site", getGoals);
server.post("/api/goal/create", createGoal);
server.delete("/api/goal/:goalId", deleteGoal);
server.put("/api/goal/update", updateGoal);
server.get("/api/events/names/:site", getEventNames);
server.get("/api/events/properties/:site", getEventProperties);
server.get("/api/events/outbound/:site", getOutboundLinks);
server.get("/api/org-event-count/:organizationId", getOrgEventCount);

// Performance Analytics
server.get("/api/performance/overview/:site", getPerformanceOverview);
server.get("/api/performance/time-series/:site", getPerformanceTimeSeries);
server.get("/api/performance/by-dimension/:site", getPerformanceByDimension);

// Session Replay
server.post("/api/session-replay/record/:site", recordSessionReplay);
server.get("/api/session-replay/list/:site", getSessionReplays);
server.get("/api/session-replay/:sessionId/:site", getSessionReplayEvents);

// Administrative
server.get("/api/config", getConfig);
server.post("/api/add-site", addSite);
server.post("/api/update-site-config", updateSiteConfig);
server.post("/api/delete-site/:id", deleteSite);
server.get("/api/get-sites-from-org/:organizationId", getSitesFromOrg);
server.get("/api/get-site/:id", getSite);
server.get("/api/site/:siteId/api-config", getSiteApiConfig);
server.post("/api/site/:siteId/api-config", updateSiteApiConfig);
server.get("/api/site/:siteId/tracking-config", getTrackingConfig);
server.get("/api/site/:siteId/excluded-ips", getSiteExcludedIPs);
server.get("/api/list-organization-members/:organizationId", listOrganizationMembers);
server.get("/api/user/organizations", getUserOrganizations);
server.post("/api/add-user-to-organization", addUserToOrganization);
server.post("/api/user/account-settings", updateAccountSettings);

// UPTIME MONITORING
// Only register uptime routes when IS_CLOUD is true (Redis is available)
// if (IS_CLOUD) {
//   // Dynamically import uptime modules only when needed
//   const { getMonitors } = await import("./api/uptime/getMonitors.js");
//   const { getMonitor } = await import("./api/uptime/getMonitor.js");
//   const { createMonitor } = await import("./api/uptime/createMonitor.js");
//   const { updateMonitor } = await import("./api/uptime/updateMonitor.js");
//   const { deleteMonitor } = await import("./api/uptime/deleteMonitor.js");
//   const { getMonitorEvents } = await import("./api/uptime/getMonitorEvents.js");
//   const { getMonitorStats } = await import("./api/uptime/getMonitorStats.js");
//   const { getMonitorUptimeBuckets } = await import("./api/uptime/getMonitorUptimeBuckets.js");
//   const { getMonitorStatus } = await import("./api/uptime/getMonitorStatus.js");
//   const { getMonitorUptime } = await import("./api/uptime/getMonitorUptime.js");
//   const { getRegions } = await import("./api/uptime/getRegions.js");
//   const { incidentsRoutes } = await import("./api/uptime/incidents.js");
//   const { notificationRoutes } = await import("./api/uptime/notifications.js");

//   server.get("/api/uptime/monitors", getMonitors);
//   server.get("/api/uptime/monitors/:monitorId", getMonitor);
//   server.post("/api/uptime/monitors", createMonitor);
//   server.put("/api/uptime/monitors/:monitorId", updateMonitor);
//   server.delete("/api/uptime/monitors/:monitorId", deleteMonitor);
//   server.get("/api/uptime/monitors/:monitorId/events", getMonitorEvents);
//   server.get("/api/uptime/monitors/:monitorId/stats", getMonitorStats);
//   server.get("/api/uptime/monitors/:monitorId/status", getMonitorStatus);
//   server.get("/api/uptime/monitors/:monitorId/uptime", getMonitorUptime);
//   server.get("/api/uptime/monitors/:monitorId/buckets", getMonitorUptimeBuckets);
//   server.get("/api/uptime/regions", getRegions);

//   // Register incidents routes
//   server.register(incidentsRoutes);

//   // Register notification routes
//   server.register(notificationRoutes);
// }

// STRIPE & ADMIN

if (IS_CLOUD) {
  // Stripe Routes
  server.post("/api/stripe/create-checkout-session", createCheckoutSession);
  server.post("/api/stripe/create-portal-session", createPortalSession);
  server.post("/api/stripe/preview-subscription-update", previewSubscriptionUpdate);
  server.post("/api/stripe/update-subscription", updateSubscription);
  server.get("/api/stripe/subscription", getSubscription);
  server.post("/api/stripe/webhook", { config: { rawBody: true } }, handleWebhook); // Use rawBody parser config for webhook

  // Admin Routes
  server.get("/api/admin/sites", getAdminSites);
  server.get("/api/admin/organizations", getAdminOrganizations);
  server.post("/api/admin/telemetry", collectTelemetry);
}

server.post("/track", trackEvent);
server.post("/api/track", trackEvent);

server.get("/api/health", { logLevel: "silent" }, (_, reply) => reply.send("OK"));

const start = async () => {
  try {
    console.info("Starting server...");
    await Promise.all([initializeClickhouse(), initPostgres()]);

    telemetryService.startTelemetryCron();
    if (IS_CLOUD) {
      weeklyReportService.startWeeklyReportCron();
    }

    // Start the server first
    await server.listen({ port: 3001, host: "0.0.0.0" });
    server.log.info("Server is listening on http://0.0.0.0:3001");

    // Test Axiom logging
    if (hasAxiom) {
      server.log.info({ axiom: true, dataset: process.env.AXIOM_DATASET }, "Axiom logging is configured");
    }

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
