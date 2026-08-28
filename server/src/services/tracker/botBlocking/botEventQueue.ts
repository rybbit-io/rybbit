import { DateTime } from "luxon";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getLocation } from "../../../db/geolocation/geolocation.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import { getDeviceType } from "../../../utils.js";
import { clearSelfReferrer, type TotalTrackingPayload } from "../utils.js";
import type { BotEventProperties } from "./index.js";

type BotEventPayload = TotalTrackingPayload &
  BotEventProperties & {
    sessionId: string;
  };

const BOT_EVENT_BATCH_SIZE = 5000;
const BOT_EVENT_FLUSH_INTERVAL_MS = 1000;

class BotEventQueue {
  private queue: BotEventPayload[] = [];
  private batchSize = BOT_EVENT_BATCH_SIZE;
  private interval = BOT_EVENT_FLUSH_INTERVAL_MS;
  private processing = false;
  private table: string;
  private logger: ReturnType<typeof createServiceLogger>;

  constructor(table: string, loggerName: string) {
    this.table = table;
    this.logger = createServiceLogger(loggerName);
    setInterval(() => this.processQueue(), this.interval);
  }

  async add(botEvent: BotEventPayload) {
    this.queue.push(botEvent);
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const batch = this.queue.splice(0, this.batchSize);
    try {
      const ips = [...new Set(batch.map(event => event.ipAddress))];
      const geoData = await getLocation(ips);

      const processedBotEvents = batch.map(event => {
        const dataForIp = geoData?.[event.ipAddress];

        const countryCode = dataForIp?.countryIso || "";
        const regionCode = dataForIp?.region || "";
        const referrer = clearSelfReferrer(event.referrer || "", event.hostname || "");

        return {
          site_id: event.site_id,
          timestamp: DateTime.fromISO(event.timestamp).toFormat("yyyy-MM-dd HH:mm:ss"),
          session_id: event.sessionId,
          user_id: event.userId,
          hostname: event.hostname || "",
          pathname: event.pathname || "",
          querystring: event.querystring || "",
          referrer,
          browser: event.ua.browser.name || "",
          browser_version: event.ua.browser.major || "",
          operating_system: event.ua.os.name || "",
          operating_system_version: event.ua.os.version || "",
          country: countryCode,
          region: countryCode && regionCode ? countryCode + "-" + regionCode : "",
          city: dataForIp?.city || "",
          lat: dataForIp?.latitude || 0,
          lon: dataForIp?.longitude || 0,
          screen_width: event.screenWidth || 0,
          screen_height: event.screenHeight || 0,
          device_type: getDeviceType(event.screenWidth, event.screenHeight, event.ua),
          type: event.type || "pageview",
          asn: event.botAsn ?? null,
          asn_org: event.botAsnOrg || "",
          detected_ua_pattern: event.detectedUaPattern || false,
          detected_header_heuristics: event.detectedHeaderHeuristics || false,
          detected_client_signals: event.detectedClientSignals || false,
          detected_bot_asn: event.detectedBotAsn || false,
          detected_rate_anomaly: event.detectedRateAnomaly || false,
          matched_ua_pattern: event.matchedUaPattern || "",
          bot_category: event.botCategory || "",
          client_bot_score: event.clientBotScore ?? null,
          client_signal_mask: event.clientSignalMask ?? 0,
          anomaly_reasons: event.anomalyReasons || "",
          anomaly_score: event.anomalyScore ?? 0,
        };
      });

      await clickhouse.insert({
        table: this.table,
        values: processedBotEvents,
        format: "JSONEachRow",
      });
    } catch (error) {
      this.logger.error({ err: error }, "Error processing bot event queue");
    } finally {
      this.processing = false;
    }
  }
}

export const botEventQueue = new BotEventQueue("bot_events", "bot-event-queue");

// Detections that were NOT enforced: on a site with bot blocking disabled the
// event is tracked as normal, so this row is the only evidence that detection
// fired. The bot_observations schema deliberately mirrors bot_events
// column-for-column so the same analysis queries work against either table.
export const botObservationQueue = new BotEventQueue("bot_observations", "bot-observation-queue");
