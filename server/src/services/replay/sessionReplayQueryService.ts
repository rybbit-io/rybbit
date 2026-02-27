import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import {
  SessionReplayMetadata,
  SessionReplayListItem,
  GetSessionReplayEventsResponse,
} from "../../types/sessionReplay.js";
import { processResults, getTimeStatement } from "../../api/analytics/utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { r2Storage } from "../storage/r2StorageService.js";
import { getFilterStatement } from "../../api/analytics/utils/getFilterStatement.js";

/**
 * Service responsible for querying/retrieving session replay data
 * Handles listing sessions and getting replay events
 */
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

    const timeStatement = getTimeStatement(options).replace(/timestamp/g, "start_time");

    const filterStatement = getFilterStatement(options.filters || "");

    let whereConditions = [`site_id = {siteId:UInt16}`];
    const queryParams: any = { siteId, limit, offset };

    if (userId) {
      whereConditions.push(`(user_id = {userId:String} OR identified_user_id = {userId:String})`);
      queryParams.userId = userId;
    }

    if (minDuration !== undefined) {
      whereConditions.push(`duration_ms >= {minDuration:UInt32}`);
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
        FROM session_replay_metadata srm
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
        duration_ms,
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
      FROM session_replay_metadata
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
        SELECT *
        FROM session_replay_metadata
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

    // Get events
    const eventsResult = await clickhouse.query({
      query: `
        SELECT 
          toUnixTimestamp64Milli(timestamp) as timestamp,
          event_type as type,
          event_data as data,
          event_data_key,
          batch_index
        FROM session_replay_events
        WHERE site_id = {siteId:UInt16} 
          AND session_id = {sessionId:String}
        ORDER BY timestamp ASC, sequence_number ASC
      `,
      query_params: { siteId, sessionId },
      format: "JSONEachRow",
    });

    type EventRow = {
      timestamp: number;
      type: string;
      data: string;
      event_data_key: string | null;
      batch_index: number | null;
    };

    const eventsResults = await processResults<EventRow>(eventsResult);

    // Group events by batch key for efficient R2 retrieval
    const eventsByBatch = new Map<string | null, EventRow[]>();
    eventsResults.forEach(event => {
      const key = event.event_data_key;
      if (!eventsByBatch.has(key)) {
        eventsByBatch.set(key, []);
      }
      eventsByBatch.get(key)!.push(event);
    });

    // Process batches and reconstruct events
    const events = [];

    // Separate R2 and ClickHouse batches
    const r2Batches: Array<[string, EventRow[]]> = [];
    const clickhouseBatches: Array<[string | null, EventRow[]]> = [];

    for (const [batchKey, batchEvents] of eventsByBatch) {
      if (batchKey && r2Storage.isEnabled()) {
        r2Batches.push([batchKey, batchEvents]);
      } else {
        clickhouseBatches.push([batchKey, batchEvents]);
      }
    }

    // Process ClickHouse batches immediately
    for (const [_, batchEvents] of clickhouseBatches) {
      for (const event of batchEvents) {
        events.push({
          timestamp: event.timestamp,
          type: event.type,
          data: JSON.parse(event.data),
        });
      }
    }

    // Fetch R2 batches in parallel (with increased concurrency for better throughput)
    const PARALLEL_BATCH_SIZE = 50;
    const r2Results: Array<{ batchKey: string; batchEvents: EventRow[]; data: any[] | null }> = [];

    for (let i = 0; i < r2Batches.length; i += PARALLEL_BATCH_SIZE) {
      const batchSlice = r2Batches.slice(i, i + PARALLEL_BATCH_SIZE);

      const promises = batchSlice.map(async ([batchKey, batchEvents]) => {
        try {
          const eventDataArray = await r2Storage.getBatch(batchKey);
          return { batchKey, batchEvents, data: eventDataArray };
        } catch (error) {
          console.error(`Failed to fetch R2 batch ${batchKey}:`, error);
          return { batchKey, batchEvents, data: null };
        }
      });

      const results = await Promise.all(promises);
      r2Results.push(...results);
    }

    // Process R2 results
    for (const { batchEvents, data } of r2Results) {
      if (data) {
        for (const event of batchEvents) {
          if (event.batch_index !== null && data[event.batch_index]) {
            events.push({
              timestamp: event.timestamp,
              type: event.type,
              data: data[event.batch_index],
            });
          }
        }
      }
    }

    // Sort events by timestamp (in case batches were processed out of order)
    events.sort((a, b) => a.timestamp - b.timestamp);

    return {
      events,
      metadata,
    };
  }

  async getSessionReplayMetadata(siteId: number, sessionId: string): Promise<SessionReplayMetadata | null> {
    const result = await clickhouse.query({
      query: `
        SELECT *
        FROM session_replay_metadata
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
   * - R2 stored data (if enabled)
   */
  async deleteSessionReplay(siteId: number, sessionId: string): Promise<void> {
    // First, get all R2 keys for this session if R2 is enabled
    if (r2Storage.isEnabled()) {
      try {
        const r2KeysResult = await clickhouse.query({
          query: `
            SELECT DISTINCT event_data_key
            FROM session_replay_events
            WHERE site_id = {siteId:UInt16}
              AND session_id = {sessionId:String}
              AND event_data_key IS NOT NULL
          `,
          query_params: { siteId, sessionId },
          format: "JSONEachRow",
        });

        const r2Keys = await processResults<{ event_data_key: string }>(r2KeysResult);

        // Delete all R2 batches in parallel
        await Promise.all(r2Keys.map(row => r2Storage.deleteBatch(row.event_data_key)));
      } catch (error) {
        console.error(`Failed to delete R2 data for session ${sessionId}:`, error);
        // Continue with ClickHouse deletion even if R2 fails
      }
    }

    // Delete from ClickHouse tables
    await clickhouse.command({
      query: `
        DELETE FROM session_replay_events
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
      `,
      query_params: { siteId, sessionId },
    });

    await clickhouse.command({
      query: `
        DELETE FROM session_replay_metadata
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
      `,
      query_params: { siteId, sessionId },
    });
  }
}
