import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAdminOrganizations } from "./api/admin/getAdminOrganizations.js";
import { getAdminSites } from "./api/admin/getAdminSites.js";
import { getEventNames } from "./api/analytics/events/getEventNames.js";
import { getEventProperties } from "./api/analytics/events/getEventProperties.js";
import { getEvents } from "./api/analytics/events/getEvents.js";
import { createFunnel } from "./api/analytics/funnels/createFunnel.js";
import { deleteFunnel } from "./api/analytics/funnels/deleteFunnel.js";
import { getFunnel } from "./api/analytics/funnels/getFunnel.js";
import { getFunnels } from "./api/analytics/funnels/getFunnels.js";
import { getJourneys } from "./api/analytics/getJourneys.js";
import { getLiveSessionLocations } from "./api/analytics/getLiveSessionLocations.js";
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
import { addSite } from "./api/sites/addSite.js";
import { changeSiteBlockBots } from "./api/sites/changeSiteBlockBots.js";
import { changeSiteDomain } from "./api/sites/changeSiteDomain.js";
import { changeSitePublic } from "./api/sites/changeSitePublic.js";
import { changeSiteSalt } from "./api/sites/changeSiteSalt.js";
import { deleteSite } from "./api/sites/deleteSite.js";
import { getSite } from "./api/sites/getSite.js";
import { getSiteHasData } from "./api/sites/getSiteHasData.js";
import { getSiteIsPublic } from "./api/sites/getSiteIsPublic.js";
import { getSitesFromOrg } from "./api/sites/getSitesFromOrg.js";
import { createCheckoutSession } from "./api/stripe/createCheckoutSession.js";
import { createPortalSession } from "./api/stripe/createPortalSession.js";
import { getSubscription } from "./api/stripe/getSubscription.js";
import { handleWebhook } from "./api/stripe/webhook.js";
import { getUserOrganizations } from "./api/user/getUserOrganizations.js";
import { listOrganizationMembers } from "./api/user/listOrganizationMembers.js";
import { initializeCronJobs } from "./cron/index.js";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { allowList, loadAllowedDomains } from "./lib/allowedDomains.js";
import { getSessionFromReq, mapHeaders } from "./lib/auth-utils.js";
import { auth } from "./lib/auth.js";
import { IS_CLOUD } from "./lib/const.js";
import { siteConfig } from "./lib/siteConfig.js";
import { trackEvent } from "./tracker/trackEvent.js";
import { extractSiteId, isSitePublic, normalizeOrigin } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = Fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
  maxParamLength: 1500,
  trustProxy: true,
});

