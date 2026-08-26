import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { correctReplayClockSkew } from "./replayClockSkew.js";
import { parseTrackingData } from "./trackingUtils.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { userIdService } from "../userId/userIdService.js";
import { r2Storage } from "../storage/r2StorageService.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { withReplayMetadataLock } from "./replayMetadataLock.js";

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
  userAgent: string;
  ipAddress: string;
  origin: string;
  referrer: string;
}

type ReplayBatchEvent = {
  timestamp: number;
  event_size_bytes: number;
  viewport_width: number | null;
  viewport_height: number | null;
};

export class SessionReplayMetadataUpdateError extends Error {
  constructor(siteId: number, sessionId: string) {
    super(`Failed to update replay metadata for site ${siteId}, session ${sessionId}`);
    this.name = "SessionReplayMetadataUpdateError";
  }
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
    const { userId: clientUserId, events: rawEvents, metadata } = request;

    // Device clocks, not ours. Correct the whole batch onto server time before
    // anything downstream partitions or TTLs on these values.
    const { events, skewMs } = correctReplayClockSkew(rawEvents, Date.now());
    if (skewMs !== 0) {
      logger.warn({ siteId, skewMs, eventCount: events.length }, "Corrected replay clock skew");
    }

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

    // Keep the device fingerprint as the stored user_id. The identified ID only
    // scopes session assignment so stored user identity semantics stay unchanged.
    const userId = deviceFingerprint;

    // Get or create a session ID from the sessions service
    const { sessionId } = await sessionsService.updateSession({
      userId,
      identifiedUserId,
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
      // An events-free batch still carries metadata worth recording, but it has
      // no timestamps to bound it — anchor those on server time rather than
      // letting Math.min of nothing produce an epoch-dated row.
      const timestamps = events.length > 0 ? events.map(event => event.timestamp) : [Date.now()];
      const batchStats: BatchStats = {
        startTime: new Date(Math.min(...timestamps)),
        endTime: new Date(Math.max(...timestamps)),
        eventCount: eventsToInsert.length,
        compressedSizeBytes: eventsToInsert.reduce((total, event) => total + event.event_size_bytes, 0),
        screenWidth: metadata.viewportWidth || 0,
        screenHeight: metadata.viewportHeight || 0,
      };

      await this.updateSessionMetadata(
        siteId,
        sessionId,
        userId,
        identifiedUserId,
        metadata,
        eventsToInsert,
        batchStats,
        requestMeta
      );
    }
  }

  private async updateSessionMetadata(
    siteId: number,
    sessionId: string,
    userId: string,
    identifiedUserId: string,
    metadata: any,
    replayBatch: ReplayBatchEvent[],
    requestMeta?: RequestMetadata
  ): Promise<void> {
    try {
      await withReplayMetadataLock(siteId, sessionId, () =>
        this.updateSessionMetadataLocked(
          siteId,
          sessionId,
          userId,
          identifiedUserId,
          metadata,
          replayBatch,
          requestMeta
        )
      );
    } catch (error) {
      console.error("Failed to update session replay metadata", { siteId, sessionId, error });
      throw new SessionReplayMetadataUpdateError(siteId, sessionId);
    }
  }

  private async updateSessionMetadataLocked(
    siteId: number,
    sessionId: string,
    userId: string,
    identifiedUserId: string,
    metadata: any,
    replayBatch: ReplayBatchEvent[],
    requestMeta?: RequestMetadata
  ): Promise<void> {
    // Read the latest rollup instead of rescanning every raw replay event after
    // each batch. The previous query made replay ingestion O(n^2) over a long
    // session and allowed overlapping batches to saturate ClickHouse.
    const existingMetadata = await clickhouse.query({
      query: `
        SELECT
          start_time,
          end_time,
          event_count,
          compressed_size_bytes,
          screen_width,
          screen_height,
          created_at
        FROM session_replay_metadata FINAL
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
        LIMIT 1
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
      created_at: string;
    };

    const existingResults = await processResults<SessionInfoResult>(existingMetadata);
    const existing = existingResults[0];

    // ReplacingMergeTree uses created_at as its version. The column has
    // one-second precision, so advance beyond the prior row when necessary;
    // otherwise two batches in the same second can tie and retain either row.
    const nowVersion = DateTime.utc().startOf("second");
    const existingVersion = existing?.created_at ? DateTime.fromSQL(existing.created_at, { zone: "utc" }) : null;
    const metadataVersion =
      existingVersion?.isValid && existingVersion.toMillis() >= nowVersion.toMillis()
        ? existingVersion.plus({ seconds: 1 })
        : nowVersion;

    const batchTimestamps = replayBatch.map(event => event.timestamp).filter(Number.isFinite);
    if (!existing && batchTimestamps.length === 0) return;

    const batchStartTime = batchTimestamps.length > 0 ? new Date(Math.min(...batchTimestamps)) : null;
    const batchEndTime = batchTimestamps.length > 0 ? new Date(Math.max(...batchTimestamps)) : null;
    const existingStartTime = existing?.start_time ? new Date(existing.start_time) : null;
    const existingEndTime = existing?.end_time ? new Date(existing.end_time) : null;

    const startTime =
      existingStartTime && batchStartTime
        ? new Date(Math.min(existingStartTime.getTime(), batchStartTime.getTime()))
        : existingStartTime || batchStartTime;
    const endTime =
      existingEndTime && batchEndTime
        ? new Date(Math.max(existingEndTime.getTime(), batchEndTime.getTime()))
        : existingEndTime || batchEndTime;

    if (!startTime) return;

    const eventCount = Number(existing?.event_count || 0) + replayBatch.length;
    const compressedSizeBytes =
      Number(existing?.compressed_size_bytes || 0) +
      replayBatch.reduce((sum, event) => sum + event.event_size_bytes, 0);
    const screenWidth = Math.max(
      Number(existing?.screen_width || 0),
      Number(metadata.viewportWidth || 0),
      ...replayBatch.map(event => Number(event.viewport_width || 0))
    );
    const screenHeight = Math.max(
      Number(existing?.screen_height || 0),
      Number(metadata.viewportHeight || 0),
      ...replayBatch.map(event => Number(event.viewport_height || 0))
    );

    // Parse tracking data from request metadata
    batchStats: BatchStats,
    requestMeta?: RequestMetadata
  ): Promise<void> {
    // Append-only. This used to read the session back first — MIN/MAX/COUNT/SUM
    // across every row the session had ever written, on every batch — purely to
    // recompute a cumulative row. The aggregating table does that combining at
    // merge time, so a batch now writes only what it saw.
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
          created_at: metadataVersion.toFormat("yyyy-MM-dd HH:mm:ss"),
        },
      ],
      format: "JSONEachRow",
    });
  }
}
