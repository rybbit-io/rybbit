import { createHash } from "node:crypto";
import type { Permission } from "@rybbit/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  adminMoveSite,
  collectTelemetry,
  deleteAdminOrganizationMember,
  getAdminOrganizationMember,
  getAdminOrganizationOptions,
  getAdminOrganizations,
  getAdminSubscriptionPlans,
  getAdminServiceEventCount,
  getAdminSites,
  getClickhouseStats,
  getClickhouseQueryLog,
  updateAdminOrganizationMember,
  updateAdminSubscriptionOverride,
} from "./admin/index.js";
import {
  createAnnotation,
  createDashboard,
  createSegment,
  createFunnel,
  createGoal,
  deleteAnnotation,
  deleteDashboard,
  deleteSegment,
  deleteFunnel,
  deleteGoal,
  deleteUser,
  generatePdfReport,
  getAnnotations,
  getDashboard,
  getDashboards,
  getSegment,
  getSegments,
  getBotAiSummary,
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
  getSiteCardsLite,
  getSiteCards,
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
  updateAnnotation,
  updateDashboard,
  updateSegment,
  expandSegmentParam,
  updateGoal,
  updateUserTraits,
} from "./analytics/index.js";
import { getConfig, getVersion } from "./getConfig.js";
import {
  createExperiment,
  deleteExperiment,
  getExperimentResults,
  getExperimentTimeseries,
  getExperiments,
  updateExperiment,
} from "./experiments/index.js";
import {
  createFeatureFlag,
  deleteFeatureFlag,
  evaluateFeatureFlags,
  evaluateServerFeatureFlags,
  getFeatureFlags,
  updateFeatureFlag,
} from "./featureFlags/index.js";
import { connectGSC, disconnectGSC, getGSCData, getGSCStatus, gscCallback, selectGSCProperty } from "./gsc/index.js";
import { updateMemberSiteAccess } from "./memberAccess/index.js";
import { listTeams, createTeam, updateTeam, deleteTeam } from "./teams/index.js";
import {
  deleteSessionReplay,
  getSessionReplayEvents,
  getSessionReplays,
  recordSessionReplay,
} from "./sessionReplay/index.js";
import {
  addSite,
  batchImportEvents,
  claimSite,
  createUnclaimedSite,
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
  getSiteExcludedASNs,
  getSiteExcludedQueryParams,
  getSiteHasData,
  checkInstall,
  getSiteImports,
  getSiteIsPublic,
  getSiteUsage,
  getSitePrivateLinkConfig,
  getSitesFromOrg,
  getTrackingConfig,
  moveSite,
  updateSiteConfig,
  updateSitePrivateLinkConfig,
} from "./sites/index.js";
import {
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  getSubscription,
  handleWebhook,
  previewSubscriptionUpdate,
  submitCancellationFeedback,
  updateSubscription,
} from "./stripe/index.js";
import {
  addUserToOrganization,
  createOrgApiKey,
  createUserApiKey,
  createUserInOrganization,
  getMyOrganizations,
  getOrgApiUsage,
  getUserOrganizations,
  listOrganizationMembers,
  oneClickUnsubscribeMarketing,
  unsubscribeMarketing,
  updateAccountSettings,
} from "./user/index.js";
import { createDashboardCache } from "./analytics/utils/dashboardCache.js";
import { validateHttpTimeParams } from "./analytics/utils/query-validation.js";
import { handleAppSumoWebhook, activateAppSumoLicense } from "./as/index.js";
import { unclaimedSiteRouteOptions } from "./sites/createUnclaimedSite.js";
import {
  acceptSiteTransfer,
  cancelSiteTransfer,
  createSiteTransfer,
  declineSiteTransfer,
  getIncomingSiteTransfer,
  getSiteTransfer,
} from "./sites/siteTransfers.js";
import { dashboardCacheRedis } from "../db/redis/redis.js";
import {
  assertRouteAccessDeclared,
  requireAdmin,
  requireAuth,
  requireOrgPermission,
  requireSitePermission,
  resolveSiteId,
  type RouteAccess,
  type RouteScope,
} from "../lib/auth-middleware.js";
import { IS_CLOUD } from "../lib/const.js";
import { mcpRoutes } from "../mcp/index.js";

