import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import { dirname, join } from "path";
import { Headers, HeadersInit } from "undici";
import { fileURLToPath } from "url";
import { createFunnel } from "./api/analytics/createFunnel.js";
import { createGoal } from "./api/analytics/createGoal.js";
import { deleteGoal } from "./api/analytics/deleteGoal.js";
import { deleteFunnel } from "./api/analytics/deleteFunnel.js";
import { getEventNames } from "./api/analytics/getEventNames.js";
import { getEventProperties } from "./api/analytics/getEventProperties.js";
import { getEvents } from "./api/analytics/getEvents.js";
import { getFunnel } from "./api/analytics/getFunnel.js";
import { getFunnels } from "./api/analytics/getFunnels.js";
import { getGoal } from "./api/analytics/getGoal.js";
import { getGoals } from "./api/analytics/getGoals.js";
import { getJourneys } from "./api/analytics/getJourneys.js";
import { getLiveSessionLocations } from "./api/analytics/getLiveSessionLocations.js";
import { getLiveUsercount } from "./api/analytics/getLiveUsercount.js";
import { getOverview } from "./api/analytics/getOverview.js";
import { getOverviewBucketed } from "./api/analytics/getOverviewBucketed.js";
import { getRetention } from "./api/analytics/getRetention.js";
import { getSession } from "./api/analytics/getSession.js";
import { getSessions } from "./api/analytics/getSessions.js";
import { getSingleCol } from "./api/analytics/getSingleCol.js";
import { getUserInfo } from "./api/analytics/getUserInfo.js";
import { getUserSessionCount } from "./api/analytics/getUserSessionCount.js";
import { getUserSessions } from "./api/analytics/getUserSessions.js";
import { getUsers } from "./api/analytics/getUsers.js";
import { updateGoal } from "./api/analytics/updateGoal.js";
import { addSite } from "./api/sites/addSite.js";
import { changeSiteDomain } from "./api/sites/changeSiteDomain.js";
import { changeSitePublic } from "./api/sites/changeSitePublic.js";
import { changeSiteSalt } from "./api/sites/changeSiteSalt.js";
import { changeSiteBlockBots } from "./api/sites/changeSiteBlockBots.js";
import { deleteSite } from "./api/sites/deleteSite.js";
import { getSite } from "./api/sites/getSite.js";
import { getSiteHasData } from "./api/sites/getSiteHasData.js";
import { getSiteIsPublic } from "./api/sites/getSiteIsPublic.js";
import { getSites } from "./api/sites/getSites.js";
import { createAccount } from "./api/user/createAccount.js";
import { getUserOrganizations } from "./api/user/getUserOrganizations.js";
import { listOrganizationMembers } from "./api/user/listOrganizationMembers.js";
import { initializeCronJobs } from "./cron/index.js";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { allowList, loadAllowedDomains } from "./lib/allowedDomains.js";
import { getSessionFromReq, mapHeaders } from "./lib/auth-utils.js";
import { auth } from "./lib/auth.js";
import { siteConfig } from "./lib/siteConfig.js";
import { trackEvent } from "./tracker/trackEvent.js";
import { extractSiteId, isSitePublic, normalizeOrigin } from "./utils.js";
import { createCheckoutSession } from "./api/stripe/createCheckoutSession.js";
import { createPortalSession } from "./api/stripe/createPortalSession.js";
import { getSubscription } from "./api/stripe/getSubscription.js";
import { handleWebhook } from "./api/stripe/webhook.js";
import { IS_CLOUD } from "./lib/const.js";
import { addUserToOrganization } from "./api/user/addUserToOrganization.js";
import { getConfig } from "./api/getConfig.js";
import { getPageTitles } from "./api/analytics/getPageTitles.js";
import { getAdminSites } from "./api/admin/getAdminSites.js";
import { getAdminUsers } from "./api/admin/getAdminUsers.js";
import { getOrgEventCount } from "./api/analytics/getOrgEventCount.js";

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
  "/health",
  "/track",
  "/script",
  "/auth",
  "/config",
  "/api/auth",
  "/api/auth/callback/google",
  "/api/auth/callback/github",
  "/api/stripe/webhook", // Add webhook to public routes
];

