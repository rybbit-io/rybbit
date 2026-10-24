import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { toClickHouseDateTime } from "../../db/clickhouse/dateTime.js";
import type { AsnLookup } from "../../db/geolocation/asn.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { correctReplayClockSkew } from "./replayClockSkew.js";
import { parseTrackingData } from "./trackingUtils.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { userIdService } from "../userId/userIdService.js";
import { r2Storage } from "../storage/r2StorageService.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { chargeReplaySessionBudget } from "./replaySessionBudget.js";

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

export type RecordEventsResult = {
  /** The session is over its replay size cap; nothing from this batch was stored. */
  capped: boolean;
  /**
   * The recorder should take a full snapshot: the replay is waiting to follow
   * the visitor's new session, or has none where it is.
   */
  needsFullSnapshot?: boolean;
};

// rrweb's EventType.FullSnapshot: the page's DOM, which playback starts from.
const FULL_SNAPSHOT_EVENT_TYPE = 2;

export interface RequestMetadata {
  userAgent: string;
  ipAddress: string;
  origin: string;
  referrer: string;
  /**
   * Persistent client id sent with the batch. Like `anonymous_id` on `/track`,
   * it replaces the IP + user agent fingerprint, so replay and events agree on
   * the visitor and therefore on the session.
   */
  anonymousId?: string;
  /** The Site's salting setting, from the configuration the handler loaded. */
  saltUserIds?: boolean;
  /** When the batch arrived: picks a salted fingerprint's day, as on `/track`. */
  receivedAt?: Date;
  lookupAsn?: AsnLookup;
}

/**
 * Earliest and latest timestamp in a non-empty batch. A loop rather than
 * Math.min(...spread): spreading a large batch can exceed the engine's argument
 * limit and throw. Timestamps are finite here (correctReplayClockSkew sanitizes
 * them), so plain comparisons match Math.min/Math.max.
 */
function timestampRange(events: { timestamp: number }[]): { startMs: number; endMs: number } {
  let startMs = events[0].timestamp;
  let endMs = startMs;
  for (const { timestamp } of events) {
    if (timestamp < startMs) startMs = timestamp;
    if (timestamp > endMs) endMs = timestamp;
  }
  return { startMs, endMs };
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
  ): Promise<RecordEventsResult> {
    const { userId: clientUserId, events: rawEvents, metadata } = request;

    // Device clocks, not ours. Correct the whole batch onto server time before
    // anything downstream partitions or TTLs on these values.
    const { events, skewMs } = correctReplayClockSkew(rawEvents, Date.now());
    if (skewMs !== 0) {
      logger.warn({ siteId, skewMs, eventCount: events.length }, "Corrected replay clock skew");
    }

    // The anonymous user ID, derived exactly as event ingestion derives it
    // (createBasePayload): from the persistent client id when one is sent,
    // otherwise from the IP + user agent fingerprint.
    const identityOptions = { saltUserIds: requestMeta?.saltUserIds, receivedAt: requestMeta?.receivedAt };
    const deviceFingerprint = requestMeta?.anonymousId
      ? await userIdService.generateUserIdFromClientId(requestMeta.anonymousId, siteId, identityOptions)
      : await userIdService.generateUserId(requestMeta?.ipAddress || "", requestMeta?.userAgent || "", siteId, {
          ...identityOptions,
          lookupAsn: requestMeta?.lookupAsn,
        });

    // Check if client provided an identified user ID (different from device fingerprint)
    const trimmedClientUserId = clientUserId?.trim() || "";
    const identifiedUserId =
      trimmedClientUserId && trimmedClientUserId !== deviceFingerprint ? trimmedClientUserId : "";

    // Keep the device fingerprint as the stored user_id. The identified ID only
    // scopes session assignment so stored user identity semantics stay unchanged.
    const userId = deviceFingerprint;

    // Join the visitor's analytics session without renewing it: an open tab
    // sends batches on DOM churn alone, and that used to keep the session alive
    // indefinitely. A replay moves to a new session only on a full snapshot,
    // which every replay needs to be played or listed.
    const { sessionId, needsFullSnapshot } = await sessionsService.resolveReplaySession({
      userId,
      identifiedUserId,
      siteId,
      hasFullSnapshot: events.some(event => Number(event.type) === FULL_SNAPSHOT_EVENT_TYPE),
    });

    // Serialize once: the sizes gate the batch before anything is written, and
    // the same strings are what ClickHouse stores.
    const serializedEvents = events.map(event => JSON.stringify(event.data));
    const batchBytes = serializedEvents.reduce((total, data) => total + data.length, 0);

    // Checked before the R2 upload and both inserts, so a runaway session costs
    // one Redis call per batch once it's capped.
    const budget = await chargeReplaySessionBudget(siteId, sessionId, batchBytes);
    if (!budget.accepted) {
      return { capped: true };
    }

    // Check if R2 storage is enabled for cloud deployments
    let r2BatchKey: string | null = null;

    if (r2Storage.isEnabled()) {
      try {
        // Store event data batch in R2, reusing the strings serialized above
        r2BatchKey = await r2Storage.storeBatch(siteId, sessionId, serializedEvents);
      } catch (error) {
        console.error("Failed to store in R2, falling back to ClickHouse:", error);
        r2BatchKey = null;
      }
    }

    // Prepare events for batch insert
    const eventsToInsert = events.map((event, index) => {
      const serializedData = serializedEvents[index];

      if (r2BatchKey) {
        // R2 storage: store metadata only in ClickHouse
        return {
          site_id: siteId,
          session_id: sessionId,
          user_id: userId,
          identified_user_id: identifiedUserId,
          timestamp: toClickHouseDateTime(event.timestamp),
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
          timestamp: toClickHouseDateTime(event.timestamp),
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
      const nowMs = Date.now();
      const { startMs, endMs } = events.length > 0 ? timestampRange(events) : { startMs: nowMs, endMs: nowMs };
      const batchStats: BatchStats = {
        startTime: new Date(startMs),
        endTime: new Date(endMs),
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
        batchStats,
        requestMeta
      );
    }

    return { capped: false, needsFullSnapshot };
  }

  private async updateSessionMetadata(
    siteId: number,
    sessionId: string,
    userId: string,
    identifiedUserId: string,
    metadata: any,
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
          start_time: toClickHouseDateTime(batchStats.startTime),
          end_time: toClickHouseDateTime(batchStats.endTime),
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