// Reject requests whose shared time query params are present but invalid.
// Historically they were silently dropped, so endpoints ran over all time and
// returned wrong data with a 200. Absent params (all-time mode) stay valid.
const validateTimeParams = async (request: FastifyRequest, reply: FastifyReply) => {
  const error = validateHttpTimeParams(request.query);
  if (error) {
    return reply.status(400).send({ error });
  }
};

// Route access. Every /api route declares who may call it (config.access) and
// the onRoute check below refuses to boot a route that doesn't, so a new
// endpoint cannot ship without an explicit decision.
//
// Site and organization routes name a Permission (@rybbit/shared
// permissions.ts): the caller's role on that site or organization must hold it,
// and a bearer credential (API key, OAuth token) must also carry the
// permission's scope. Cookie sessions are never scope-limited.
//
// Cast as any to work around Fastify's type inference limitations with preHandler
//
// validateTimeParams is on every chain rather than only the ones that currently
// host a time-taking route: absent params always pass, and the two chains that
// went without it were how /org-event-count and /admin/service-event-count came
// to answer a malformed date with all-time data and a 200.
// expandSegmentParam turns a `segment_id` query param into `filters` after the
// access guard has run, so every analytics endpoint accepts a saved segment
// with no per-endpoint change. It is a no-op when the param is absent.
const site = (permission: Permission, options: { allowPublic?: boolean; validateTime?: boolean } = {}) => ({
  preHandler: [
    resolveSiteId,
    requireSitePermission(permission, { allowPublic: options.allowPublic }),
    ...(options.validateTime === false ? [] : [validateTimeParams]),
    expandSegmentParam,
  ] as any,
  config: { access: { level: "site", permission, allowPublic: !!options.allowPublic } as RouteAccess },
});
const publicSite = (permission: Permission) => site(permission, { allowPublic: true });
const org = (permission: Permission) => ({
  preHandler: [requireOrgPermission(permission), validateTimeParams] as any,
  config: { access: { level: "org", permission } as RouteAccess },
});
// User-level surfaces with no site or organization in the path.
const authenticated = (scope: RouteScope) => ({
  preHandler: [requireAuth(scope), validateTimeParams] as any,
  config: { access: "authenticated" as RouteAccess },
});
const systemAdmin = {
  preHandler: [requireAdmin, validateTimeParams] as any,
  config: { access: "system-admin" as RouteAccess },
};
// No guard: tracking, webhooks, signed links, and handlers that authenticate
// the caller themselves.
const publicRoute = { config: { access: "public" as RouteAccess } };

const dashboardCacheSeconds = Number(process.env.DASHBOARD_CACHE_TTL_SECONDS ?? 30);
const cacheDashboard = createDashboardCache({
  redis: dashboardCacheRedis,
  namespace: createHash("sha256")
    .update(JSON.stringify([process.env.CLICKHOUSE_HOST, process.env.CLICKHOUSE_DB]))
    .digest("hex"),
  ttlMs: (Number.isFinite(dashboardCacheSeconds) ? Math.max(0, Math.min(30, dashboardCacheSeconds)) : 30) * 1000,
});

// Reused chains
const publicAnalyticsRead = publicSite("analytics:read");
const cachedAnalyticsRead = cacheDashboard(publicAnalyticsRead);
const publicSessionsRead = publicSite("sessions:read");
const publicEventsRead = publicSite("events:read");
const cachedEventsRead = cacheDashboard(publicEventsRead);
const publicUsersRead = publicSite("users:read");
const publicFunnelsRead = publicSite("funnels:read");
const publicGoalsRead = publicSite("goals:read");
const publicSitesRead = publicSite("sites:read");
const publicReplayRead = publicSite("replay:read");
const publicGscRead = publicSite("gsc:read");
// Annotations validate their own optional start/end bounds (either may stand
// alone), so the shared time validator is left off this chain.
const publicAnnotationsRead = site("annotations:read", { allowPublic: true, validateTime: false });
const publicSegmentsRead = publicSite("segments:read");

