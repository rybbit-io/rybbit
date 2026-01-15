// Types
export * from "./types";

// Overview endpoints
export { fetchOverview, fetchOverviewBucketed, fetchMetric, fetchLiveUserCount } from "./overview";
export type {
  GetOverviewResponse,
  GetOverviewBucketedResponse,
  MetricResponse,
  LiveUserCountResponse,
} from "./overview";

// Events endpoints
export { fetchEventBucketed, fetchEvents, fetchEventNames, fetchEventProperties, fetchOutboundLinks } from "./events";
export type {
  Event,
  EventBucketedPoint,
  EventsResponse,
  EventName,
  EventProperty,
  OutboundLink,
  EventBucketedParams,
  EventsParams,
  EventPropertiesParams,
} from "./events";


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
export { fetchGoals, fetchGoalSessions, createGoal, updateGoal, deleteGoal } from "./goals";
export type {
  Goal,
  PaginationMeta,
  GoalsResponse,
  GoalsParams,
  GoalSessionsParams,
  CreateGoalParams,
  UpdateGoalParams,
} from "./goals";

// Funnels endpoints
export { fetchFunnels, analyzeFunnel, fetchFunnelStepSessions, saveFunnel, deleteFunnel } from "./funnels";
export type {
  SavedFunnel,
  FunnelStep,
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
export { fetchUsers, fetchUserSessionCount, fetchUserInfo } from "./users";
export type {
  UsersResponse,
  UserInfo,
  LinkedDevice,
  UserSessionCountResponse,
  UsersParams,
  UserSessionsParams,
  UserSessionCountParams,
  UsersListResponse,
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

// Export endpoints
export { exportPdfReport } from "./export";
export type { ExportPdfParams } from "./export";