server.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowList.includes(normalizeOrigin(origin))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
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
    await fastify.register((fastify) => {
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
  "/api/script.js", // Updated script route
  "/api/config",
  "/api/auth",
  "/api/auth/callback/google",
  "/api/auth/callback/github",
  "/api/stripe/webhook",
];

// Define analytics routes that can be public
const ANALYTICS_ROUTES = [
  "/api/live-user-count/",
  "/api/overview/",
  "/api/overview-bucketed/",
  "/api/single-col/",
  "/api/page-titles/",
  "/api/retention/",
  "/api/site-has-data/",
  "/api/site-is-public/",
  "/api/sessions/",
  "/api/session/",
  "/api/recent-events/",
  "/api/users/",
  "/api/user/info/",
  "/api/user/session-count/",
  "/api/live-session-locations/",
  "/api/funnels/",
  "/api/funnel/",
  "/api/journeys/",
  "/api/goals/",
  "/api/goal/",
  "/api/analytics/events/names/",
  "/api/analytics/events/properties/",
  "/api/events/",
  "/api/get-site",
  "/api/performance/overview/",
  "/api/performance/time-series/",
  "/api/performance/by-path/",
  "/api/performance/by-dimension/",
];

server.addHook("onRequest", async (request, reply) => {
  const { url } = request.raw;

  if (!url) return;

  let processedUrl = url;

  // Bypass auth for public routes (now including the prepended /api)
  if (PUBLIC_ROUTES.some((route) => processedUrl.includes(route))) {
    return;
  }

  // Check if it's an analytics route and get site ID (now including the prepended /api)
  if (ANALYTICS_ROUTES.some((route) => processedUrl.startsWith(route))) {
    const siteId = extractSiteId(processedUrl);

    if (siteId && (await isSitePublic(siteId))) {
      // Skip auth check for public sites
      return;
    }
  }

  try {
    const session = await getSessionFromReq(request);

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Attach session user info to request
    request.user = session.user;
  } catch (err) {
    console.error("Auth Error:", err);
    return reply.status(500).send({ error: "Auth check failed" });
  }
});

// Add this with your other routes, around line 273
server.get("/api/script.js", async (request, reply) => {
  return reply.sendFile("script.js");
});

// Analytics

// This endpoint gets called a lot so we don't want to log it
server.get(
  "/api/live-user-count/:site",
  { logLevel: "silent" },
  getLiveUsercount
);
server.get("/api/overview/:site", getOverview);
server.get("/api/overview-bucketed/:site", getOverviewBucketed);
server.get("/api/single-col/:site", getSingleCol);
server.get("/api/page-titles/:site", getPageTitles);
server.get("/api/retention/:site", getRetention);
server.get("/api/site-has-data/:site", getSiteHasData);
server.get("/api/site-is-public/:site", getSiteIsPublic);
server.get("/api/sessions/:site", getSessions);
server.get("/api/session/:sessionId/:site", getSession);
server.get("/api/recent-events/:site", getEvents); // Legacy endpoint for backward compatibility
server.get("/api/events/:site", getEvents); // New endpoint with filtering and pagination
server.get("/api/users/:site", getUsers);
server.get("/api/user/:userId/sessions/:site", getUserSessions);
server.get("/api/user/session-count/:site", getUserSessionCount);
server.get("/api/user/info/:userId/:site", getUserInfo);
server.get("/api/live-session-locations/:site", getLiveSessionLocations);
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
server.get("/api/org-event-count/:organizationId", getOrgEventCount);

// Performance Analytics
server.get("/api/performance/overview/:site", getPerformanceOverview);
server.get("/api/performance/time-series/:site", getPerformanceTimeSeries);
server.get("/api/performance/by-dimension/:site", getPerformanceByDimension);

// Administrative
server.get("/api/config", getConfig);
server.post("/api/add-site", addSite);
server.post("/api/change-site-domain", changeSiteDomain);
server.post("/api/change-site-public", changeSitePublic);
server.post("/api/change-site-salt", changeSiteSalt);
server.post("/api/change-site-block-bots", changeSiteBlockBots);
server.post("/api/delete-site/:id", deleteSite);
server.get("/api/get-sites-from-org/:organizationId", getSitesFromOrg);
server.get("/api/get-site/:id", getSite);
server.get(
  "/api/list-organization-members/:organizationId",
  listOrganizationMembers
);
server.get("/api/user/organizations", getUserOrganizations);

if (IS_CLOUD) {
  // Stripe Routes
  server.post("/api/stripe/create-checkout-session", createCheckoutSession);
  server.post("/api/stripe/create-portal-session", createPortalSession);
  server.get("/api/stripe/subscription", getSubscription);
  server.post(
    "/api/stripe/webhook",
    { config: { rawBody: true } },
    handleWebhook
  ); // Use rawBody parser config for webhook

  // Admin Routes
  server.get("/api/admin/sites", getAdminSites);
  server.get("/api/admin/organizations", getAdminOrganizations);
}

server.post("/api/track", trackEvent);
server.get("/api/health", { logLevel: "silent" }, (_, reply) =>
  reply.send("OK")
);

const start = async () => {
  try {
    console.info("Starting server...");
    // Initialize the database
    await Promise.all([initializeClickhouse()]);
    await loadAllowedDomains();

    // Load site configurations cache
    await siteConfig.loadSiteConfigs();

    // Start the server
    await server.listen({ port: 3001, host: "0.0.0.0" });

    initializeCronJobs();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

declare module "fastify" {
  interface FastifyRequest {
    user?: any; // Or define a more specific user type
  }
}