// User-authored SQL fans out real ClickHouse work per call (a dashboard runs
// one query per card), and /generate spends OpenRouter credit. Cap per user.
const customQueryRateLimit = { max: 60, timeWindow: "1 minute" };
const generateQueryRateLimit = { max: 20, timeWindow: "1 minute" };
const withRateLimit = <T extends { preHandler: unknown; config?: object }>(
  opts: T,
  limit: { max: number; timeWindow: string }
) => ({
  ...opts,
  config: { ...opts.config, rateLimit: limit },
});

// Domain-specific route plugins
async function analyticsRoutes(fastify: FastifyInstance) {
  // WEB & PRODUCT ANALYTICS

  // This endpoint gets called a lot so we don't want to log it
  fastify.get("/sites/:siteId/live-user-count", { logLevel: "silent", ...publicAnalyticsRead }, getLiveUsercount);
  fastify.get("/sites/:siteId/overview", cachedAnalyticsRead, getOverview);
  fastify.get("/sites/:siteId/overview/time-series", cachedAnalyticsRead, getOverviewBucketed);
  fastify.get("/sites/:siteId/overview-lite", cachedAnalyticsRead, getOverviewLite);
  fastify.get("/sites/:siteId/overview-bucketed-lite", cachedAnalyticsRead, getOverviewBucketedLite);
  fastify.get("/sites/:siteId/metric-lite", cachedAnalyticsRead, getMetricLite);
  fastify.get("/sites/:siteId/metric", cachedAnalyticsRead, getMetric);
  fastify.get("/sites/:siteId/page-titles", cachedAnalyticsRead, getPageTitles);
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
  fastify.post("/sites/:siteId/users/identify", site("users:write"), identifyUser);
  fastify.put("/sites/:siteId/users/:userId/traits", site("users:write"), updateUserTraits);
  fastify.delete("/sites/:siteId/users/:userId", site("users:delete"), deleteUser);
  fastify.get("/sites/:siteId/user-traits/keys", publicUsersRead, getUserTraitKeys);
  fastify.get("/sites/:siteId/user-traits/values", publicUsersRead, getUserTraitValues);
  fastify.get("/sites/:siteId/user-traits/users", publicUsersRead, getUserTraitValueUsers);
  fastify.get("/sites/:siteId/sessions/locations", publicSessionsRead, getSessionLocations);
  fastify.get("/sites/:siteId/funnels", publicFunnelsRead, getFunnels);
  fastify.get("/sites/:siteId/journeys", publicAnalyticsRead, getJourneys);
  fastify.post("/sites/:siteId/funnels/analyze", publicFunnelsRead, getFunnel);
  fastify.post("/sites/:siteId/funnels/:stepNumber/sessions", publicFunnelsRead, getFunnelStepSessions);
  fastify.post("/sites/:siteId/funnels", site("funnels:write"), createFunnel);
  fastify.delete("/sites/:siteId/funnels/:funnelId", site("funnels:write"), deleteFunnel);
  fastify.get("/sites/:siteId/goals", publicGoalsRead, getGoals);
  fastify.get("/sites/:siteId/goals/time-series", publicGoalsRead, getGoalTimeSeries);
  fastify.get("/sites/:siteId/goals/:goalId/sessions", publicGoalsRead, getGoalSessions);
  fastify.post("/sites/:siteId/goals", site("goals:write"), createGoal);
  fastify.delete("/sites/:siteId/goals/:goalId", site("goals:write"), deleteGoal);
  fastify.put("/sites/:siteId/goals/:goalId", site("goals:write"), updateGoal);
  // Timeline annotations. Read is public-guarded so public dashboards and
  // private links get the annotations marked public; writes need site access.
  fastify.get("/sites/:siteId/annotations", publicAnnotationsRead, getAnnotations);
  fastify.post("/sites/:siteId/annotations", site("annotations:write"), createAnnotation);
  fastify.put("/sites/:siteId/annotations/:annotationId", site("annotations:write"), updateAnnotation);
  fastify.delete("/sites/:siteId/annotations/:annotationId", site("annotations:write"), deleteAnnotation);
  fastify.get("/sites/:siteId/dashboards", site("dashboards:read"), getDashboards);
  fastify.get("/sites/:siteId/dashboards/:dashboardId", site("dashboards:read"), getDashboard);
  fastify.post("/sites/:siteId/dashboards", site("dashboards:write"), createDashboard);
  fastify.put("/sites/:siteId/dashboards/:dashboardId", site("dashboards:write"), updateDashboard);
  fastify.delete("/sites/:siteId/dashboards/:dashboardId", site("dashboards:write"), deleteDashboard);

  // Saved segments. Reads allow public/private-link viewers (they only see
  // public segments); writes need site access and are further gated per row.
  fastify.get("/sites/:siteId/segments", publicSegmentsRead, getSegments);
  fastify.get("/sites/:siteId/segments/:segmentId", publicSegmentsRead, getSegment);
  fastify.post("/sites/:siteId/segments", site("segments:write"), createSegment);
  fastify.put("/sites/:siteId/segments/:segmentId", site("segments:write"), updateSegment);
  fastify.delete("/sites/:siteId/segments/:segmentId", site("segments:write"), deleteSegment);
  fastify.post(
    "/sites/:siteId/dashboards/run-card",
    withRateLimit(site("dashboards:read"), customQueryRateLimit),
    runDashboardCardQuery
  );
  fastify.get("/sites/:siteId/feature-flags", site("flags:read"), getFeatureFlags);
  fastify.post("/sites/:siteId/feature-flags", site("flags:write"), createFeatureFlag);
  fastify.put("/sites/:siteId/feature-flags/:flagId", site("flags:write"), updateFeatureFlag);
  fastify.delete("/sites/:siteId/feature-flags/:flagId", site("flags:write"), deleteFeatureFlag);
  fastify.post("/sites/:siteId/feature-flags/evaluate", site("flags:read"), evaluateServerFeatureFlags);
  fastify.post("/site/:siteId/feature-flags/evaluate", publicRoute, evaluateFeatureFlags);
  fastify.get("/sites/:siteId/experiments", site("experiments:read"), getExperiments);
  fastify.post("/sites/:siteId/experiments", site("experiments:write"), createExperiment);
  fastify.put("/sites/:siteId/experiments/:experimentId", site("experiments:write"), updateExperiment);
  fastify.delete("/sites/:siteId/experiments/:experimentId", site("experiments:write"), deleteExperiment);
  fastify.get("/sites/:siteId/experiments/:experimentId/results", site("experiments:read"), getExperimentResults);
  fastify.get("/sites/:siteId/experiments/:experimentId/timeseries", site("experiments:read"), getExperimentTimeseries);
  fastify.get("/sites/:siteId/events/names", cachedEventsRead, getEventNames);
  fastify.get("/sites/:siteId/events/properties", publicEventsRead, getEventProperties);
  fastify.get("/sites/:siteId/events/autocapture", cachedEventsRead, getAutocaptureEvents);
  fastify.get("/sites/:siteId/events/autocapture-values", publicEventsRead, getAutocaptureValues);
  fastify.get("/sites/:siteId/events/outbound", cachedEventsRead, getOutboundLinks);
  fastify.get("/org-event-count/:organizationId", org("analytics:read"), getOrgEventCount);
  fastify.post(
    "/organizations/:organizationId/analytics/query",
    withRateLimit(org("sql:read"), customQueryRateLimit),
    runCustomQuery
  );
  fastify.post(
    "/organizations/:organizationId/analytics/query/generate",
    withRateLimit(org("sql:read"), generateQueryRateLimit),
    generateCustomQuery
  );
  fastify.get("/sites/:siteId/performance/overview", publicAnalyticsRead, getPerformanceOverview);
  fastify.get("/sites/:siteId/performance/time-series", publicAnalyticsRead, getPerformanceTimeSeries);
  fastify.get("/sites/:siteId/performance/by-dimension", publicAnalyticsRead, getPerformanceByDimension);
  fastify.get("/sites/:siteId/bots/overview", publicAnalyticsRead, getBotOverview);
  fastify.get("/sites/:siteId/bots/time-series", publicAnalyticsRead, getBotTimeSeries);
  fastify.get("/sites/:siteId/bots/by-dimension", publicAnalyticsRead, getBotDimension);
  fastify.get("/sites/:siteId/bots/ai-summary", publicAnalyticsRead, getBotAiSummary);
  fastify.get("/sites/:siteId/export/pdf", site("analytics:read"), generatePdfReport);
}

