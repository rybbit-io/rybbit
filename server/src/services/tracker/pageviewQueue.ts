import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { lookupAsn } from "../../db/geolocation/asn.js";
import { getLocation } from "../../db/geolocation/geolocation.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { getDeviceType, parseSDKUserAgent } from "../../utils.js";
import { isDatacenterAsn } from "./botBlocking/datacenterAsns.js";
import { getChannel } from "./getChannel.js";
import { clearSelfReferrer, getAllUrlParams, TotalTrackingPayload } from "./utils.js";

type TotalPayload = TotalTrackingPayload & {
  sessionId: string;
};

const PAGEVIEW_BATCH_SIZE = 5000;
const PAGEVIEW_FLUSH_INTERVAL_MS = 1000;

const getParsedProperties = (properties: string | undefined) => {
  try {
    return properties ? JSON.parse(properties) : undefined;
  } catch (error) {
    return undefined;
  }
};

class PageviewQueue {
  private queue: TotalPayload[] = [];
  private batchSize = PAGEVIEW_BATCH_SIZE;
  private interval = PAGEVIEW_FLUSH_INTERVAL_MS;
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
    const processedPageviews = batch.filter(pv => {
      if (pv.site_id == 9133 && pv.screenWidth == 800 && pv.screenHeight == 600) {
        return false;
      }
      return true;
    }).map(pv => {
      const dataForIp = geoData?.[pv.ipAddress];

      const countryCode = dataForIp?.countryIso || "";
      const regionCode = dataForIp?.region || "";
      const latitude = dataForIp?.latitude || 0;
      const longitude = dataForIp?.longitude || 0;
      const city = dataForIp?.city || "";
      const timezone = dataForIp?.timeZone || "";
      const sdkUA = parseSDKUserAgent(pv.ua.ua || "");

      // Same MaxMind lookup already used to decide identity bucketing
      // (bucketIpForIdentity) and bot-detection eligibility; stored here purely
      // for debugging identity-splitting reports, treated like geo data
      // (independent of storeIp) since it identifies a network, not a device.
      const asnInfo = lookupAsn(pv.ipAddress);

      // Check if referrer is from the same domain and clear it if so
      let referrer = clearSelfReferrer(pv.referrer || "", pv.hostname || "");

      // Get all URL parameters for the url_parameters map
      const allUrlParams = getAllUrlParams(pv.querystring || "");


      return {
        site_id: pv.site_id,
        timestamp: DateTime.fromISO(pv.timestamp).toFormat("yyyy-MM-dd HH:mm:ss"),
        session_id: pv.sessionId,
        user_id: pv.userId, // Always the device fingerprint
        identified_user_id: pv.identifiedUserId || "", // Custom user ID when identified
        hostname: pv.hostname || "",
        pathname: pv.pathname || "",
        querystring: pv.querystring || "",
        page_title: pv.page_title || "",
        referrer: referrer,
        channel: getChannel(referrer, pv.querystring, pv.hostname),
        browser: sdkUA ? sdkUA.browser : (pv.ua.browser.name || ""),
        browser_version: sdkUA ? sdkUA.browserVersion : (pv.ua.browser.major || ""),
        operating_system: sdkUA ? sdkUA.os : (pv.ua.os.name || ""),
        operating_system_version: sdkUA ? sdkUA.osVersion : (pv.ua.os.version || ""),
        language: pv.language || "",
        screen_width: pv.screenWidth || 0,
        screen_height: pv.screenHeight || 0,
        device_type: getDeviceType(
          pv.screenWidth,
          pv.screenHeight,
          sdkUA ? { ...pv.ua, os: { ...pv.ua.os, name: sdkUA.os } } : pv.ua
        ),
        country: countryCode,
        region: countryCode && regionCode ? countryCode + "-" + regionCode : "",
        city: city || "",
        lat: latitude || 0,
        lon: longitude || 0,
        type: pv.type || "pageview",
        event_name: pv.event_name || "",
        props: getParsedProperties(pv.properties),
        url_parameters: allUrlParams,
        // Performance metrics (only included for performance events).
        // ?? not ||: 0 is a legitimate measurement (a perfect CLS score is 0)
        // and must not be coerced to NULL, which would skew percentiles.
        lcp: pv.lcp ?? null,
        cls: pv.cls ?? null,
        inp: pv.inp ?? null,
        fcp: pv.fcp ?? null,
        ttfb: pv.ttfb ?? null,
        ip: pv.storeIp ? pv.ipAddress : null,
        timezone: timezone,
        tag: pv.tag || "",
        feature_flags: pv.feature_flags || {},
        import_id: null,
        // MaxMind is the primary ASN source; the IP-intel provider only fills
        // the gaps it leaves, so both deployments agree on asn/asn_org.
        asn: asnInfo?.asn ?? dataForIp?.asn?.asn ?? null,
        asn_org: asnInfo?.organization || dataForIp?.asn?.org || "",
        is_datacenter_asn: asnInfo && isDatacenterAsn(asnInfo.asn) ? 1 : 0,
        // Fields below have no MaxMind equivalent — cloud-only IP intel.
        company: dataForIp?.company?.name || "",
        company_domain: dataForIp?.company?.domain || "",
        company_type: dataForIp?.company?.type || "",
        company_abuse_score: dataForIp?.company?.abuseScore ?? null,
        asn_domain: dataForIp?.asn?.domain || "",
        asn_type: dataForIp?.asn?.type || "",
        asn_abuse_score: dataForIp?.asn?.abuseScore ?? null,
        vpn: dataForIp?.vpn || "",
        crawler: dataForIp?.crawler || "",
        datacenter: dataForIp?.datacenter || "",
        is_proxy: dataForIp?.isProxy ?? null,
        is_tor: dataForIp?.isTor ?? null,
        is_satellite: dataForIp?.isSatellite ?? null,
        app_version: pv.app_version || "",
        device_model: pv.device_model || sdkUA?.deviceModel || "",
      };
    });

    // this.logger.info({ count: processedPageviews.length }, "Bulk insert to ClickHouse");
    // Bulk insert into database
    try {
      await clickhouse.insert({
        table: "events",
        values: processedPageviews,
        format: "JSONEachRow",
      });
    } catch (error) {
      this.logger.error({ err: error }, "Error processing pageview queue");
    } finally {
      this.processing = false;
    }
  }
}

// Create singleton instance
export const pageviewQueue = new PageviewQueue();
