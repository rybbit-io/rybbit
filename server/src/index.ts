import cluster from "node:cluster";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { toNodeHandler } from "better-auth/node";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  adminMoveSite,
  collectTelemetry,
  getAdminOrganizations,
  getAdminServiceEventCount,
  getAdminSites,
  getClickhouseStats,
  getClickhouseQueryLog,
} from "./api/admin/index.js";
import {
  createDashboard,
  createFunnel,
  createGoal,
  deleteDashboard,
  deleteFunnel,
  deleteGoal,
  deleteUser,
  generatePdfReport,
  getDashboard,
  getDashboards,
  getBotDimension,
  getBotOverview,
  getBotTimeSeries,
  getErrorBucketed,
  getErrorEvents,
  getErrorNames,
  generateCustomQuery,
  getEventBucketed,
  getEventNames,
  getAutocaptureEvents,
  getAutocaptureValues,
  getEventProperties,
  getEvents,
  getFunnel,
  getFunnelStepSessions,
  getFunnels,
  getGoalSessions,
  getGoalTimeSeries,
  getGoals,
  getJourneys,
  getLiveUsercount,
  getMetric,
  getMetricLite,
  getOrgEventCount,
  getOutboundLinks,
  getOverview,
  getOverviewBucketed,
  getOverviewBucketedLite,
  getOverviewLite,
  getPageTitles,
  getPerformanceByDimension,
  getPerformanceOverview,
  getPerformanceTimeSeries,
  getRetention,
  getSession,
  getSessionLocations,
  getSessions,
  getSiteEventCount,
  getUserInfo,
  getUserSessionCount,
  getUserTraitKeys,
  getUserTraitValueUsers,
  getUserTraitValues,
  getUsers,
  identifyUser,
  runCustomQuery,
  runDashboardCardQuery,
  updateDashboard,
  updateGoal,
  updateUserTraits,
} from "./api/analytics/index.js";
import { getConfig, getVersion } from "./api/getConfig.js";
import {
  createExperiment,
  deleteExperiment,
  getExperimentResults,
  getExperiments,
  updateExperiment,
} from "./api/experiments/index.js";
import {
  createFeatureFlag,
  deleteFeatureFlag,
  evaluateFeatureFlags,
  evaluateServerFeatureFlags,
  getFeatureFlags,
  updateFeatureFlag,
} from "./api/featureFlags/index.js";
import {
  connectGSC,
  disconnectGSC,
  getGSCData,
  getGSCStatus,
  gscCallback,
  selectGSCProperty,
} from "./api/gsc/index.js";
import { updateMemberSiteAccess } from "./api/memberAccess/index.js";
import { listTeams, createTeam, updateTeam, deleteTeam } from "./api/teams/index.js";
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
  getEmbedStats,
  getSite,
  getSiteExcludedCountries,
  getSiteExcludedHostnames,
  getSiteExcludedIPs,
  getSiteExcludedPaths,
  getSiteExcludedUserAgents,
  getSiteHasData,
  getSiteImports,
  getSiteIsPublic,
  getSiteUsage,
  getSitePrivateLinkConfig,
  getSitesFromOrg,
  getTrackingConfig,
  moveSite,
  updateSiteConfig,
  updateSitePrivateLinkConfig,
} from "./api/sites/index.js";
import {
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  getSubscription,
  handleWebhook,
  previewSubscriptionUpdate,
  submitCancellationFeedback,
  updateSubscription,
} from "./api/stripe/index.js";
import {
  addUserToOrganization,
  createUserApiKey,
  createUserInOrganization,
  getMyOrganizations,
  getUserOrganizations,
  listOrganizationMembers,
  oneClickUnsubscribeMarketing,
  unsubscribeMarketing,
  updateAccountSettings,
} from "./api/user/index.js";
import { validateHttpTimeParams } from "./api/analytics/utils/query-validation.js";
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
import type { ScopeAction, ScopeResource } from "./lib/scopes.js";
import { auth } from "./lib/auth.js";
import { mcpRoutes } from "./mcp/index.js";
import { oauthWellKnownRoutes } from "./mcp/wellKnown.js";
import { createCorsOptionsDelegate, createRejectUntrustedOriginHook } from "./lib/cors.js";
import { IS_CLOUD } from "./lib/const.js";
import { reengagementService } from "./services/reengagement/reengagementService.js";
import { telemetryService } from "./services/telemetryService.js";
import { handleIdentify } from "./services/tracker/identifyService.js";
import { trackEvent } from "./services/tracker/trackEvent.js";
import { usageService } from "./services/usageService.js";
import { weeklyReportService } from "./services/weekyReports/weeklyReportService.js";
import { handleAppSumoWebhook, activateAppSumoLicense } from "./api/as/index.js";