async function sessionReplayRoutes(fastify: FastifyInstance) {
  // Session Replay
  fastify.post("/session-replay/record/:siteId", publicRoute, recordSessionReplay); // Public - tracking endpoint
  fastify.get("/sites/:siteId/session-replay/list", publicReplayRead, getSessionReplays);
  fastify.get("/sites/:siteId/session-replay/:sessionId", publicReplayRead, getSessionReplayEvents);
  fastify.delete("/sites/:siteId/session-replay/:sessionId", site("replay:delete"), deleteSessionReplay);
}

async function sitesRoutes(fastify: FastifyInstance) {
  // Sites
  fastify.get("/sites/:siteId", publicSitesRead, getSite);
  fastify.put("/sites/:siteId/config", site("sites:configure"), updateSiteConfig);
  fastify.put("/sites/:siteId/move", site("sites:transfer"), moveSite);
  fastify.delete("/sites/:siteId", site("sites:delete"), deleteSite);
  // Handing a site to someone outside the organization (see siteTransfers.ts).
  fastify.post("/sites/:siteId/transfer", site("sites:transfer"), createSiteTransfer);
  fastify.get("/sites/:siteId/transfer", site("sites:transfer"), getSiteTransfer);
  fastify.delete("/sites/:siteId/transfer", site("sites:transfer"), cancelSiteTransfer);
  // The recipient's side: the handler checks the signed-in user is the recipient.
  fastify.get("/site-transfers/:transferId", authenticated("deny-scoped"), getIncomingSiteTransfer);
  fastify.post("/site-transfers/:transferId/accept", authenticated("deny-scoped"), acceptSiteTransfer);
  fastify.post("/site-transfers/:transferId/decline", authenticated("deny-scoped"), declineSiteTransfer);
  fastify.get("/sites/:siteId/private-link-config", site("sites:configure"), getSitePrivateLinkConfig);
  fastify.post("/sites/:siteId/private-link-config", site("sites:configure"), updateSitePrivateLinkConfig);
  fastify.get("/site/tracking-config/:siteId", publicRoute, getTrackingConfig); // Public - used by tracking script
  fastify.get("/site/check-install", publicRoute, checkInstall); // Public (HMAC-signed) - linked from lifecycle emails
  fastify.get("/sites/:siteId/embed-stats", { ...publicRoute, preHandler: [resolveSiteId] as any }, getEmbedStats); // Public - widget endpoint (handler checks site is public)
  fastify.get("/sites/:siteId/excluded-ips", site("sites:read"), getSiteExcludedIPs);
  fastify.get("/sites/:siteId/excluded-countries", site("sites:read"), getSiteExcludedCountries);
  fastify.get("/sites/:siteId/excluded-paths", site("sites:read"), getSiteExcludedPaths);
  fastify.get("/sites/:siteId/excluded-hostnames", site("sites:read"), getSiteExcludedHostnames);
  fastify.get("/sites/:siteId/excluded-user-agents", site("sites:read"), getSiteExcludedUserAgents);
  fastify.get("/sites/:siteId/excluded-asns", site("sites:read"), getSiteExcludedASNs);
  fastify.get("/sites/:siteId/excluded-query-params", site("sites:read"), getSiteExcludedQueryParams);

  // Site Usage
  fastify.get("/sites/:siteId/usage", site("sites:read"), getSiteUsage);

  // Site Imports
  fastify.get("/sites/:siteId/imports", site("imports:read"), getSiteImports);
  fastify.post("/sites/:siteId/imports", site("imports:write"), createSiteImport);
  fastify.post(
    "/sites/:siteId/imports/:importId/events",
    { ...site("imports:write"), bodyLimit: 50 * 1024 * 1024 },
    batchImportEvents
  );
  fastify.delete("/sites/:siteId/imports/:importId", site("imports:write"), deleteSiteImport);
}

