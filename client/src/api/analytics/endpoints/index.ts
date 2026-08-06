// Types
export * from "./types";

// Overview endpoints
export {
  fetchOverview,
  fetchOverviewBucketed,
  fetchMetric,
  fetchLiveUserCount,
  fetchOverviewLite,
  fetchOverviewBucketedLite,
  fetchMetricLite,
} from "./overview";
export type {
  GetOverviewResponse,
  GetOverviewBucketedResponse,
  MetricResponse,
  LiveUserCountResponse,
} from "./overview";

// Events endpoints
export {
  fetchEventBucketed,
  fetchNewEvents,
  fetchEventsCursor,
  fetchEventNames,
  fetchEventProperties,
  fetchAutocaptureEvents,
  fetchAutocaptureValues,
  fetchOutboundLinks,
  fetchSiteEventCount,
} from "./events";
export type {
  Event,
  EventBucketedPoint,
  NewEventsResponse,
  CursorEventsResponse,
  EventName,
  EventProperty,
  AutocaptureEvent,
  AutocaptureValue,
  OutboundLink,
  EventBucketedParams,
  EventPropertiesParams,
  SiteEventCountPoint,
  SiteEventCountParams,
} from "./events";

// Dashboards endpoints
export {
  fetchDashboards,
  fetchDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  runDashboardCard,
} from "./dashboards";
export type { RunDashboardCardBody } from "./dashboards";

// Custom query endpoints
export { generateCustomQuery, runCustomQuery } from "./customQuery";
export type {
  CustomQueryGenerationMessage,
  CustomQueryRow,
  GenerateCustomQueryRequest,
  GenerateCustomQueryResponse,
  RunCustomQueryResponse,
} from "./customQuery";

// Errors endpoints
export { fetchErrorNames, fetchErrorEvents, fetchErrorBucketed } from "./errors";
export type {
  ErrorNameItem,
  ErrorNamesPaginatedResponse,
  ErrorNamesStandardResponse,
  ErrorEvent,
  ErrorEventsPaginatedResponse,
  ErrorEventsStandardResponse,
  GetErrorBucketedResponse,
  ErrorNamesParams,
  ErrorEventsParams,
  ErrorBucketedParams,
} from "./errors";

// Goals endpoints
export { fetchGoals, fetchGoalTimeSeries, fetchGoalSessions, createGoal, updateGoal, deleteGoal } from "./goals";
export type {
  Goal,
  GoalType,
  GoalConfig,
  GoalTimeSeriesPoint,
  PaginationMeta,
  GoalsResponse,
  GoalsParams,
  GoalTimeSeriesParams,
  GoalSessionsParams,
  CreateGoalParams,
  UpdateGoalParams,
} from "./goals";

// Feature flag endpoints
export { fetchFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag } from "./featureFlags";
export type {
  FeatureFlag,
  FeatureFlagConditionSet,
  FeatureFlagPayload,
  FeatureFlagPayloadValue,
  FeatureFlagRule,
  FeatureFlagRuntime,
  FeatureFlagStats,
  FeatureFlagType,
  FeatureFlagUpdatePayload,
  FeatureFlagVariant,
} from "./featureFlags";

// Experiment endpoints
export {
  createExperiment,
  deleteExperiment,
  fetchExperimentResults,
  fetchExperiments,
  updateExperiment,
} from "./experiments";
export type {
  Experiment,
  ExperimentFeatureFlag,
  ExperimentGoal,
  ExperimentPayload,
  ExperimentResults,
  ExperimentStatus,
  ExperimentUpdatePayload,
  ExperimentVariantResult,
} from "./experiments";

// Funnels endpoints
export {
  fetchFunnels,
  analyzeFunnel,
  fetchFunnelStepSessions,
  saveFunnel,
  deleteFunnel,
  stepRequiresValue,
  hasIncompleteSteps,
} from "./funnels";
export type {
  SavedFunnel,
  FunnelStep,
  FunnelStepType,
  FunnelRequest,
  SaveFunnelRequest,
  FunnelResponse,
  AnalyzeFunnelParams,
  FunnelStepSessionsParams,
  SaveFunnelParams,
} from "./funnels";

// Performance endpoints
export { fetchPerformanceOverview, fetchPerformanceTimeSeries, fetchPerformanceByDimension } from "./performance";
export type {
  GetPerformanceOverviewResponse,
  GetPerformanceTimeSeriesResponse,
  PerformanceByDimensionItem,
  PerformanceOverviewParams,
  PerformanceTimeSeriesParams,
  PerformanceByDimensionParams,
  PaginatedPerformanceResponse,
} from "./performance";

// Bots endpoints
export { fetchBotDimension, fetchBotOverview, fetchBotTimeSeries } from "./bots";
export type {
  BotDimensionKey,
  BotDimensionItem,
  BotDimensionParams,
  BotLayerKey,
  BotOverviewParams,
  BotTimeSeriesParams,
  BotTimeSeriesPoint,
  GetBotOverviewResponse,
  GetBotTimeSeriesResponse,
  PaginatedBotDimensionResponse,
} from "./bots";

// Sessions endpoints
export { fetchSessions, fetchSession, fetchSessionLocations } from "./sessions";
export type {
  GetSessionsResponse,
  SessionDetails,
  SessionEvent,
  SessionEventProps,
  SessionPageviewsAndEvents,
  LiveSessionLocation,
  SessionsParams,
  SessionDetailsParams,
} from "./sessions";

// Users endpoints
export {
  fetchUsers,
  fetchUserSessionCount,
  fetchUserInfo,
  identifyUser,
  updateUserTraits,
  deleteUser,
} from "./users";
export type {
  UsersResponse,
  UserInfo,
  UserVitals,
  UserLocationBreakdown,
  UserDeviceBreakdown,
  LinkedDevice,
  UserSessionCountResponse,
  UsersParams,
  UserSessionsParams,
  UserSessionCountParams,
  UsersListResponse,
  IdentifyUserPayload,
} from "./users";

// Misc endpoints (retention, journeys, page titles, org event count)
export { fetchRetention, fetchJourneys, fetchPageTitles, fetchOrgEventCount } from "./misc";
export type {
  ProcessedRetentionData,
  RetentionMode,
  Journey,
  JourneysResponse,
  RetentionParams,
  JourneysParams,
  PageTitleItem,
  PageTitlesPaginatedResponse,
  PageTitlesStandardResponse,
  PageTitlesParams,
  OrgEventCountResponse,
  GetOrgEventCountResponse,
  OrgEventCountParams,
} from "./misc";

// Session Replay endpoints
export { fetchSessionReplays, fetchSessionReplayEvents, deleteSessionReplay } from "./sessionReplay";
export type {
  SessionReplayListItem,
  SessionReplayListResponse,
  SessionReplayEvent,
  SessionReplayMetadata,
  GetSessionReplayEventsResponse,
  SessionReplaysParams,
} from "./sessionReplay";

// User Traits endpoints
export { fetchUserTraitKeys, fetchUserTraitValues, fetchUserTraitValueUsers } from "./userTraits";
export type {
  TraitKey,
  TraitKeysResponse,
  TraitValue,
  TraitValuesResponse,
  TraitValuesParams,
  TraitValueUser,
  TraitValueUsersResponse,
  TraitValueUsersParams,
} from "./userTraits";

// Export endpoints
export { exportPdfReport } from "./export";
export type { ExportPdfParams } from "./export";
