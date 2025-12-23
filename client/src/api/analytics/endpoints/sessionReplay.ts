import { authedFetch } from "../../utils";
import { CommonApiParams, toQueryParams } from "./types";

// Session replay list item type
export interface SessionReplayListItem {
  session_id: string;
  user_id: string;
  identified_user_id: string;
  traits: Record<string, unknown> | null;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  page_url: string;
  event_count: number;
  country: string;
  region: string;
  city: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  device_type: string;
  screen_width: number;
  screen_height: number;
}

// Session replay list response type
export interface SessionReplayListResponse {
  data: SessionReplayListItem[];
  totalCount: number;
}

// Session replay event type
export interface SessionReplayEvent {
  timestamp: number;
  type: string | number;
  data: any;
}

// Session replay metadata type
export interface SessionReplayMetadata {
  session_id: string;
  user_id: string;
  identified_user_id: string;
  traits: Record<string, unknown> | null;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  event_count: number;
  compressed_size_bytes: number;
  page_url: string;
  user_agent: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  language: string;
  screen_width: number;
  screen_height: number;
  device_type: string;
  channel: string;
  hostname: string;
  referrer: string;
  has_replay_data: boolean;
  created_at: Date;
}

// Get session replay events response type
export interface GetSessionReplayEventsResponse {
  events: SessionReplayEvent[];
  metadata: SessionReplayMetadata;
}

// Session replays params
export interface SessionReplaysParams extends CommonApiParams {
  limit?: number;
  offset?: number;
  minDuration?: number;
}

/**
 * Fetch session replays list
 * GET /api/session-replay/list/:site
 */
export async function fetchSessionReplays(
  site: string | number,
  params: SessionReplaysParams
): Promise<SessionReplayListResponse> {
  const queryParams = {
    ...toQueryParams(params),
    limit: params.limit,
    offset: params.offset,
    min_duration: params.minDuration,
  };

  const response = await authedFetch<SessionReplayListResponse>(`/session-replay/list/${site}`, queryParams);
  return response;
}

/**
 * Fetch session replay events for a specific session
 * GET /api/session-replay/:sessionId/:site
 */
export async function fetchSessionReplayEvents(
  site: string | number,
  sessionId: string
): Promise<GetSessionReplayEventsResponse> {
  const response = await authedFetch<GetSessionReplayEventsResponse>(`/session-replay/${sessionId}/${site}`);
  return response;
}

/**
 * Delete a session replay
 * DELETE /api/session-replay/:sessionId/:site
 */
export async function deleteSessionReplay(site: string | number, sessionId: string): Promise<{ success: boolean }> {
  const response = await authedFetch<{ success: boolean }>(`/session-replay/${sessionId}/${site}`, undefined, {
    method: "DELETE",
  });
  return response;
}