async function organizationsRoutes(fastify: FastifyInstance) {
  // Organizations
  fastify.get("/organizations", publicRoute, getMyOrganizations); // Resolves the caller itself
  fastify.get("/organizations/:organizationId/sites", org("org:read"), getSitesFromOrg);
  fastify.post("/organizations/:organizationId/site-cards-lite", org("analytics:read"), getSiteCardsLite);
  fastify.post("/organizations/:organizationId/site-cards", org("analytics:read"), getSiteCards);
  fastify.post("/organizations/:organizationId/sites", org("sites:create"), addSite);
  // Landing-page domain input: creates an owner-less site reachable only by
  // its private link key. Public, so cap creations per IP.
  fastify.post(
    "/sites/unclaimed",
    { ...unclaimedSiteRouteOptions, config: { ...unclaimedSiteRouteOptions.config, access: "public" as RouteAccess } },
    createUnclaimedSite
  );
  fastify.post(
    "/sites/:siteId/claim",
    { ...authenticated({ resource: "sites", action: "write" }), bodyLimit: 1024 },
    claimSite
  ); // The handler checks the caller administers the target organization
  fastify.get("/organizations/:organizationId/members", org("org:read"), listOrganizationMembers);
  fastify.post("/organizations/:organizationId/members", org("members:manage"), addUserToOrganization);
  fastify.post("/organizations/:organizationId/users", org("members:manage"), createUserInOrganization);

  // Member site access management (admin/owner only)
  fastify.put("/organizations/:organizationId/members/:memberId/sites", org("members:manage"), updateMemberSiteAccess);
}