// Define analytics routes that can be public
const ANALYTICS_ROUTES = [
  "/live-user-count/",
  "/overview/",
  "/overview-bucketed/",
  "/single-col/",
  "/page-titles/",
  "/retention/",
  "/site-has-data/",
  "/site-is-public/",
  "/sessions/",
  "/session/",
  "/recent-events/",
  "/users/",
  "/user/info/",
  "/user/session-count/",
  "/live-session-locations/",
  "/funnels/",
  "/funnel/",
  "/journeys/",
  "/goals/",
  "/goal/",
  "/api/analytics/events/names/",
  "/api/analytics/events/properties/",
  "/events/",
  "/get-site",
];

// Check if a route is an analytics route
const isAnalyticsRoute = (path: string) => {
  return ANALYTICS_ROUTES.some((route) => path.startsWith(route));
};

server.addHook("onRequest", async (request, reply) => {
  const { url } = request.raw;

  if (!url) return;

  // Bypass auth for health check and tracking
  if (PUBLIC_ROUTES.some((route) => url.includes(route))) {
    return;
  }

  // Check if it's an analytics route and get site ID
  if (isAnalyticsRoute(url)) {
    const siteId = extractSiteId(url);

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

// Analytics
server.get("/live-user-count/:site", getLiveUsercount);
server.get("/overview/:site", getOverview);
server.get("/overview-bucketed/:site", getOverviewBucketed);
server.get("/single-col/:site", getSingleCol);
server.get("/page-titles/:site", getPageTitles);
server.get("/retention/:site", getRetention);
server.get("/site-has-data/:site", getSiteHasData);
server.get("/site-is-public/:site", getSiteIsPublic);
server.get("/sessions/:site", getSessions);
server.get("/session/:sessionId/:site", getSession);
server.get("/recent-events/:site", getEvents); // Legacy endpoint for backward compatibility
server.get("/events/:site", getEvents); // New endpoint with filtering and pagination
server.get("/users/:site", getUsers);
server.get("/user/:userId/sessions/:site", getUserSessions);
server.get("/user/session-count/:site", getUserSessionCount);
server.get("/user/info/:userId/:site", getUserInfo);
server.get("/live-session-locations/:site", getLiveSessionLocations);
server.get("/funnels/:site", getFunnels);
server.get("/journeys/:site", getJourneys);
server.post("/funnel/:site", getFunnel);
server.post("/funnel/create/:site", createFunnel);
server.delete("/funnel/:funnelId", deleteFunnel);
server.get("/goals/:site", getGoals);
server.get("/goal/:goalId/:site", getGoal);
server.post("/goal/create", createGoal);
server.delete("/goal/:goalId", deleteGoal);
server.put("/goal/update", updateGoal);
server.get("/events/names/:site", getEventNames);
server.get("/events/properties/:site", getEventProperties);
server.get("/org-event-count/:organizationId", getOrgEventCount);

// Administrative
server.get("/config", getConfig);
server.post("/add-site", addSite);
server.post("/change-site-domain", changeSiteDomain);
server.post("/change-site-public", changeSitePublic);
server.post("/change-site-salt", changeSiteSalt);
server.post("/change-site-block-bots", changeSiteBlockBots);
server.post("/delete-site/:id", deleteSite);
server.get("/get-sites", getSites);
server.get("/get-site/:id", getSite);
server.post("/create-account", createAccount);
server.get(
  "/list-organization-members/:organizationId",
  listOrganizationMembers
);
server.get("/user/organizations", getUserOrganizations);
server.post("/add-user-to-organization", addUserToOrganization);

if (IS_CLOUD) {
  // Stripe Routes
  server.post("/stripe/create-checkout-session", createCheckoutSession);
  server.post("/stripe/create-portal-session", createPortalSession);
  server.get("/stripe/subscription", getSubscription);
  server.post(
    "/api/stripe/webhook",
    { config: { rawBody: true } },
    handleWebhook
  ); // Use rawBody parser config for webhook

  // Admin Routes
  server.get("/admin/sites", getAdminSites);
  server.get("/admin/users", getAdminUsers);
}

server.post("/track", trackEvent);
server.get("/health", (_, reply) => reply.send("OK"));

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
