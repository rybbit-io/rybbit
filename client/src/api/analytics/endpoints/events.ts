import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";

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

export interface EventsParams extends CommonApiParams, PaginationParams {
  pageSize?: number;
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
    `/events/${site}`,
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
    `/events/names/${site}`,
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
    `/events/properties/${site}`,
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
    `/events/outbound/${site}`,
    toQueryParams(params)
  );
  return response.data;
}