async function teamsRoutes(fastify: FastifyInstance) {
  // Teams
  fastify.get("/organizations/:organizationId/teams", org("org:read"), listTeams);
  fastify.post("/organizations/:organizationId/teams", org("teams:manage"), createTeam);
  fastify.put("/organizations/:organizationId/teams/:teamId", org("teams:manage"), updateTeam);
  fastify.delete("/organizations/:organizationId/teams/:teamId", org("teams:manage"), deleteTeam);
}

async function userRoutes(fastify: FastifyInstance) {
  // User
  fastify.get("/config", publicRoute, getConfig); // Public - returns app config
  fastify.get("/version", publicRoute, getVersion); // Public - returns app version
  fastify.get("/user/organizations", authenticated({ resource: "org", action: "read" }), getUserOrganizations);
  fastify.post("/user/account-settings", authenticated("deny-scoped"), updateAccountSettings);
  fastify.post("/user/unsubscribe-marketing", authenticated("deny-scoped"), unsubscribeMarketing);
  fastify.get("/user/unsubscribe-marketing-oneclick", publicRoute, oneClickUnsubscribeMarketing); // Public - for link clicks
  fastify.post("/user/unsubscribe-marketing-oneclick", publicRoute, oneClickUnsubscribeMarketing); // Public - for List-Unsubscribe header
  fastify.post("/user/api-keys", authenticated("deny-scoped"), createUserApiKey);
  fastify.post("/organizations/:organizationId/api-keys", org("apikeys:manage"), createOrgApiKey);
  fastify.get("/organizations/:organizationId/api-usage", org("org:read"), getOrgApiUsage);
}

