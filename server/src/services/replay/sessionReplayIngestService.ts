import { DateTime } from "luxon";
import type { AsnLookup } from "../../db/geolocation/asn.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { correctReplayClockSkew } from "./replayClockSkew.js";
import { replayPayloadStorage } from "./replayPayloadStorage.js";
import { parseTrackingData } from "./trackingUtils.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { userIdService } from "../userId/userIdService.js";

const logger = createServiceLogger("session-replay-ingest");

/** What a single batch observed about its session — no history involved. */
type BatchStats = {
  startTime: Date;
  endTime: Date;
  eventCount: number;
  compressedSizeBytes: number;
  screenWidth: number;
  screenHeight: number;
};

export interface RequestMetadata {
  ipAddress: string;
  lookupAsn: AsnLookup;
  origin: string;
  receivedAt: Date;
  referrer: string;
  saltUserIds: boolean;
  userAgent: string;
}

/**
 * Service responsible for ingesting session replay data
 * Handles recording events and updating metadata
 */
export class SessionReplayIngestService {
  async recordEvents(siteId: number, request: RecordSessionReplayRequest, requestMeta: RequestMetadata): Promise<void> {
    const { userId: clientUserId, events: rawEvents, metadata } = request;

    // Device clocks, not ours. Correct the whole batch onto server time before
    // anything downstream partitions or TTLs on these values.
    const { events, skewMs } = correctReplayClockSkew(rawEvents, requestMeta.receivedAt.getTime());
    if (skewMs !== 0) {
      logger.warn({ siteId, skewMs, eventCount: events.length }, "Corrected replay clock skew");
    }

    // Always generate device fingerprint (anonymous user ID) server-side
    const deviceFingerprint = await userIdService.generateUserId(requestMeta.ipAddress, requestMeta.userAgent, siteId, {
      lookupAsn: requestMeta.lookupAsn,
      receivedAt: requestMeta.receivedAt,
      saltUserIds: requestMeta.saltUserIds,
    });

    // Check if client provided an identified user ID (different from device fingerprint)
    const trimmedClientUserId = clientUserId?.trim() || "";
    const identifiedUserId =
      trimmedClientUserId && trimmedClientUserId !== deviceFingerprint ? trimmedClientUserId : "";

    // Keep the device fingerprint as the stored user_id. The identified ID only
    // scopes session assignment so stored user identity semantics stay unchanged.
    const userId = deviceFingerprint;

    // Get or create a session ID from the sessions service
    const { sessionId } = await sessionsService.updateSession({
      userId,
      identifiedUserId,
      siteId,
    });

    const storedEvents = await replayPayloadStorage.storeEvents({
      events,
      identifiedUserId,
      sessionId,
      siteId,
      userId,
      viewportHeight: metadata?.viewportHeight,
      viewportWidth: metadata?.viewportWidth,
    });

    // Update or insert metadata
    if (metadata) {
      // An events-free batch still carries metadata worth recording, but it has
      // no timestamps to bound it — anchor those on server time rather than
      // letting Math.min of nothing produce an epoch-dated row.
      const timestamps = events.length > 0 ? events.map(event => event.timestamp) : [requestMeta.receivedAt.getTime()];
      const batchStats: BatchStats = {
        startTime: new Date(Math.min(...timestamps)),
        endTime: new Date(Math.max(...timestamps)),
        eventCount: storedEvents.eventCount,
        compressedSizeBytes: storedEvents.payloadSizeBytes,
        screenWidth: metadata.viewportWidth || 0,
        screenHeight: metadata.viewportHeight || 0,
      };

      await this.updateSessionMetadata(siteId, sessionId, userId, identifiedUserId, metadata, batchStats, requestMeta);
    }
  }

  private async updateSessionMetadata(
    siteId: number,
    sessionId: string,
    userId: string,
    identifiedUserId: string,
    metadata: any,
    batchStats: BatchStats,
    requestMeta: RequestMetadata
  ): Promise<void> {
    // Append-only. This used to read the session back first — MIN/MAX/COUNT/SUM
    // across every row the session had ever written, on every batch — purely to
    // recompute a cumulative row. The aggregating table does that combining at
    // merge time, so a batch now writes only what it saw.
    let trackingData: any = {};
    if (requestMeta.userAgent) {
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
          batchStats.screenWidth || metadata.viewportWidth || 0,
          batchStats.screenHeight || metadata.viewportHeight || 0
        );
      } catch (error) {
        logger.error({ siteId, sessionId, err: error }, "Error parsing tracking data for session replay");
      }
    }

    await clickhouse.insert({
      table: "session_replay_metadata_v2",
      values: [
        {
          site_id: siteId,
          session_id: sessionId,
          user_id: userId,
          identified_user_id: identifiedUserId,
          start_time: DateTime.fromJSDate(batchStats.startTime).toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
          end_time: DateTime.fromJSDate(batchStats.endTime).toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
          event_count: batchStats.eventCount,
          compressed_size_bytes: batchStats.compressedSizeBytes,
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
          screen_width: batchStats.screenWidth || metadata?.viewportWidth || 0,
          screen_height: batchStats.screenHeight || metadata?.viewportHeight || 0,
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
