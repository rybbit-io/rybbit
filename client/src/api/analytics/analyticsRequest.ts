import { Filter } from "@rybbit/shared";
import { Time } from "../../components/DateSelector/types";
import { authedFetch, buildApiParams } from "../utils";
import { CommonApiParams, toQueryParams } from "./endpoints/types";

/**
 * The analytics read layer, as a value.
 *
 * Every analytics endpoint is `/sites/:site/<path>` carrying the shared time
 * window and filters on the query string plus a handful of endpoint params.
 * A descriptor says only what differs between them; `buildAnalyticsRequest`
 * turns it into the exact request that goes on the wire, and the query key is
 * built from that same object — so key and request cannot drift.
 */
export interface AnalyticsDescriptor {
  /** Path under `/sites/:site` — e.g. "overview", "events/names". */
  path: string;
  /**
   * Endpoint params beyond the shared time/filter context, already named as
   * the API expects them on the wire. Undefined values are dropped.
   */
  params?: Record<string, unknown>;
  /**
   * Present ⇒ the read is a POST carrying this JSON body (funnel analysis,
   * dashboard cards). Receives the resolved time context for the endpoints
   * that take the window in the body rather than the query string.
   */
  body?: (common: CommonApiParams) => unknown;
  /** Response body is `{ data: T }` and T is what the caller wants. Default true. */
  unwrap?: boolean;
}

/**
 * The resolved time/filter context a request is made in. `time: null` is for
 * the handful of endpoints that are not scoped to the selected period (trait
 * keys, saved funnels, retention) — they send no window and, just as
 * importantly, do not refetch when the date selector moves.
 */
export interface AnalyticsContext {
  time: Time | null;
  timeZone: string;
  filters?: Filter[];
}

export interface AnalyticsRequest {
  path: string;
  params: Record<string, unknown>;
  body?: unknown;
  unwrap: boolean;
}

const omitUndefined = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));

export function buildAnalyticsRequest(descriptor: AnalyticsDescriptor, context: AnalyticsContext): AnalyticsRequest {
  const common: CommonApiParams = context.time
    ? buildApiParams(context.time, { timeZone: context.timeZone, filters: context.filters })
    : { startDate: "", endDate: "", timeZone: context.timeZone, filters: context.filters };

  // Period-less endpoints still carry the timezone and any filters, just no window.
  const contextParams = context.time
    ? toQueryParams(common)
    : { time_zone: common.timeZone, filters: common.filters?.length ? common.filters : undefined };

  return {
    path: descriptor.path,
    params: omitUndefined({ ...contextParams, ...descriptor.params }),
    body: descriptor.body?.(common),
    unwrap: descriptor.unwrap ?? true,
  };
}

/**
 * Issue an analytics request. Used by the query hooks and by the non-React
 * callers (CSV export), so both go through the same seam.
 */
export async function fetchAnalytics<TData>(site: number | string, request: AnalyticsRequest): Promise<TData> {
  const response = await authedFetch<TData | { data: TData }>(
    `/sites/${site}/${request.path}`,
    request.params,
    request.body === undefined ? {} : { method: "POST", data: request.body }
  );
  return request.unwrap ? (response as { data: TData }).data : (response as TData);
}
