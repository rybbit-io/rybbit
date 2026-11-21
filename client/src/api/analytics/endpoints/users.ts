import { authedFetch } from "../../utils";

// User response type
export type UsersResponse = {
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  traits: Record<string, unknown> | null;
  country: string;
  region: string;
  city: string;
  language: string;
  browser: string;
  operating_system: string;
  device_type: string;
  referrer: string;
  channel: string;
  pageviews: number;
  events: number;
  sessions: number;
  last_seen: string;
  first_seen: string;
};

// Linked device type
export type LinkedDevice = {
  anonymous_id: string;
  created_at: string;
};

// p75 Web Vitals across the user's performance events
export type UserVitals = {
  lcp_p75: number | null;
  cls_p75: number | null;
  inp_p75: number | null;
  fcp_p75: number | null;
  ttfb_p75: number | null;
  performance_events: number;
};

// One location the user was seen in, with session share
export type UserLocationBreakdown = {
  country: string;
  region: string;
  city: string;
  sessions: number;
  last_seen: string;
};

// One device the user was seen on (grouped without versions; versions and
// screen reflect the latest sighting)
export type UserDeviceBreakdown = {
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  sessions: number;
  last_seen: string;
};

// User info type
export type UserInfo = {
  duration: number;
  sessions: number;
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_height: number;
  screen_width: number;
  referrer: string;
  channel: string;
  last_seen: string;
  first_seen: string;
  pageviews: number;
  events: number;
  ip?: string;
  first_referrer: string;
  first_channel: string;
  first_entry_page: string;
  first_utm_source: string;
  first_utm_medium: string;
  first_utm_campaign: string;
  last_referrer: string;
  last_channel: string;
  timezone: string;
  traits: Record<string, unknown> | null;
  linked_devices: LinkedDevice[];
  vitals: UserVitals | null;
  locations: UserLocationBreakdown[];
  devices: UserDeviceBreakdown[];
};

// User session count response type
export interface UserSessionCountResponse {
  date: string;
  sessions: number;
}

export interface UsersListResponse {
  data: UsersResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  // More profiles matched a name, username or email search than the server
  // looks up at once; the list covers the most recently updated of them.
  searchLimited?: boolean;
  // A trait group was asked for in a period with too many identified users to
  // join to their traits.
  breakdownLimited?: boolean;
}

// The Users page's stat band figures for one period
export interface UsersSummary {
  users: number;
  identified_users: number;
  // Sum of every user's session count
  sessions: number;
  identified_sessions: number;
  // Null for an all-time period, which has no earlier window to look back over
  new_users: number | null;
  returning_users: number | null;
  // How far back "new" looks, in days
  lookback_days: number;
  // Users with at least power_min_sessions sessions in the period
  power_users: number;
  power_min_sessions: number;
}

export interface IdentifyUserPayload {
  anonymousId: string;
  userId: string;
  traits?: Record<string, unknown>;
}

/**
 * Manually identify an anonymous visitor from the dashboard
 * POST /sites/:site/users/identify
 */
export async function identifyUser(site: string | number, payload: IdentifyUserPayload): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(`/sites/${site}/users/identify`, undefined, {
    method: "POST",
    data: {
      anonymous_id: payload.anonymousId,
      user_id: payload.userId,
      traits: payload.traits,
    },
  });
}

/**
 * Replace an identified user's traits
 * PUT /sites/:site/users/:userId/traits
 */
export async function updateUserTraits(
  site: string | number,
  userId: string,
  traits: Record<string, unknown>
): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(`/sites/${site}/users/${encodeURIComponent(userId)}/traits`, undefined, {
    method: "PUT",
    data: { traits },
  });
}

/**
 * Permanently delete all analytics data for a user (GDPR erasure)
 * DELETE /sites/:site/users/:userId
 */
export async function deleteUser(site: string | number, userId: string): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(`/sites/${site}/users/${encodeURIComponent(userId)}`, undefined, {
    method: "DELETE",
  });
}
