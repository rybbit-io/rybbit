import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../../api/analytics/utils/getFilterStatement.js";
import { matchesUser } from "../../api/analytics/utils/effectiveUserId.js";
import { getTimeStatement } from "../../api/analytics/utils/timeWindow.js";
import { processResults } from "../../api/analytics/utils/utils.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import {
  GetSessionReplayEventsResponse,
  SessionReplayListItem,
  SessionReplayMetadata,
} from "../../types/sessionReplay.js";
import { replayPayloadStorage } from "./replayPayloadStorage.js";

/**
 * Service responsible for querying/retrieving session replay data
 * Handles listing sessions and getting replay events
 */
const DURATION_MS = `dateDiff('millisecond', start_time, end_time)`;

// SELECT * is not usable against an aggregating table: it would return the raw
// per-batch columns and omit the derived duration. List what readers consume.
const METADATA_COLUMNS = `
  site_id,
  session_id,
  user_id,
  identified_user_id,
  start_time,
  end_time,
  ${DURATION_MS} AS duration_ms,
  event_count,
  compressed_size_bytes,
  page_url,
  country,
  region,
  city,
  lat,
  lon,
  browser,
  browser_version,
  operating_system,
  operating_system_version,
  language,
  screen_width,
  screen_height,
  device_type,
  channel,
  hostname,
  referrer,
  has_replay_data
`;

export class SessionReplayQueryService {
  async getSessionReplayList(
    siteId: number,
    options: FilterParams<{
      limit?: number;
      offset?: number;
      userId?: string;
      minDuration?: number;
    }>
  ): Promise<SessionReplayListItem[]> {
    const { limit = 50, offset = 0, userId, minDuration } = options;

    const timeStatement = getTimeStatement(options, "start_time");

    const filterStatement = getFilterStatement(options.filters || "");

    let whereConditions = [`site_id = {siteId:UInt16}`];
    const queryParams: any = { siteId, limit, offset };

    if (userId) {
      whereConditions.push(matchesUser("{userId:String}"));
      queryParams.userId = userId;
    }

    if (minDuration !== undefined) {
      // Derived from the merged bounds rather than stored: each batch only
      // knows its own slice of the session, so duration is only meaningful
      // after FINAL has combined them.
      whereConditions.push(`${DURATION_MS} >= {minDuration:UInt32}`);
      queryParams.minDuration = minDuration * 1000; // Convert seconds to milliseconds
    }

    // Build the base query for session IDs that have replay events
    let sessionIdsSubquery = `
      SELECT DISTINCT session_id
      FROM session_replay_events
      WHERE site_id = {siteId:UInt16} AND event_type = '2'
    `;

    // If filters are present, we need to further filter by sessions that match the filter criteria
    if (filterStatement) {
      sessionIdsSubquery = `
        SELECT DISTINCT srm.session_id
        FROM session_replay_metadata_v2 srm
        FINAL
        WHERE srm.site_id = {siteId:UInt16}
          AND srm.session_id IN (
            SELECT DISTINCT session_id
            FROM session_replay_events
            WHERE site_id = {siteId:UInt16} AND event_type = '2'
          )
          AND srm.session_id IN (
            SELECT DISTINCT session_id
            FROM events
            WHERE site_id = {siteId:UInt16}
              ${filterStatement}
          )
      `;
    }

    const query = `
      SELECT
        session_id,
        user_id,
        identified_user_id,
        start_time,
        end_time,
        ${DURATION_MS} AS duration_ms,
        page_url,
        event_count,
        country,
        region,
        city,
        browser,
        browser_version,
        operating_system,
        operating_system_version,
        device_type,
        screen_width,
        screen_height
      FROM session_replay_metadata_v2
      FINAL
      WHERE ${whereConditions.join(" AND ")}
        AND event_count >= 2
        AND session_id IN (${sessionIdsSubquery})
      ${timeStatement}
      ORDER BY start_time DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `;

    const result = await clickhouse.query({
      query,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    const rawResults = await processResults<any>(result);

    const finalResults = rawResults;

    return finalResults;
  }

  async getSessionReplayEvents(siteId: number, sessionId: string): Promise<GetSessionReplayEventsResponse> {
    // Get metadata
    const metadataResult = await clickhouse.query({
      query: `
        SELECT ${METADATA_COLUMNS}
        FROM session_replay_metadata_v2
        FINAL
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
        LIMIT 1
      `,
      query_params: { siteId, sessionId },
      format: "JSONEachRow",
    });

    const metadataResults = await processResults<any>(metadataResult);
    const metadata = metadataResults[0];

    if (!metadata) {
      throw new Error("Session replay not found for session " + sessionId);
    }

    const events = await replayPayloadStorage.readSessionEvents(siteId, sessionId);

    return {
      events,
      metadata,
    };
  }

  async getSessionReplayMetadata(siteId: number, sessionId: string): Promise<SessionReplayMetadata | null> {
    const result = await clickhouse.query({
      query: `
        SELECT ${METADATA_COLUMNS}
        FROM session_replay_metadata_v2
        FINAL
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
        LIMIT 1
      `,
      query_params: { siteId, sessionId },
      format: "JSONEachRow",
    });

    const results = await processResults<SessionReplayMetadata>(result);
    return results[0] || null;
  }

  /**
   * Delete a session replay and all associated data
   * This includes:
   * - Events from session_replay_events table
   * - Metadata from session_replay_metadata table
   * - Object-stored payloads referenced by the events
   */
  async deleteSessionReplay(siteId: number, sessionId: string): Promise<void> {
    await replayPayloadStorage.deleteSessionEvents(siteId, sessionId);

    await clickhouse.command({
      query: `
        DELETE FROM session_replay_metadata_v2
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
      `,
      query_params: { siteId, sessionId },
    });
  }
}