// Reject requests whose shared time query params are present but invalid.
// Historically they were silently dropped, so endpoints ran over all time and
// returned wrong data with a 200. Absent params (all-time mode) stay valid.
const validateTimeParams = async (request: FastifyRequest, reply: FastifyReply) => {
  const error = validateHttpTimeParams(request.query);
  if (error) {
    return reply.status(400).send({ error });
  }
};

// Pre-composed middleware chains for common auth patterns
// Cast as any to work around Fastify's type inference limitations with preHandler
//
// Each scoped chain names the resource:action a BEARER credential (API key or
// OAuth token) must be granted; unrestricted legacy credentials and cookie
// sessions always pass. See lib/scopes.ts for the taxonomy.
const publicSiteScoped = (resource: ScopeResource, action: ScopeAction) => ({
  preHandler: [resolveSiteId, allowPublicSiteAccess({ resource, action }), validateTimeParams] as any,
});
const authSiteScoped = (resource: ScopeResource, action: ScopeAction) => ({
  preHandler: [resolveSiteId, requireSiteAccess({ resource, action }), validateTimeParams] as any,
});
const adminSiteScoped = (resource: ScopeResource, action: ScopeAction) => ({
  preHandler: [resolveSiteId, requireSiteAdminAccess({ resource, action })] as any,
});
const orgMemberScoped = (resource: ScopeResource, action: ScopeAction) => ({
  preHandler: [requireOrgMember({ resource, action })] as any,
});
const orgAdminScoped = (resource: ScopeResource, action: ScopeAction) => ({
  preHandler: [requireOrgAdminFromParams({ resource, action })] as any,
});
const authOnlyScoped = (resource: ScopeResource, action: ScopeAction) => ({
  preHandler: [requireAuth({ resource, action })] as any,
});

// Reused scoped chains
const publicAnalyticsRead = publicSiteScoped("analytics", "read");
const publicSessionsRead = publicSiteScoped("sessions", "read");
const publicEventsRead = publicSiteScoped("events", "read");
const publicUsersRead = publicSiteScoped("users", "read");
const publicFunnelsRead = publicSiteScoped("funnels", "read");
const publicGoalsRead = publicSiteScoped("goals", "read");
const publicSitesRead = publicSiteScoped("sites", "read");
const publicReplayRead = publicSiteScoped("replay", "read");
const publicGscRead = publicSiteScoped("gsc", "read");
const authUsersWrite = authSiteScoped("users", "write");
const authGoalsWrite = authSiteScoped("goals", "write");
const authFunnelsWrite = authSiteScoped("funnels", "write");
const authAnalyticsRead = authSiteScoped("analytics", "read");
const authReplayWrite = authSiteScoped("replay", "write");
const authOrgRead = authOnlyScoped("org", "read");
const adminSitesRead = adminSiteScoped("sites", "read");
const authDashboardsRead = authSiteScoped("dashboards", "read");
const authDashboardsWrite = authSiteScoped("dashboards", "write");
const authFlagsRead = authSiteScoped("flags", "read");
const authExperimentsRead = authSiteScoped("experiments", "read");
const authSitesRead = authSiteScoped("sites", "read");
const adminUsersWrite = adminSiteScoped("users", "write");
const adminFlagsWrite = adminSiteScoped("flags", "write");
const adminExperimentsWrite = adminSiteScoped("experiments", "write");
const adminSitesWrite = adminSiteScoped("sites", "write");
const adminGscWrite = adminSiteScoped("gsc", "write");
const orgAnalyticsRead = orgMemberScoped("analytics", "read");
const orgSqlRead = orgMemberScoped("sql", "read");
const orgOrgRead = orgMemberScoped("org", "read");
const orgAdminSitesWrite = orgAdminScoped("sites", "write");
const orgAdminOrgWrite = orgAdminScoped("org", "write");
const authOrgWrite = authOnlyScoped("org", "write");

