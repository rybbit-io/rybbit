import { DateTime } from "luxon";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getLocation } from "../../../db/geolocation/geolocation.js";
import { getDeviceType } from "../../../utils.js";
import { ReliableBatchContext, ReliableBatchQueue } from "../reliableBatchQueue.js";
import { clearSelfReferrer, type TotalTrackingPayload } from "../utils.js";
import type { BotEventProperties } from "./index.js";

type BotEventPayload = TotalTrackingPayload &
  BotEventProperties & {
    sessionId: string;
  };

const BOT_EVENT_BATCH_SIZE = 5000;
const BOT_EVENT_FLUSH_INTERVAL_MS = 250;

async function processBotEventBatch(batch: BotEventPayload[], context: ReliableBatchContext): Promise<void> {
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
    };
  });

  await clickhouse.insert({
    table: "bot_events",
    values: processedBotEvents,
    format: "JSONEachRow",
    clickhouse_settings: {
      insert_deduplication_token: context.batchId,
    },
  });
}

export const botEventQueue = new ReliableBatchQueue<BotEventPayload>({
  name: "bot-event-queue",
  batchSize: BOT_EVENT_BATCH_SIZE,
  flushIntervalMs: BOT_EVENT_FLUSH_INTERVAL_MS,
  processBatch: processBotEventBatch,
});
