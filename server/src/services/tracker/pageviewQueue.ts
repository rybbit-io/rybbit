import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getLocation } from "../../db/geolocation/geolocation.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { getDeviceType } from "../../utils.js";
import { getChannel } from "./getChannel.js";
import { clearSelfReferrer, getAllUrlParams, TotalTrackingPayload } from "./utils.js";

type TotalPayload = TotalTrackingPayload & {
  sessionId: string;
};

const getParsedProperties = (properties: string | undefined) => {
  try {
    return properties ? JSON.parse(properties) : undefined;
  } catch (error) {
    return undefined;
  }
};

class PageviewQueue {
  private queue: TotalPayload[] = [];
  private batchSize = 5000;
  private interval = 10000;
  private processing = false;
  private logger = createServiceLogger("pageview-queue");

  constructor() {
    // Start processing interval
    setInterval(() => this.processQueue(), this.interval);
  }

  async add(pageview: TotalPayload) {
    this.queue.push(pageview);
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    // Get batch of pageviews
    const batch = this.queue.splice(0, this.batchSize);
    const ips = [...new Set(batch.map(pv => pv.ipAddress))];

    const geoData = await getLocation(ips);

    // Process each pageview with its geo data
    const processedPageviews = batch.map(pv => {
      const dataForIp = geoData?.[pv.ipAddress];

      const countryCode = dataForIp?.countryIso || "";
      const regionCode = dataForIp?.region || "";
      const latitude = dataForIp?.latitude || 0;
      const longitude = dataForIp?.longitude || 0;
      const city = dataForIp?.city || "";
      const timezone = dataForIp?.timeZone || "";

      // Check if referrer is from the same domain and clear it if so
      let referrer = clearSelfReferrer(pv.referrer || "", pv.hostname || "");

      // Get all URL parameters for the url_parameters map
      const allUrlParams = getAllUrlParams(pv.querystring || "");

      return {
        site_id: pv.site_id,
        timestamp: DateTime.fromISO(pv.timestamp).toFormat("yyyy-MM-dd HH:mm:ss"),
        session_id: pv.sessionId,
        user_id: pv.userId, // Always the device fingerprint
        anonymous_id: pv.anonymousId,
        identified_user_id: pv.identifiedUserId || "", // Custom user ID when identified
        hostname: pv.hostname || "",
        pathname: pv.pathname || "",
        querystring: pv.querystring || "",
        page_title: pv.page_title || "",
        referrer: referrer,
        channel: getChannel(referrer, pv.querystring, pv.hostname),
        browser: pv.ua.browser.name || "",
        browser_version: pv.ua.browser.major || "",
        operating_system: pv.ua.os.name || "",
        operating_system_version: pv.ua.os.version || "",
        language: pv.language || "",
        screen_width: pv.screenWidth || 0,
        screen_height: pv.screenHeight || 0,
        device_type: getDeviceType(pv.screenWidth, pv.screenHeight, pv.ua),
        country: countryCode,
        region: countryCode && regionCode ? countryCode + "-" + regionCode : "",
        city: city || "",
        lat: latitude || 0,
        lon: longitude || 0,
        type: pv.type || "pageview",
        event_name: pv.event_name || "",
        props: getParsedProperties(pv.properties),
        url_parameters: allUrlParams,
        // Performance metrics (only included for performance events)
        lcp: pv.lcp || null,
        cls: pv.cls || null,
        inp: pv.inp || null,
        fcp: pv.fcp || null,
        ttfb: pv.ttfb || null,
        ip: pv.storeIp ? pv.ipAddress : null,
        timezone: timezone,
        import_id: null,
        company: dataForIp?.company?.name || "",
        company_domain: dataForIp?.company?.domain || "",
        company_type: dataForIp?.company?.type || "",
        company_abuse_score: dataForIp?.company?.abuseScore ?? null,
        asn: dataForIp?.asn?.asn || null,
        asn_org: dataForIp?.asn?.org || "",
        asn_domain: dataForIp?.asn?.domain || "",
        asn_type: dataForIp?.asn?.type || "",
        asn_abuse_score: dataForIp?.asn?.abuseScore ?? null,
        vpn: dataForIp?.vpn || "",
        crawler: dataForIp?.crawler || "",
        datacenter: dataForIp?.datacenter || "",
        is_proxy: dataForIp?.isProxy ?? null,
        is_tor: dataForIp?.isTor ?? null,
        is_satellite: dataForIp?.isSatellite ?? null,
      };
    });

    this.logger.info({ count: processedPageviews.length }, "Bulk insert to ClickHouse");
    // Bulk insert into database
    try {
      await clickhouse.insert({
        table: "events",
        values: processedPageviews,
        format: "JSONEachRow",
      });
    } catch (error) {
      this.logger.error(error, "Error processing pageview queue");
    } finally {
      this.processing = false;
    }
  }
}

// Create singleton instance
export const pageviewQueue = new PageviewQueue();