async function gscRoutes(fastify: FastifyInstance) {
  // GOOGLE SEARCH CONSOLE
  fastify.get("/sites/:siteId/gsc/connect", site("gsc:write"), connectGSC);
  fastify.get("/gsc/callback", publicRoute, gscCallback); // Public - OAuth callback
  fastify.get("/sites/:siteId/gsc/status", publicGscRead, getGSCStatus);
  fastify.delete("/sites/:siteId/gsc/disconnect", site("gsc:write"), disconnectGSC);
  fastify.post("/sites/:siteId/gsc/select-property", site("gsc:write"), selectGSCProperty);
  fastify.get("/sites/:siteId/gsc/data", publicGscRead, getGSCData);
}

async function stripeAdminRoutes(fastify: FastifyInstance) {
  // ClickHouse stats (available for all admins)
  fastify.get("/admin/clickhouse-stats", systemAdmin, getClickhouseStats);
  fastify.get("/admin/clickhouse-query-log", systemAdmin, getClickhouseQueryLog);
  fastify.get("/admin/sites", systemAdmin, getAdminSites);
  fastify.put("/admin/sites/:siteId/move", systemAdmin, adminMoveSite);
  fastify.get("/admin/organizations", systemAdmin, getAdminOrganizations);
  fastify.get("/admin/organization-options", systemAdmin, getAdminOrganizationOptions);
  fastify.get("/admin/subscription-plans", systemAdmin, getAdminSubscriptionPlans);
  fastify.put(
    "/admin/organizations/:organizationId/subscription-override",
    systemAdmin,
    updateAdminSubscriptionOverride
  );
  fastify.get("/admin/organizations/:organizationId/members/:memberId", systemAdmin, getAdminOrganizationMember);
  fastify.patch("/admin/organizations/:organizationId/members/:memberId", systemAdmin, updateAdminOrganizationMember);
  fastify.delete("/admin/organizations/:organizationId/members/:memberId", systemAdmin, deleteAdminOrganizationMember);
  fastify.get("/admin/service-event-count", systemAdmin, getAdminServiceEventCount);
  fastify.post("/admin/telemetry", publicRoute, collectTelemetry); // Public - telemetry collection

  // STRIPE & ADMIN
  if (IS_CLOUD) {
    // Stripe Routes
    fastify.post("/stripe/create-checkout-session", authenticated("deny-scoped"), createCheckoutSession);
    fastify.post("/stripe/create-portal-session", authenticated("deny-scoped"), createPortalSession);
    fastify.post("/stripe/preview-subscription-update", authenticated("deny-scoped"), previewSubscriptionUpdate);
    fastify.post("/stripe/update-subscription", authenticated("deny-scoped"), updateSubscription);
    fastify.get("/stripe/subscription", authenticated("deny-scoped"), getSubscription);
    fastify.get("/stripe/invoices", authenticated("deny-scoped"), getInvoices);
    fastify.post("/stripe/cancellation-feedback", authenticated("deny-scoped"), submitCancellationFeedback);
    fastify.post("/stripe/webhook", { config: { rawBody: true, access: "public" as RouteAccess } }, handleWebhook); // Public - Stripe webhook

    // AppSumo Routes
    fastify.post("/as/activate", authenticated("deny-scoped"), activateAppSumoLicense);
    fastify.post("/as/webhook", publicRoute, handleAppSumoWebhook); // Public - AppSumo webhook
  }
}

// Main API routes plugin - registers all domain plugins
export async function apiRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", assertRouteAccessDeclared);
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
  fastify.get("/health", { logLevel: "silent", ...publicRoute }, (_: FastifyRequest, reply: FastifyReply) =>
    reply.send("OK")
  );
}
