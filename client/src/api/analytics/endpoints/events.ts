import { authedFetch } from "../../utils";
import { BucketedParams, CommonApiParams, PaginationParams, toBucketedQueryParams, toQueryParams } from "./types";


// Event type
export type Event = {
  timestamp: string;
  event_name: string;
  properties: string;
  user_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  page_title: string;
  referrer: string;
  browser: string;
  operating_system: string;
  country: string;
  device_type: string;
  type: string;
};

// Events response with pagination
export interface EventsResponse {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Event name with count
export type EventName = {
  eventName: string;
  count: number;
};

// Event property key-value pair
export type EventProperty = {
  propertyKey: string;
  propertyValue: string;
  count: number;
};

// Outbound link click data
export type OutboundLink = {
  url: string;
  count: number;
  lastClicked: string;
};

// Event counts over time
export type EventBucketedPoint = {
  time: string;
  event_name: string;
  event_count: number;
};

export interface EventsParams extends CommonApiParams, PaginationParams {
  pageSize?: number;
}

export interface EventBucketedParams extends BucketedParams {
  limit?: number;
}


export interface EventPropertiesParams extends CommonApiParams {
  eventName: string;
}

/**
 * Fetch paginated events
 * GET /api/events/:site
 */
export async function fetchEvents(
  site: string | number,
  params: EventsParams
): Promise<EventsResponse> {
  const queryParams = {
    ...toQueryParams(params),
    page: params.page,
    page_size: params.pageSize ?? params.limit,
  };

  const response = await authedFetch<EventsResponse>(
    `/sites/${site}/events`,
    queryParams
  );
  return response;
}

/**
 * Fetch event names
 * GET /api/events/names/:site
 */
export async function fetchEventNames(
  site: string | number,
  params: CommonApiParams
): Promise<EventName[]> {
  const response = await authedFetch<{ data: EventName[] }>(
    `/sites/${site}/events/names`,
    toQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch event properties for a specific event name
 * GET /api/events/properties/:site
 */
export async function fetchEventProperties(
  site: string | number,
  params: EventPropertiesParams
): Promise<EventProperty[]> {
  const queryParams = {
    ...toQueryParams(params),
    event_name: params.eventName,
  };

  const response = await authedFetch<{ data: EventProperty[] }>(
    `/sites/${site}/events/properties`,
    queryParams
  );
  return response.data;
}

/**
 * Fetch outbound link clicks
 * GET /api/events/outbound/:site
 */
export async function fetchOutboundLinks(
  site: string | number,
  params: CommonApiParams
): Promise<OutboundLink[]> {
  const response = await authedFetch<{ data: OutboundLink[] }>(
    `/sites/${site}/events/outbound`,
    toQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch bucketed event counts for top custom events
 * GET /sites/:site/events/bucketed
 */
export async function fetchEventBucketed(
  site: string | number,
  params: EventBucketedParams
): Promise<EventBucketedPoint[]> {
  const queryParams = {
    ...toBucketedQueryParams(params),
    limit: params.limit,
  };

  const response = await authedFetch<{ data: EventBucketedPoint[] }>(
    `/sites/${site}/events/bucketed`,
    queryParams
  );
  return response.data;
}

