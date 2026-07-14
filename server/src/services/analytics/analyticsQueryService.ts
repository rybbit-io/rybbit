import type { Filter, TimeBucket } from "@rybbit/shared";
import SqlString from "sqlstring";

import { getFilterStatement } from "../../api/analytics/utils/getFilterStatement.js";
import { getTimeStatement, processResults, TimeBucketToFn } from "../../api/analytics/utils/utils.js";
import { buildFunnelStepCondition, type FunnelStep } from "../../api/analytics/funnels/funnelSteps.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

const MAX_EXECUTION_TIME_SECONDS = 10;
const DEFAULT_MAX_RESULT_ROWS = 1000;
const MAX_DATE_RANGE_DAYS = 366;

export const analyticsMetrics = ["sessions", "users", "pageviews", "events", "custom_events", "errors"] as const;
export type AnalyticsMetric = (typeof analyticsMetrics)[number];

export const analyticsDimensions = [
  "pathname",
  "hostname",
  "page_title",
  "referrer",
  "channel",
  "country",
  "region",
  "city",
  "browser",
  "operating_system",
  "device_type",
  "language",
  "event_name",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "tag",
] as const;
export type AnalyticsDimension = (typeof analyticsDimensions)[number];

export interface AnalyticsSiteAccess {
  siteId: number;
  organizationId: string | null;
  name: string;
  domain: string;
  type: "web" | "mobile" | null;
}

export interface AnalyticsAccessContext {
  userId: string;
  sites: AnalyticsSiteAccess[];
}

export interface AnalyticsQueryScope {
  siteId: number;
  startDate: string;
  endDate: string;
  timezone: string;
  filters: Filter[];
}

export interface AnalyticsResultMeta {
  siteId: number;
  startDate: string;
  endDate: string;
  timezone: string;
  queryId: string;
  rowCount: number;
  truncated: boolean;
}

export interface AnalyticsResult<T> {
  data: T;
  meta: AnalyticsResultMeta;
}

export interface OverviewData {
  sessions: number;
  pageviews: number;
  users: number;
  pagesPerSession: number;
  bounceRate: number;
  sessionDurationSeconds: number;
}

export interface TimeseriesPoint {
  time: string;
  sessions: number;
  users: number;
  pageviews: number;
  events: number;
  customEvents: number;
  errors: number;
}

export interface BreakdownItem {
  value: string;
  count: number;
  percentage: number;
}

export interface FunnelStepResult {
  stepNumber: number;
  stepName: string;
  visitors: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface ErrorSummaryItem {
  name: string;
  errors: number;
  sessions: number;
  lastSeen: string;
}

interface AnalyticsQueryRequest {
  query: string;
  queryParams: Record<string, unknown>;
  maxRows?: number;
}

interface AnalyticsQueryResponse<T> {
  data: T[];
  queryId: string;
}

export interface AnalyticsQueryRunner {
  run<T>(request: AnalyticsQueryRequest): Promise<AnalyticsQueryResponse<T>>;
}

export class AnalyticsAccessError extends Error {
  constructor(siteId: number) {
    super(`You do not have access to Rybbit site ${siteId}`);
    this.name = "AnalyticsAccessError";
  }
}

export class AnalyticsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsInputError";
  }
}

const clickhouseQueryRunner: AnalyticsQueryRunner = {
  async run<T>({ query, queryParams, maxRows = DEFAULT_MAX_RESULT_ROWS }: AnalyticsQueryRequest) {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: queryParams,
      clickhouse_settings: {
        max_execution_time: MAX_EXECUTION_TIME_SECONDS,
        max_result_rows: String(maxRows),
        result_overflow_mode: "break",
        readonly: "2",
      },
    });

    return {
      data: await processResults<T>(result),
      queryId: result.query_id,
    };
  },
};

