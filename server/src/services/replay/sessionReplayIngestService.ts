import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { processResults } from "../../api/analytics/utils/utils.js";
import { parseTrackingData } from "./trackingUtils.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { userIdService } from "../userId/userIdService.js";
import { r2Storage } from "../storage/r2StorageService.js";
import { siteConfig } from "../../lib/siteConfig.js";

export interface RequestMetadata {
  userAgent: string;
  ipAddress: string;
  origin: string;
  referrer: string;
}

/**
 * Service responsible for ingesting session replay data
 * Handles recording events and updating metadata
 */
export class SessionReplayIngestService {
  async recordEvents(
    siteId: number,
    request: RecordSessionReplayRequest,
    requestMeta?: RequestMetadata
  ): Promise<void> {
    const { userId: clientUserId, events, metadata } = request;

    // Always generate device fingerprint (anonymous user ID) server-side
    const deviceFingerprint = await userIdService.generateUserId(
      requestMeta?.ipAddress || "",
      requestMeta?.userAgent || "",
      siteId
    );

    // Check if client provided an identified user ID (different from device fingerprint)
    const trimmedClientUserId = clientUserId?.trim() || "";
    const identifiedUserId =
      trimmedClientUserId && trimmedClientUserId !== deviceFingerprint ? trimmedClientUserId : "";

    // Use device fingerprint as the primary user_id for session tracking
    const userId = deviceFingerprint;

    // Get or create a session ID from the sessions service
    const { sessionId } = await sessionsService.updateSession({
      userId,
      siteId,
    });

    // Check if R2 storage is enabled for cloud deployments
    let r2BatchKey: string | null = null;
    let eventDataArray: any[] = [];

    if (r2Storage.isEnabled()) {
      // Extract event data for R2 storage
      eventDataArray = events.map(event => event.data);

      try {
        // Store event data batch in R2
        r2BatchKey = await r2Storage.storeBatch(siteId, sessionId, eventDataArray);
      } catch (error) {
        console.error("Failed to store in R2, falling back to ClickHouse:", error);
        r2BatchKey = null;
      }
    }

    // Prepare events for batch insert
    const eventsToInsert = events.map((event, index) => {
      const serializedData = JSON.stringify(event.data);

      if (r2BatchKey) {
        // R2 storage: store metadata only in ClickHouse
        return {
          site_id: siteId,
          session_id: sessionId,
          user_id: userId,
          identified_user_id: identifiedUserId,
          timestamp: event.timestamp,
          event_type: event.type,
          event_data: "", // Empty string when using R2
          event_data_key: r2BatchKey,
          batch_index: index,
          sequence_number: index,
          event_size_bytes: serializedData.length,
          viewport_width: metadata?.viewportWidth || null,
          viewport_height: metadata?.viewportHeight || null,
          is_complete: 0,
        };
      } else {
        // Traditional storage: store everything in ClickHouse
        return {
          site_id: siteId,
          session_id: sessionId,
          user_id: userId,
          identified_user_id: identifiedUserId,
          timestamp: event.timestamp,
          event_type: event.type,
          event_data: serializedData,
          event_data_key: null,
          batch_index: null,
          sequence_number: index,
          event_size_bytes: serializedData.length,
          viewport_width: metadata?.viewportWidth || null,
          viewport_height: metadata?.viewportHeight || null,
          is_complete: 0,
        };
      }
    });

    // Batch insert events
    if (eventsToInsert.length > 0) {
      await clickhouse.insert({
        table: "session_replay_events",
        values: eventsToInsert,
        format: "JSONEachRow",
      });
    }

    // Update or insert metadata
    if (metadata) {
      await this.updateSessionMetadata(siteId, sessionId, userId, identifiedUserId, metadata, requestMeta);
    }
  }

  private async updateSessionMetadata(
    siteId: number,
    sessionId: string,
    userId: string,
    identifiedUserId: string,
    metadata: any,
    requestMeta?: RequestMetadata
  ): Promise<void> {
    // Get existing session info from events table
    const sessionInfo = await clickhouse.query({
      query: `
        SELECT 
          MIN(timestamp) as start_time,
          MAX(timestamp) as end_time,
          COUNT() as event_count,
          SUM(event_size_bytes) as compressed_size_bytes,
          MAX(viewport_width) as screen_width,
          MAX(viewport_height) as screen_height
        FROM session_replay_events
        WHERE site_id = {siteId:UInt16} 
          AND session_id = {sessionId:String}
      `,
      query_params: { siteId, sessionId },
      format: "JSONEachRow",
    });

    type SessionInfoResult = {
      start_time: string;
      end_time: string | null;
      event_count: number;
      compressed_size_bytes: number;
      screen_width: number | null;
      screen_height: number | null;
    };

    const sessionResults = await processResults<SessionInfoResult>(sessionInfo);

    if (!sessionResults || sessionResults.length === 0) return;

    const sessionReplayData = sessionResults[0];

    // Parse tracking data from request metadata
    let trackingData: any = {};
    if (requestMeta?.userAgent) {
      try {
        // Extract hostname from the page URL
        const urlObj = new URL(metadata.pageUrl);
        const hostname = urlObj.hostname;

        trackingData = await parseTrackingData(
          requestMeta.userAgent,
          requestMeta.ipAddress,
          requestMeta.referrer || "",
          urlObj.search || "", // querystring from URL
          hostname,
          metadata.language || "", // language from client
          sessionReplayData.screen_width || metadata.viewportWidth || 0,
          sessionReplayData.screen_height || metadata.viewportHeight || 0
        );
      } catch (error) {
        console.error("Error parsing tracking data for session replay:", error);
      }
    }

    // Calculate duration
    const startTime = new Date(sessionReplayData.start_time);
    const endTime = sessionReplayData.end_time ? new Date(sessionReplayData.end_time) : null;
    const durationMs = endTime ? endTime.getTime() - startTime.getTime() : null;

    // Insert or update metadata
    await clickhouse.insert({
      table: "session_replay_metadata",
      values: [
        {
          site_id: siteId,
          session_id: sessionId,
          user_id: userId,
          identified_user_id: identifiedUserId,
          start_time: DateTime.fromJSDate(startTime).toFormat("yyyy-MM-dd HH:mm:ss"),
          end_time: endTime ? DateTime.fromJSDate(endTime).toFormat("yyyy-MM-dd HH:mm:ss") : null,
          duration_ms: durationMs,
          event_count: sessionReplayData.event_count || 0,
          compressed_size_bytes: sessionReplayData.compressed_size_bytes || 0,
          page_url: metadata.pageUrl || "",
          country: trackingData.country || "",
          region: trackingData.region || "",
          city: trackingData.city || "",
          lat: trackingData.lat || 0,
          lon: trackingData.lon || 0,
          browser: trackingData.browser || "",
          browser_version: trackingData.browserVersion || "",
          operating_system: trackingData.operatingSystem || "",
          operating_system_version: trackingData.operatingSystemVersion || "",
          language: trackingData.language || "",
          screen_width: sessionReplayData.screen_width || metadata?.viewportWidth || 0,
          screen_height: sessionReplayData.screen_height || metadata?.viewportHeight || 0,
          device_type: trackingData.deviceType || "",
          channel: trackingData.channel || "",
          hostname: trackingData.hostname || "",
          referrer: trackingData.referrer || "",
          has_replay_data: 1,
        },
      ],
      format: "JSONEachRow",
    });
  }
}