// Scope-exempt / non-bearer chains. "deny-scoped" rejects scoped credentials
// on surfaces with no taxonomy resource (account settings, billing).
const adminOnly = { preHandler: [requireAdmin] as any };
const authOnlyNoScopedKeys = { preHandler: [requireAuth("deny-scoped")] as any };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = Fastify({
  disableRequestLogging: true,
  logger: {
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
  delegator: createCorsOptionsDelegate(),
});
server.addHook("onRequest", createRejectUntrustedOriginHook());

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

// Domain-specific route plugins
async function analyticsRoutes(fastify: FastifyInstance) {
  // WEB & PRODUCT ANALYTICS

  // This endpoint gets called a lot so we don't want to log it
  fastify.get("/sites/:siteId/live-user-count", { logLevel: "silent", ...publicAnalyticsRead }, getLiveUsercount);
  fastify.get("/sites/:siteId/overview", publicAnalyticsRead, getOverview);
  fastify.get("/sites/:siteId/overview/time-series", publicAnalyticsRead, getOverviewBucketed);
  fastify.get("/sites/:siteId/overview-lite", publicAnalyticsRead, getOverviewLite);
  fastify.get("/sites/:siteId/overview-bucketed-lite", publicAnalyticsRead, getOverviewBucketedLite);
  fastify.get("/sites/:siteId/metric-lite", publicAnalyticsRead, getMetricLite);
  fastify.get("/sites/:siteId/metric", publicAnalyticsRead, getMetric);
  fastify.get("/sites/:siteId/page-titles", publicAnalyticsRead, getPageTitles);
  fastify.get("/sites/:siteId/errors/names", publicAnalyticsRead, getErrorNames);
  fastify.get("/sites/:siteId/errors/events", publicAnalyticsRead, getErrorEvents);
  fastify.get("/sites/:siteId/errors/time-series", publicAnalyticsRead, getErrorBucketed);
  fastify.get("/sites/:siteId/retention", publicAnalyticsRead, getRetention);
  fastify.get("/sites/:siteId/has-data", publicSitesRead, getSiteHasData);
  fastify.get("/sites/:siteId/is-public", publicSitesRead, getSiteIsPublic);
  fastify.get("/sites/:siteId/sessions", publicSessionsRead, getSessions);
  fastify.get("/sites/:siteId/sessions/:sessionId", publicSessionsRead, getSession);
  fastify.get("/sites/:siteId/events", publicEventsRead, getEvents);
  fastify.get("/sites/:siteId/events/time-series", publicEventsRead, getEventBucketed);
  fastify.get("/sites/:siteId/events/count", publicEventsRead, getSiteEventCount);
  fastify.get("/sites/:siteId/users", publicUsersRead, getUsers);

  fastify.get("/sites/:siteId/users/session-count", publicUsersRead, getUserSessionCount);
  fastify.get("/sites/:siteId/users/:userId", publicUsersRead, getUserInfo);
  fastify.post("/sites/:siteId/users/identify", authUsersWrite, identifyUser);
  fastify.put("/sites/:siteId/users/:userId/traits", authUsersWrite, updateUserTraits);
  fastify.delete("/sites/:siteId/users/:userId", adminUsersWrite, deleteUser);
  fastify.get("/sites/:siteId/user-traits/keys", publicUsersRead, getUserTraitKeys);
  fastify.get("/sites/:siteId/user-traits/values", publicUsersRead, getUserTraitValues);
  fastify.get("/sites/:siteId/user-traits/users", publicUsersRead, getUserTraitValueUsers);
  fastify.get("/sites/:siteId/sessions/locations", publicSessionsRead, getSessionLocations);
  fastify.get("/sites/:siteId/funnels", publicFunnelsRead, getFunnels);
  fastify.get("/sites/:siteId/journeys", publicAnalyticsRead, getJourneys);
  fastify.post("/sites/:siteId/funnels/analyze", publicFunnelsRead, getFunnel);
  fastify.post("/sites/:siteId/funnels/:stepNumber/sessions", publicFunnelsRead, getFunnelStepSessions);
  fastify.post("/sites/:siteId/funnels", authFunnelsWrite, createFunnel);
  fastify.delete("/sites/:siteId/funnels/:funnelId", authFunnelsWrite, deleteFunnel);
  fastify.get("/sites/:siteId/goals", publicGoalsRead, getGoals);
  fastify.get("/sites/:siteId/goals/time-series", publicGoalsRead, getGoalTimeSeries);
  fastify.get("/sites/:siteId/goals/:goalId/sessions", publicGoalsRead, getGoalSessions);
  fastify.post("/sites/:siteId/goals", authGoalsWrite, createGoal);
  fastify.delete("/sites/:siteId/goals/:goalId", authGoalsWrite, deleteGoal);
  fastify.put("/sites/:siteId/goals/:goalId", authGoalsWrite, updateGoal);
  fastify.get("/sites/:siteId/dashboards", authDashboardsRead, getDashboards);
  fastify.get("/sites/:siteId/dashboards/:dashboardId", authDashboardsRead, getDashboard);
  fastify.post("/sites/:siteId/dashboards", authDashboardsWrite, createDashboard);
  fastify.put("/sites/:siteId/dashboards/:dashboardId", authDashboardsWrite, updateDashboard);
  fastify.delete("/sites/:siteId/dashboards/:dashboardId", authDashboardsWrite, deleteDashboard);
  fastify.post("/sites/:siteId/dashboards/run-card", authDashboardsRead, runDashboardCardQuery);
  fastify.get("/sites/:siteId/feature-flags", authFlagsRead, getFeatureFlags);
  fastify.post("/sites/:siteId/feature-flags", adminFlagsWrite, createFeatureFlag);
  fastify.put("/sites/:siteId/feature-flags/:flagId", adminFlagsWrite, updateFeatureFlag);
  fastify.delete("/sites/:siteId/feature-flags/:flagId", adminFlagsWrite, deleteFeatureFlag);
  fastify.post("/sites/:siteId/feature-flags/evaluate", authFlagsRead, evaluateServerFeatureFlags);
  fastify.post("/site/:siteId/feature-flags/evaluate", evaluateFeatureFlags);
  fastify.get("/sites/:siteId/experiments", authExperimentsRead, getExperiments);
  fastify.post("/sites/:siteId/experiments", adminExperimentsWrite, createExperiment);
  fastify.put("/sites/:siteId/experiments/:experimentId", adminExperimentsWrite, updateExperiment);
  fastify.delete("/sites/:siteId/experiments/:experimentId", adminExperimentsWrite, deleteExperiment);
  fastify.get("/sites/:siteId/experiments/:experimentId/results", authExperimentsRead, getExperimentResults);
  fastify.get("/sites/:siteId/events/names", publicEventsRead, getEventNames);
  fastify.get("/sites/:siteId/events/properties", publicEventsRead, getEventProperties);
  fastify.get("/sites/:siteId/events/autocapture", publicEventsRead, getAutocaptureEvents);
  fastify.get("/sites/:siteId/events/autocapture-values", publicEventsRead, getAutocaptureValues);
  fastify.get("/sites/:siteId/events/outbound", publicEventsRead, getOutboundLinks);
  fastify.get("/org-event-count/:organizationId", orgAnalyticsRead, getOrgEventCount);
  fastify.post("/organizations/:organizationId/analytics/query", orgSqlRead, runCustomQuery);
  fastify.post("/organizations/:organizationId/analytics/query/generate", orgSqlRead, generateCustomQuery);
  fastify.get("/sites/:siteId/performance/overview", publicAnalyticsRead, getPerformanceOverview);
  fastify.get("/sites/:siteId/performance/time-series", publicAnalyticsRead, getPerformanceTimeSeries);
  fastify.get("/sites/:siteId/performance/by-dimension", publicAnalyticsRead, getPerformanceByDimension);
  fastify.get("/sites/:siteId/bots/overview", publicAnalyticsRead, getBotOverview);
  fastify.get("/sites/:siteId/bots/time-series", publicAnalyticsRead, getBotTimeSeries);
  fastify.get("/sites/:siteId/bots/by-dimension", publicAnalyticsRead, getBotDimension);
  fastify.get("/sites/:siteId/export/pdf", authAnalyticsRead, generatePdfReport);
}

async function sessionReplayRoutes(fastify: FastifyInstance) {
  // Session Replay
  fastify.post("/session-replay/record/:siteId", recordSessionReplay); // Public - tracking endpoint
  fastify.get("/sites/:siteId/session-replay/list", publicReplayRead, getSessionReplays);
  fastify.get("/sites/:siteId/session-replay/:sessionId", publicReplayRead, getSessionReplayEvents);
  fastify.delete("/sites/:siteId/session-replay/:sessionId", authReplayWrite, deleteSessionReplay);
}

async function sitesRoutes(fastify: FastifyInstance) {
  // Sites
  fastify.get("/sites/:siteId", publicSitesRead, getSite);
  fastify.put("/sites/:siteId/config", adminSitesWrite, updateSiteConfig);
  fastify.put("/sites/:siteId/move", adminSitesWrite, moveSite);
  fastify.delete("/sites/:siteId", adminSitesWrite, deleteSite);
  fastify.get("/sites/:siteId/private-link-config", adminSitesWrite, getSitePrivateLinkConfig);
  fastify.post("/sites/:siteId/private-link-config", adminSitesWrite, updateSitePrivateLinkConfig);
  fastify.get("/site/tracking-config/:siteId", getTrackingConfig); // Public - used by tracking script
  fastify.get("/sites/:siteId/embed-stats", { preHandler: [resolveSiteId] as any }, getEmbedStats); // Public - widget endpoint (handler checks site is public)
  fastify.get("/sites/:siteId/excluded-ips", authSitesRead, getSiteExcludedIPs);
  fastify.get("/sites/:siteId/excluded-countries", authSitesRead, getSiteExcludedCountries);
  fastify.get("/sites/:siteId/excluded-paths", authSitesRead, getSiteExcludedPaths);
  fastify.get("/sites/:siteId/excluded-hostnames", authSitesRead, getSiteExcludedHostnames);
  fastify.get("/sites/:siteId/excluded-user-agents", authSitesRead, getSiteExcludedUserAgents);

  // Site Usage
  fastify.get("/sites/:siteId/usage", authSitesRead, getSiteUsage);

  // Site Imports
  fastify.get("/sites/:siteId/imports", adminSitesRead, getSiteImports);
  fastify.post("/sites/:siteId/imports", adminSitesWrite, createSiteImport);
  fastify.post(
    "/sites/:siteId/imports/:importId/events",
    { ...adminSitesWrite, bodyLimit: 50 * 1024 * 1024 },
    batchImportEvents
  );
  fastify.delete("/sites/:siteId/imports/:importId", adminSitesWrite, deleteSiteImport);
}

async function organizationsRoutes(fastify: FastifyInstance) {
  // Organizations
  fastify.get("/organizations", getMyOrganizations);
  fastify.get("/organizations/:organizationId/sites", orgOrgRead, getSitesFromOrg);
  fastify.post("/organizations/:organizationId/sites", orgAdminSitesWrite, addSite);
  fastify.get("/organizations/:organizationId/members", orgOrgRead, listOrganizationMembers);
  fastify.post("/organizations/:organizationId/members", authOrgWrite, addUserToOrganization);
  fastify.post("/organizations/:organizationId/users", authOrgWrite, createUserInOrganization);

  // Member site access management (admin/owner only)
  fastify.put("/organizations/:organizationId/members/:memberId/sites", orgAdminOrgWrite, updateMemberSiteAccess);
}

async function teamsRoutes(fastify: FastifyInstance) {
  // Teams
  fastify.get("/organizations/:organizationId/teams", orgOrgRead, listTeams);
  fastify.post("/organizations/:organizationId/teams", orgAdminOrgWrite, createTeam);
  fastify.put("/organizations/:organizationId/teams/:teamId", orgAdminOrgWrite, updateTeam);
  fastify.delete("/organizations/:organizationId/teams/:teamId", orgAdminOrgWrite, deleteTeam);
}

async function userRoutes(fastify: FastifyInstance) {
  // User
  fastify.get("/config", getConfig); // Public - returns app config
  fastify.get("/version", getVersion); // Public - returns app version
  fastify.get("/user/organizations", authOrgRead, getUserOrganizations);
  fastify.post("/user/account-settings", authOnlyNoScopedKeys, updateAccountSettings);
  fastify.post("/user/unsubscribe-marketing", authOnlyNoScopedKeys, unsubscribeMarketing);
  fastify.get("/user/unsubscribe-marketing-oneclick", oneClickUnsubscribeMarketing); // Public - for link clicks
  fastify.post("/user/unsubscribe-marketing-oneclick", oneClickUnsubscribeMarketing); // Public - for List-Unsubscribe header
  fastify.post("/user/api-keys", authOnlyNoScopedKeys, createUserApiKey);
}

async function gscRoutes(fastify: FastifyInstance) {
  // GOOGLE SEARCH CONSOLE
  fastify.get("/sites/:siteId/gsc/connect", adminGscWrite, connectGSC);
  fastify.get("/gsc/callback", gscCallback); // Public - OAuth callback
  fastify.get("/sites/:siteId/gsc/status", publicGscRead, getGSCStatus);
  fastify.delete("/sites/:siteId/gsc/disconnect", adminGscWrite, disconnectGSC);
  fastify.post("/sites/:siteId/gsc/select-property", adminGscWrite, selectGSCProperty);
  fastify.get("/sites/:siteId/gsc/data", publicGscRead, getGSCData);
}

async function stripeAdminRoutes(fastify: FastifyInstance) {
  // ClickHouse stats (available for all admins)
  fastify.get("/admin/clickhouse-stats", adminOnly, getClickhouseStats);
  fastify.get("/admin/clickhouse-query-log", adminOnly, getClickhouseQueryLog);
  fastify.get("/admin/sites", adminOnly, getAdminSites);
  fastify.put("/admin/sites/:siteId/move", adminOnly, adminMoveSite);
  fastify.get("/admin/organizations", adminOnly, getAdminOrganizations);
  fastify.get("/admin/service-event-count", adminOnly, getAdminServiceEventCount);
  fastify.post("/admin/telemetry", collectTelemetry); // Public - telemetry collection

  // STRIPE & ADMIN
  if (IS_CLOUD) {
    // Stripe Routes
    fastify.post("/stripe/create-checkout-session", authOnlyNoScopedKeys, createCheckoutSession);
    fastify.post("/stripe/create-portal-session", authOnlyNoScopedKeys, createPortalSession);
    fastify.post("/stripe/preview-subscription-update", authOnlyNoScopedKeys, previewSubscriptionUpdate);
    fastify.post("/stripe/update-subscription", authOnlyNoScopedKeys, updateSubscription);
    fastify.get("/stripe/subscription", authOnlyNoScopedKeys, getSubscription);
    fastify.get("/stripe/invoices", authOnlyNoScopedKeys, getInvoices);
    fastify.post("/stripe/cancellation-feedback", authOnlyNoScopedKeys, submitCancellationFeedback);
    fastify.post("/stripe/webhook", { config: { rawBody: true } }, handleWebhook); // Public - Stripe webhook

    // AppSumo Routes
    fastify.post("/as/activate", authOnlyNoScopedKeys, activateAppSumoLicense);
    fastify.post("/as/webhook", handleAppSumoWebhook); // Public - AppSumo webhook
  }
}

// Main API routes plugin - registers all domain plugins
async function apiRoutes(fastify: FastifyInstance) {
  await fastify.register(analyticsRoutes);
  await fastify.register(sessionReplayRoutes);
  await fastify.register(sitesRoutes);
  await fastify.register(organizationsRoutes);
  await fastify.register(teamsRoutes);
  await fastify.register(userRoutes);
  await fastify.register(gscRoutes);
  await fastify.register(stripeAdminRoutes);
  await fastify.register(mcpRoutes);

  // Health check
  fastify.get("/health", { logLevel: "silent" }, (_: FastifyRequest, reply: FastifyReply) => reply.send("OK"));
}

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

    // Cron jobs should only run on the primary process (or in single-process mode)
    if (!cluster.isWorker) {
      telemetryService.startTelemetryCron();
      usageService.startUsageCheckCron();
      if (IS_CLOUD && process.env.NODE_ENV !== "development") {
        weeklyReportService.startWeeklyReportCron();
        reengagementService.startReengagementCron();
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
        } else if (message?.type === "sites-without-replay") {
          usageService.setSitesWithoutReplay(new Set(message.siteIds));
          server.log.debug(`Received ${message.siteIds.length} sites-without-replay from primary`);
        }
      });
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