const dimensionExpressions: Record<AnalyticsDimension, string> = {
  pathname: "pathname",
  hostname: "hostname",
  page_title: "page_title",
  referrer: "domainWithoutWWW(referrer)",
  channel: "channel",
  country: "country",
  region: "region",
  city: "city",
  browser: "browser",
  operating_system: "operating_system",
  device_type: "device_type",
  language: "language",
  event_name: "event_name",
  utm_source: "url_parameters['utm_source']",
  utm_medium: "url_parameters['utm_medium']",
  utm_campaign: "url_parameters['utm_campaign']",
  utm_term: "url_parameters['utm_term']",
  utm_content: "url_parameters['utm_content']",
  tag: "tag",
};

const metricExpressions: Record<AnalyticsMetric, string> = {
  sessions: "uniqExact(session_id)",
  users: "uniqExact(user_id)",
  pageviews: "countIf(type = 'pageview')",
  events: "count()",
  custom_events: "countIf(type = 'custom_event')",
  errors: "countIf(type = 'error')",
};

function sanitizeAnalyticsLabel(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ")
    .slice(0, maxLength);
}

function parseIsoDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Number.NaN;
  }

  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) {
    return Number.NaN;
  }

  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : Number.NaN;
}

function validateScope(scope: AnalyticsQueryScope) {
  if (!Number.isInteger(scope.siteId) || scope.siteId <= 0) {
    throw new AnalyticsInputError("siteId must be a positive integer");
  }

  const start = parseIsoDate(scope.startDate);
  const end = parseIsoDate(scope.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new AnalyticsInputError("startDate and endDate must use YYYY-MM-DD");
  }
  if (start > end) {
    throw new AnalyticsInputError("startDate must be on or before endDate");
  }
  const inclusiveDays = (end - start) / 86_400_000 + 1;
  if (inclusiveDays > MAX_DATE_RANGE_DAYS) {
    throw new AnalyticsInputError(`Date ranges cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: scope.timezone });
  } catch {
    throw new AnalyticsInputError(`Invalid IANA timezone: ${scope.timezone}`);
  }
}

function requireSite(context: AnalyticsAccessContext, scope: AnalyticsQueryScope): AnalyticsSiteAccess {
  validateScope(scope);
  const site = context.sites.find(candidate => candidate.siteId === scope.siteId);
  if (!site) {
    throw new AnalyticsAccessError(scope.siteId);
  }
  return site;
}

function buildScopeStatements(scope: AnalyticsQueryScope) {
  const timeStatement = getTimeStatement({
    start_date: scope.startDate,
    end_date: scope.endDate,
    time_zone: scope.timezone,
  });
  const filterStatement = getFilterStatement(JSON.stringify(scope.filters), scope.siteId, timeStatement);
  return { timeStatement, filterStatement };
}

function buildMeta(
  scope: AnalyticsQueryScope,
  queryId: string,
  rowCount: number,
  truncated = false
): AnalyticsResultMeta {
  return {
    siteId: scope.siteId,
    startDate: scope.startDate,
    endDate: scope.endDate,
    timezone: scope.timezone,
    queryId,
    rowCount,
    truncated,
  };
}

export function createAnalyticsQueryService(runner: AnalyticsQueryRunner = clickhouseQueryRunner) {
  return {
    getContext(context: AnalyticsAccessContext, options: { query?: string; limit?: number } = {}) {
      const query = options.query?.trim().toLowerCase();
      const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 50)));
      const matchingSites = context.sites
        .filter(site => {
          if (!query) return true;
          return (
            String(site.siteId).includes(query) ||
            site.name.toLowerCase().includes(query) ||
            site.domain.toLowerCase().includes(query)
          );
        })
        .sort((left, right) => left.name.localeCompare(right.name) || left.siteId - right.siteId);
      const selectedSites = matchingSites.slice(0, limit);
      const organizations = new Map<string, AnalyticsSiteAccess[]>();
      for (const site of selectedSites) {
        const organizationId = site.organizationId ?? "unassigned";
        const organizationSites = organizations.get(organizationId) ?? [];
        organizationSites.push({
          ...site,
          name: sanitizeAnalyticsLabel(site.name, 200),
          domain: sanitizeAnalyticsLabel(site.domain, 255),
        });
        organizations.set(organizationId, organizationSites);
      }

      return {
        organizations: [...organizations.entries()].map(([organizationId, organizationSites]) => ({
          organizationId,
          sites: organizationSites.sort((left, right) => left.name.localeCompare(right.name)),
        })),
        siteCount: context.sites.length,
        matchingSiteCount: matchingSites.length,
        returnedSiteCount: selectedSites.length,
        truncated: selectedSites.length < matchingSites.length,
      };
    },

    async queryOverview(
      context: AnalyticsAccessContext,
      scope: AnalyticsQueryScope
    ): Promise<AnalyticsResult<OverviewData>> {
      requireSite(context, scope);
      const { timeStatement, filterStatement } = buildScopeStatements(scope);
      const response = await runner.run<{
        sessions: number;
        pageviews: number;
        users: number;
        pages_per_session: number;
        bounce_rate: number;
        session_duration: number;
      }>({
        query: `
          WITH
          AllSessionPageviews AS (
            SELECT
              session_id,
              countIf(type = 'pageview') AS total_pageviews_in_session
            FROM events
            WHERE site_id = {siteId:UInt32}
              ${timeStatement}
            GROUP BY session_id
          ),
          FilteredSessionsWithStats AS (
            SELECT
              session_id,
              anyLast(user_id) AS user_id,
              min(timestamp) AS start_time,
              max(timestamp) AS end_time,
              countIf(type = 'pageview') AS filtered_pageviews
            FROM events
            WHERE site_id = {siteId:UInt32}
              ${filterStatement}
              ${timeStatement}
            GROUP BY session_id
          )
          SELECT
            count() AS sessions,
            sum(f.filtered_pageviews) AS pageviews,
            uniqExact(f.user_id) AS users,
            if(count() = 0, 0, avg(asp.total_pageviews_in_session)) AS pages_per_session,
            if(count() = 0, 0, countIf(asp.total_pageviews_in_session = 1) / count() * 100) AS bounce_rate,
            if(count() = 0, 0, avg(f.end_time - f.start_time)) AS session_duration
          FROM FilteredSessionsWithStats f
          LEFT JOIN AllSessionPageviews asp ON f.session_id = asp.session_id
        `,
        queryParams: { siteId: scope.siteId },
        maxRows: 1,
      });

      const row = response.data[0];
      const data: OverviewData = row
        ? {
            sessions: row.sessions,
            pageviews: row.pageviews,
            users: row.users,
            pagesPerSession: row.pages_per_session,
            bounceRate: row.bounce_rate,
            sessionDurationSeconds: row.session_duration,
          }
        : {
            sessions: 0,
            pageviews: 0,
            users: 0,
            pagesPerSession: 0,
            bounceRate: 0,
            sessionDurationSeconds: 0,
          };

      return { data, meta: buildMeta(scope, response.queryId, row ? 1 : 0) };
    },

    async queryTimeseries(
      context: AnalyticsAccessContext,
      scope: AnalyticsQueryScope & { bucket: TimeBucket }
    ): Promise<AnalyticsResult<TimeseriesPoint[]>> {
      requireSite(context, scope);
      const bucketFunction = TimeBucketToFn[scope.bucket];
      if (!bucketFunction) {
        throw new AnalyticsInputError(`Unsupported time bucket: ${scope.bucket}`);
      }
      const { timeStatement, filterStatement } = buildScopeStatements(scope);
      const response = await runner.run<{
        time: string;
        sessions: number;
        users: number;
        pageviews: number;
        events: number;
        custom_events: number;
        errors: number;
      }>({
        query: `
          WITH
          FilteredEvents AS (
            SELECT session_id, user_id, timestamp, type
            FROM events
            WHERE site_id = {siteId:UInt32}
              ${filterStatement}
              ${timeStatement}
          ),
          SessionSeries AS (
            SELECT
              toDateTime(${bucketFunction}(toTimeZone(min(timestamp), {timezone:String}))) AS time,
              count() AS sessions
            FROM FilteredEvents
            GROUP BY session_id
          ),
          SessionBuckets AS (
            SELECT time, count() AS sessions
            FROM SessionSeries
            GROUP BY time
          ),
          EventBuckets AS (
            SELECT
              toDateTime(${bucketFunction}(toTimeZone(timestamp, {timezone:String}))) AS time,
              uniqExact(user_id) AS users,
              countIf(type = 'pageview') AS pageviews,
              count() AS events,
              countIf(type = 'custom_event') AS custom_events,
              countIf(type = 'error') AS errors
            FROM FilteredEvents
            GROUP BY time
          )
          SELECT
            coalesce(s.time, e.time) AS time,
            ifNull(s.sessions, 0) AS sessions,
            ifNull(e.users, 0) AS users,
            ifNull(e.pageviews, 0) AS pageviews,
            ifNull(e.events, 0) AS events,
            ifNull(e.custom_events, 0) AS custom_events,
            ifNull(e.errors, 0) AS errors
          FROM SessionBuckets s
          FULL OUTER JOIN EventBuckets e ON s.time = e.time
          ORDER BY time ASC
        `,
        queryParams: { siteId: scope.siteId, timezone: scope.timezone },
      });

      const data = response.data.map(row => ({
        time: row.time,
        sessions: row.sessions,
        users: row.users,
        pageviews: row.pageviews,
        events: row.events,
        customEvents: row.custom_events,
        errors: row.errors,
      }));
      return {
        data,
        meta: buildMeta(scope, response.queryId, data.length, data.length >= DEFAULT_MAX_RESULT_ROWS),
      };
    },

    async queryBreakdown(
      context: AnalyticsAccessContext,
      scope: AnalyticsQueryScope & {
        metric: AnalyticsMetric;
        dimension: AnalyticsDimension;
        limit: number;
      }
    ): Promise<AnalyticsResult<BreakdownItem[]>> {
      requireSite(context, scope);
      const metricExpression = metricExpressions[scope.metric];
      const dimensionExpression = dimensionExpressions[scope.dimension];
      if (!metricExpression || !dimensionExpression) {
        throw new AnalyticsInputError("Unsupported metric or dimension");
      }
      const limit = Math.min(100, Math.max(1, Math.floor(scope.limit)));
      const { timeStatement, filterStatement } = buildScopeStatements(scope);
      const response = await runner.run<{
        value: string;
        metric_value: number;
        percentage: number;
      }>({
        query: `
          WITH GroupedValues AS (
            SELECT
              if(empty(toString(${dimensionExpression})), '(none)', toString(${dimensionExpression})) AS value,
              ${metricExpression} AS metric_value
            FROM events
            WHERE site_id = {siteId:UInt32}
              ${filterStatement}
              ${timeStatement}
            GROUP BY value
            HAVING metric_value > 0
          )
          SELECT
            value,
            metric_value,
            round(metric_value * 100.0 / nullIf(sum(metric_value) OVER (), 0), 2) AS percentage
          FROM GroupedValues
          ORDER BY metric_value DESC, value ASC
          LIMIT {limit:UInt32}
        `,
        queryParams: { siteId: scope.siteId, limit },
        maxRows: limit,
      });

      const data = response.data.map(row => ({
        value: sanitizeAnalyticsLabel(row.value),
        count: row.metric_value,
        percentage: row.percentage,
      }));
      return { data, meta: buildMeta(scope, response.queryId, data.length, data.length >= limit) };
    },

    async queryFunnel(
      context: AnalyticsAccessContext,
      scope: AnalyticsQueryScope & { steps: FunnelStep[] }
    ): Promise<AnalyticsResult<FunnelStepResult[]>> {
      requireSite(context, scope);
      if (scope.steps.length < 2 || scope.steps.length > 6) {
        throw new AnalyticsInputError("Funnels require between 2 and 6 steps");
      }

      const { timeStatement, filterStatement } = buildScopeStatements(scope);
      const stepConditions = scope.steps.map(step => buildFunnelStepCondition(step));
      const stepCtes = scope.steps
        .slice(1)
        .map(
          (step, index) => `
            , Step${index + 2} AS (
              SELECT
                previous.session_id,
                min(actions.timestamp) AS step_time
              FROM Step${index + 1} previous
              JOIN SessionActions actions ON previous.session_id = actions.session_id
              WHERE actions.timestamp > previous.step_time
                AND ${stepConditions[index + 1]}
              GROUP BY previous.session_id
            )
          `
        )
        .join("");
      const stepCounts = scope.steps
        .map(
          (step, index) => `
            SELECT
              ${index + 1} AS step_number,
              ${SqlString.escape(step.name || step.value)} AS step_name,
              count() AS visitors
            FROM Step${index + 1}
          `
        )
        .join("\nUNION ALL\n");

      const response = await runner.run<{
        step_number: number;
        step_name: string;
        visitors: number;
        conversion_rate: number;
        dropoff_rate: number;
      }>({
        query: `
          WITH
          SessionActions AS (
            SELECT session_id, timestamp, pathname, event_name, type, props, hostname, url_parameters
            FROM events
            WHERE site_id = {siteId:UInt32}
              ${timeStatement}
              ${filterStatement}
          ),
          Step1 AS (
            SELECT session_id, min(timestamp) AS step_time
            FROM SessionActions
            WHERE ${stepConditions[0]}
            GROUP BY session_id
          )
          ${stepCtes},
          StepCounts AS (
            ${stepCounts}
          )
          SELECT
            current.step_number,
            current.step_name,
            current.visitors,
            if(first.visitors = 0, 0, round(current.visitors * 100.0 / first.visitors, 2)) AS conversion_rate,
            if(
              current.step_number = 1,
              0,
              if(previous.visitors = 0, 100, round((1 - current.visitors / previous.visitors) * 100.0, 2))
            ) AS dropoff_rate
          FROM StepCounts current
          CROSS JOIN (SELECT visitors FROM StepCounts WHERE step_number = 1) first
          LEFT JOIN (
            SELECT step_number + 1 AS next_step_number, visitors
            FROM StepCounts
            WHERE step_number < {stepCount:UInt8}
          ) previous ON current.step_number = previous.next_step_number
          ORDER BY current.step_number ASC
        `,
        queryParams: { siteId: scope.siteId, stepCount: scope.steps.length },
        maxRows: scope.steps.length,
      });

      const data = response.data.map(row => ({
        stepNumber: row.step_number,
        stepName: sanitizeAnalyticsLabel(row.step_name),
        visitors: row.visitors,
        conversionRate: row.conversion_rate,
        dropoffRate: row.dropoff_rate,
      }));
      return { data, meta: buildMeta(scope, response.queryId, data.length) };
    },

    async queryErrors(
      context: AnalyticsAccessContext,
      scope: AnalyticsQueryScope & { limit: number }
    ): Promise<AnalyticsResult<ErrorSummaryItem[]>> {
      requireSite(context, scope);
      const limit = Math.min(100, Math.max(1, Math.floor(scope.limit)));
      const { timeStatement, filterStatement } = buildScopeStatements(scope);
      const response = await runner.run<{
        name: string;
        errors: number;
        sessions: number;
        last_seen: string;
      }>({
        query: `
          SELECT
            if(empty(event_name), 'Unknown error', event_name) AS name,
            count() AS errors,
            uniqExact(session_id) AS sessions,
            max(timestamp) AS last_seen
          FROM events
          WHERE site_id = {siteId:UInt32}
            AND type = 'error'
            ${filterStatement}
            ${timeStatement}
          GROUP BY name
          ORDER BY errors DESC, name ASC
          LIMIT {limit:UInt32}
        `,
        queryParams: { siteId: scope.siteId, limit },
        maxRows: limit,
      });

      const data = response.data.map(row => ({
        name: sanitizeAnalyticsLabel(row.name),
        errors: row.errors,
        sessions: row.sessions,
        lastSeen: row.last_seen,
      }));
      return { data, meta: buildMeta(scope, response.queryId, data.length, data.length >= limit) };
    },
  };
}

export type AnalyticsQueryService = ReturnType<typeof createAnalyticsQueryService>;
export const analyticsQueryService = createAnalyticsQueryService();
